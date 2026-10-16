import type { Transaction } from '../features/transactions/types';
import { MAX_AMOUNT_CENTS } from './money';
import { monthBounds } from './dates';

type FinancialEntry = Pick<Transaction, 'kind' | 'amountCents' | 'occurredOn' | 'categoryId'>;

function addCents(total: number, amount: number): number {
  const result = total + amount;
  if (!Number.isSafeInteger(result)) throw new Error('Total hors limites.');
  return result;
}

function validateAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_AMOUNT_CENTS) {
    throw new Error('Montant invalide.');
  }
}

export function monthlySummary(entries: readonly FinancialEntry[], month: string) {
  const { start, end } = monthBounds(month);
  let incomeCents = 0;
  let expenseCents = 0;
  let count = 0;
  for (const entry of entries) {
    if (entry.occurredOn < start || entry.occurredOn >= end) continue;
    validateAmount(entry.amountCents);
    if (entry.kind === 'income') incomeCents = addCents(incomeCents, entry.amountCents);
    else if (entry.kind === 'expense') expenseCents = addCents(expenseCents, entry.amountCents);
    else throw new Error('Type de transaction invalide.');
    count++;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents, count };
}

export function expenseByCategory(entries: readonly FinancialEntry[]) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.kind !== 'expense') continue;
    validateAmount(entry.amountCents);
    totals.set(entry.categoryId, addCents(totals.get(entry.categoryId) ?? 0, entry.amountCents));
  }
  return [...totals].map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents || a.categoryId.localeCompare(b.categoryId));
}
