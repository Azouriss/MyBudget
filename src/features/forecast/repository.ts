import { and, asc, eq, gte, lt } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { categories, recurringExpenses, transactions } from '../../db/schema';
import { isISODate, localDateKey, monthBounds, shiftMonth } from '../../lib/dates';
import { createBudgetRepository } from '../budgets/repository';
import { occurrenceOn, occurrencesForMonth } from '../recurring/schedule';
import type { Transaction } from '../transactions/types';
import { horizonEnd } from './calculations';

export class ForecastPendingError extends Error {}

export function createForecastRepository(db: AppDatabase) {
  return {
    read(today = localDateKey()) {
      if (!isISODate(today)) throw new Error('Date invalide.');
      const month = today.slice(0, 7);
      const { start, end: monthEnd } = monthBounds(month);
      const end = [monthEnd, horizonEnd(today, 30)].sort().at(-1)!;
      const rules = db.select().from(recurringExpenses).where(eq(recurringExpenses.active, true)).all();
      // FinanceRuntime owns catch-up writes. Never show a stale optimistic margin.
      if (rules.some((rule) => {
        const next = occurrenceOn(rule.startOn, rule.frequency, rule.nextIndex);
        return next !== null && next <= today;
      })) throw new ForecastPendingError('Les échéances échues doivent être actualisées. Réessayez dans un instant.');
      const recorded: Transaction[] = db.select().from(transactions)
        .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end))).all();
      // Search by original occurrence date, even when its recorded date moved outside this range.
      const identities = db.select({ rule: transactions.recurringExpenseId, date: transactions.recurringOccurrenceOn })
        .from(transactions).where(and(gte(transactions.recurringOccurrenceOn, start), lt(transactions.recurringOccurrenceOn, end))).all();
      const existing = new Set(identities.map((entry) => JSON.stringify([entry.rule, entry.date])));
      const planned: Transaction[] = [];
      for (let cursor = month; `${cursor}-01` < end;) {
        for (const rule of rules) {
          for (const date of occurrencesForMonth(rule.startOn, rule.frequency, rule.nextIndex, cursor)) {
            if (date <= today || date >= end || existing.has(JSON.stringify([rule.id, date]))) continue;
            planned.push({ id: `planned:${rule.id}:${date}`, kind: 'expense', amountCents: rule.amountCents,
              label: rule.label, categoryId: rule.categoryId, subcategoryId: rule.subcategoryId,
              occurredOn: date, recurringExpenseId: rule.id, recurringOccurrenceOn: date,
              createdAt: rule.createdAt, updatedAt: rule.updatedAt, isPlanned: true });
          }
        }
        if (cursor === '2099-12') break;
        cursor = shiftMonth(cursor, 1);
      }
      return { today, entries: [...recorded, ...planned].sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id)),
        budgets: createBudgetRepository(db).forMonth(month),
        categories: db.select().from(categories).orderBy(asc(categories.position)).all() };
    },
  };
}
