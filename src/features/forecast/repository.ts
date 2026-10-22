import { and, asc, gte, lt } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { categories, transactions } from '../../db/schema';
import { isISODate, localDateKey } from '../../lib/dates';
import { createBudgetRepository } from '../budgets/repository';
import { occurrenceOn } from '../recurring/schedule';
import { createRecurringRepository } from '../recurring/repository';
import { createPeriodRepository } from '../payday/period';
import { horizonEnd } from './calculations';
import { attachSplits } from '../entry-tools/repository';

export class ForecastPendingError extends Error {}

export function createForecastRepository(db: AppDatabase) {
  return {
    read(today = localDateKey()) {
      if (!isISODate(today)) throw new Error('Date invalide.');
      const periods = createPeriodRepository(db), month = periods.monthForDate(today), period = periods.forMonth(month);
      const end = [period.end, horizonEnd(today, 30)].sort().at(-1)!;
      const recurring = createRecurringRepository(db);
      // FinanceRuntime owns catch-up writes. Never show a stale optimistic margin.
      if (recurring.all().filter((rule) => rule.active).some((rule) => {
        const next = occurrenceOn(rule.startOn, rule.frequency, rule.nextIndex);
        return next !== null && next <= today;
      })) throw new ForecastPendingError('Les échéances échues doivent être actualisées. Réessayez dans un instant.');
      const recorded = db.select().from(transactions)
        .where(and(gte(transactions.occurredOn, period.start), lt(transactions.occurredOn, end))).all();
      const planned = recurring.plannedInPeriod({ start: period.start, end }, today);
      return { today, month, period,
        entries: attachSplits(db, [...recorded, ...planned]).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id)),
        budgets: createBudgetRepository(db).forMonth(month),
        categories: db.select().from(categories).orderBy(asc(categories.position)).all() };
    },
  };
}
