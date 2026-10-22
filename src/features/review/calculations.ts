import type { Transaction } from '../transactions/types';
import { monthBounds, shiftMonth } from '../../lib/dates';
import { expenseByCategory, monthlySummary } from '../../lib/finance';

export function monthlyReview(entries: Transaction[], month: string, periodForMonth = monthBounds) {
  const previousMonth = shiftMonth(month, -1);
  const recorded = entries.filter((e) => !e.isPlanned);
  const filter = (m: string) => { const b = periodForMonth(m); return recorded.filter((e) => e.occurredOn >= b.start && e.occurredOn < b.end); };
  const current = filter(month), previous = filter(previousMonth);
  const currentSummary = monthlySummary(current, month, periodForMonth(month)), previousSummary = monthlySummary(previous, previousMonth, periodForMonth(previousMonth));
  const a = new Map(expenseByCategory(current).map((c) => [c.categoryId, c.amountCents]));
  const b = new Map(expenseByCategory(previous).map((c) => [c.categoryId, c.amountCents]));
  const contributions = [...new Set([...a.keys(), ...b.keys()])].map((categoryId) => ({ categoryId,
    currentCents: a.get(categoryId) ?? 0, previousCents: b.get(categoryId) ?? 0,
    deltaCents: (a.get(categoryId) ?? 0) - (b.get(categoryId) ?? 0),
  })).sort((x, y) => Math.abs(y.deltaCents) - Math.abs(x.deltaCents));
  return { previousMonth, current, currentSummary, previousSummary, contributions,
    deltaCents: currentSummary.expenseCents - previousSummary.expenseCents,
    percent: previousSummary.expenseCents ? Math.round((currentSummary.expenseCents - previousSummary.expenseCents) * 100 / previousSummary.expenseCents) : null };
}
