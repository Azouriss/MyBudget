import { dashboardSummary } from '../finance';
import type { Transaction } from '../../features/transactions/types';

const entry = (id: string, amountCents: number, occurredOn: string, extra: Partial<Transaction> = {}): Transaction => ({
  id, amountCents, occurredOn, kind: 'expense', label: id, categoryId: 'food', subcategoryId: null,
  recurringExpenseId: null, recurringOccurrenceOn: null, recurringIncomeId: null, recurringIncomeOn: null,
  createdAt: 0, updatedAt: 0, ...extra,
});
const period = { start: '2026-10-28', end: '2026-11-28' };
it('sépare le net enregistré et les échéances sur les mêmes bornes de paie', () => {
  const result = dashboardSummary([
    entry('expense', 10000, '2026-10-28'), entry('planned', 2000, '2026-11-12', { isPlanned: true }),
    entry('refund', 3000, '2026-11-01', { kind: 'income', categoryId: 'reimbursements' }),
    entry('salary', 200000, '2026-10-28', { kind: 'income', categoryId: 'salary' }),
    entry('next-salary', 200000, '2026-11-20', { kind: 'income', categoryId: 'salary', isPlanned: true }),
    entry('outside', 99999, '2026-11-28'),
  ], '2026-10', '2026-11-02', period);
  expect(result.actual.expenseCents).toBe(7000);
  expect(result.plannedExpenseCents).toBe(2000);
  expect(result.total.expenseCents).toBe(9000);
  expect(result.actual.expenseCents + result.plannedExpenseCents).toBe(result.total.expenseCents);
  expect(result.actual.incomeCents).toBe(200000);
  expect(result.total.plannedIncomeCents).toBe(200000);
  expect(result.breakdown).toEqual([{ categoryId: 'food', amountCents: 10000 }]);
  expect(result.recent.map(e => e.id)).toEqual(['refund', 'expense', 'salary']);
});
it('limite les dernières opérations à cinq sans muter la liste ou afficher de dates futures', () => {
  const rows = Array.from({ length: 7 }, (_, i) => entry(String(i), 100, '2026-11-01')).reverse();
  rows.push(entry('future-recorded', 100, '2026-11-10'), entry('future-rule', 100, '2026-11-10', { isPlanned: true }));
  const before = rows.map(e => e.id);
  expect(dashboardSummary(rows, '2026-11', '2026-11-02').recent.map(e => e.id)).toEqual(['0','1','2','3','4']);
  expect(rows.map(e => e.id)).toEqual(before);
});
it('conserve le total quand une échéance devient enregistrée et accepte un net négatif', () => {
  const refund = entry('refund', 3000, '2026-11-01', { kind: 'income', categoryId: 'reimbursements' });
  const planned = entry('expense', 2000, '2026-11-02', { isPlanned: true });
  const before = dashboardSummary([refund, planned], '2026-11', '2026-11-02');
  const after = dashboardSummary([refund, { ...planned, isPlanned: false }], '2026-11', '2026-11-02');
  expect(before.total.expenseCents).toBe(-1000);
  expect(after.total.expenseCents).toBe(before.total.expenseCents);
  expect(after.plannedExpenseCents).toBe(0);
});
