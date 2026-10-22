import { z } from 'zod';
import { isISODate, monthBounds } from '../../lib/dates';
import { monthlySummary } from '../../lib/finance';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import type { Transaction } from '../transactions/types';

export function sumCents(values: readonly number[]): number {
  return values.reduce((sum, value) => {
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(sum + value)) throw new Error('Total hors limites.');
    return sum + value;
  }, 0);
}

const amount = z.number().int().nonnegative().max(MAX_AMOUNT_CENTS);
export const simulationSchema = z.object({ purchaseCents: amount, reserveCents: amount }).strict();

export function budgetForecast(entries: readonly Transaction[], budgetCents: number | null, today: string,
  simulation = { purchaseCents: 0, reserveCents: 0 }, period = monthBounds(today.slice(0, 7))) {
  if (!isISODate(today)) throw new Error('Date invalide.');
  if (budgetCents !== null) amount.parse(budgetCents);
  simulationSchema.parse(simulation);
  const { start, end } = period;
  const expenses = entries.filter((entry) => entry.kind === 'expense' && entry.occurredOn >= start && entry.occurredOn < end);
  const recordedCents = sumCents(expenses.filter((entry) => !entry.isPlanned).map((entry) => entry.amountCents));
  const plannedCents = sumCents(expenses.filter((entry) => entry.isPlanned).map((entry) => entry.amountCents));
  const reimbursementCents = monthlySummary(entries, today.slice(0, 7), period).reimbursementCents;
  const committed = sumCents([recordedCents, plannedCents, -reimbursementCents, simulation.reserveCents, simulation.purchaseCents]);
  const marginCents = budgetCents === null ? null : budgetCents - committed;
  const daysLeft = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return { recordedCents, plannedCents, reimbursementCents, marginCents, daysLeft,
    dailyCents: marginCents === null || marginCents < 0 ? null : Math.floor(marginCents / daysLeft) };
}

// Exclusive end; clamp to the end of the supported civil-date range.
export function horizonEnd(today: string, days: number): string {
  if (!isISODate(today) || !Number.isInteger(days) || days < 1 || days > 31) throw new Error('Période invalide.');
  const end = new Date(Date.parse(`${today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  return end > '2100-01-01' ? '2100-01-01' : end;
}
