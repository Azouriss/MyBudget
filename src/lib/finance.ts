import type { Transaction } from '../features/transactions/types';
import { MAX_AMOUNT_CENTS } from './money';
import { monthBounds } from './dates';

type FinancialEntry = Pick<Transaction, 'kind' | 'amountCents' | 'occurredOn' | 'categoryId' | 'splits' | 'reimbursement' | 'isPlanned'>;

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

export function monthlySummary(entries: readonly FinancialEntry[], month: string, bounds = monthBounds(month)) {
  const { start, end } = bounds;
  let incomeCents = 0;
  let grossExpenseCents = 0;
  let reimbursementCents = 0;
  let plannedIncomeCents = 0;
  let count = 0;
  for (const entry of entries) {
    if (entry.occurredOn < start || entry.occurredOn >= end) continue;
    validateAmount(entry.amountCents);
    if (entry.kind === 'income') {
      if (entry.reimbursement || entry.categoryId === 'reimbursements') {
        if (!entry.isPlanned) reimbursementCents = addCents(reimbursementCents, entry.amountCents);
      } else if (entry.isPlanned) plannedIncomeCents = addCents(plannedIncomeCents, entry.amountCents);
      else incomeCents = addCents(incomeCents, entry.amountCents);
    } else if (entry.kind === 'expense') grossExpenseCents = addCents(grossExpenseCents, entry.amountCents);
    else throw new Error('Type de transaction invalide.');
    count++;
  }
  const expenseCents = grossExpenseCents - reimbursementCents;
  return { incomeCents, expenseCents, grossExpenseCents, reimbursementCents, plannedIncomeCents, netCents: addCents(incomeCents, -expenseCents), count };
}

export function expenseByCategory(entries: readonly FinancialEntry[], net = true) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const refund = net && entry.kind === 'income' && !entry.isPlanned && (entry.reimbursement || entry.categoryId === 'reimbursements');
    if (entry.kind !== 'expense' && !refund) continue;
    validateAmount(entry.amountCents);
    const parts = refund ? entry.reimbursement?.parts ?? [{ categoryId: 'other-expense', amountCents: entry.amountCents }]
      : entry.splits?.length ? entry.splits : [{ categoryId: entry.categoryId, amountCents: entry.amountCents }];
    if (parts.reduce((n, p) => addCents(n, p.amountCents), 0) !== entry.amountCents) throw new Error('Répartition incohérente.');
    for (const part of parts) {
      validateAmount(part.amountCents);
      totals.set(part.categoryId, addCents(totals.get(part.categoryId) ?? 0, refund ? -part.amountCents : part.amountCents));
    }
  }
  return [...totals].map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents || a.categoryId.localeCompare(b.categoryId));
}
