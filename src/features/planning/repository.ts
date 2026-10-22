import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import { payCycles } from '../../db/planningSchema';
import { transactions } from '../../db/schema';
import { isISODate, localDateKey, shiftMonth } from '../../lib/dates';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { paydayOn } from '../payday/schedule';
import { createRecurringRepository } from '../recurring/repository';
import { attachSplits } from '../entry-tools/repository';
import { monthlySummary } from '../../lib/finance';
import { occurrenceOn, occurrencesForMonth } from '../recurring/schedule';

export function cycleBounds(today: string, day: number) {
  if (!isISODate(today)) throw new Error('Date invalide.');
  const month = today.slice(0, 7);
  const anchor = paydayOn(month, day);
  const startMonth = today >= anchor ? month : shiftMonth(month, -1);
  return { startOn: paydayOn(startMonth, day), endOn: paydayOn(shiftMonth(startMonth, 1), day) };
}
export const cycleSchema = z.object({
  startOn: z.string().refine(isISODate), endOn: z.string().refine(isISODate),
  budgetCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS),
}).strict().refine((c) => c.endOn > c.startOn && (Date.parse(c.endOn) - Date.parse(c.startOn)) / 86400000 <= 62,
  'La période doit durer de 1 à 62 jours.');

export function createCycleRepository(db: AppDatabase) {
  return {
    all: () => db.select().from(payCycles).all().sort((a, b) => b.startOn.localeCompare(a.startOn)),
    save(input: z.input<typeof cycleSchema>, id?: string) {
      const value = cycleSchema.parse(input);
      db.transaction(() => {
        const all = this.all();
        if (id && !all.some((c) => c.id === id)) throw new Error('Période absente.');
        if (all.some((c) => c.id !== id && value.startOn < c.endOn && value.endOn > c.startOn)) throw new Error('Cette période chevauche un budget existant. Ajustez ses dates.');
        if (id) db.update(payCycles).set(value).where(eq(payCycles.id, id)).run();
        else db.insert(payCycles).values({ ...value, id: randomUUID() }).run();
      });
    },
    remove(id: string) { db.delete(payCycles).where(eq(payCycles.id, id)).run(); },
    summary(id: string, today = localDateKey()) {
      if (!isISODate(today)) throw new Error('Date invalide.');
      const cycle = this.all().find((c) => c.id === id);
      if (!cycle) throw new Error('Période absente.');
      const entries = attachSplits(db, db.select().from(transactions).all());
      const inPeriod = entries.filter((t) => t.occurredOn >= cycle.startOn && t.occurredOn < cycle.endOn);
      const rules = createRecurringRepository(db).all().filter((r) => r.active && r.categoryKind === 'expense');
      if (rules.some((r) => { const next = occurrenceOn(r.startOn, r.frequency, r.nextIndex); return next && next <= today; })) {
        throw new Error('Les échéances doivent être actualisées. Réessayez dans un instant.');
      }
      const identities = new Set(entries.map((e) => JSON.stringify([e.recurringExpenseId, e.recurringOccurrenceOn])));
      const planned: { label: string; occurredOn: string; amountCents: number }[] = [];
      for (let month = cycle.startOn.slice(0, 7); `${month}-01` < cycle.endOn; month = shiftMonth(month, 1)) {
        for (const rule of rules) for (const date of occurrencesForMonth(rule.startOn, rule.frequency, rule.nextIndex, month)) {
          if (date >= cycle.startOn && date < cycle.endOn && date > today && !identities.has(JSON.stringify([rule.id, date]))) {
            planned.push({ label: rule.label, occurredOn: date, amountCents: rule.amountCents });
          }
        }
      }
      const sum = (values: { amountCents: number }[]) => values.reduce((n, v) => { const total = n + v.amountCents; if (!Number.isSafeInteger(total)) throw new Error('Total hors limites.'); return total; }, 0);
      const totals = monthlySummary(inPeriod.filter((e) => e.kind === 'expense' || e.occurredOn <= today), cycle.startOn.slice(0, 7), { start: cycle.startOn, end: cycle.endOn });
      const { expenseCents, incomeCents } = totals;
      const plannedCents = sum(planned);
      return { cycle, entries: inPeriod, planned, expenseCents, incomeCents, plannedCents,
        marginCents: cycle.budgetCents - expenseCents - plannedCents };
    },
  };
}
