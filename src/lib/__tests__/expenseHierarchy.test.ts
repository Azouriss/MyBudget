import { expenseHierarchy } from '../expenseHierarchy';
import type { Transaction } from '../../features/transactions/types';
const bounds = { start: '2026-10-28', end: '2026-11-28' };
const purchase = (id: string, amountCents: number, extra: Partial<Transaction> = {}): Transaction => ({
  id, kind: 'expense', amountCents, categoryId: 'food', subcategoryId: 'food-groceries',
  label: id, occurredOn: '2026-11-02', createdAt: 0, updatedAt: 0, ...extra,
});
it('conserve les centimes entre chaque catégorie et ses sous-catégories enregistrées', () => {
  const result = expenseHierarchy([purchase('a', 301), purchase('b', 199), purchase('c', 100, { subcategoryId: 'food-bakery' }), purchase('d', 50, { subcategoryId: null })], bounds);
  expect(result).toEqual([{ categoryId: 'food', amountCents: 650, children: [
    { subcategoryId: 'food-groceries', amountCents: 500 }, { subcategoryId: 'food-bakery', amountCents: 100 }, { subcategoryId: null, amountCents: 50 },
  ] }]);
});
it('ne devine pas la sous-catégorie des répartitions et ne double pas leur total', () => {
  const result = expenseHierarchy([purchase('split', 1000, { splits: [{ categoryId: 'food', amountCents: 300 }, { categoryId: 'housing', amountCents: 700 }] })], bounds);
  expect(result).toEqual([
    { categoryId: 'housing', amountCents: 700, children: [{ subcategoryId: null, amountCents: 700 }] },
    { categoryId: 'food', amountCents: 300, children: [{ subcategoryId: null, amountCents: 300 }] },
  ]);
});
it('exclut prévisions, revenus et remboursements et respecte les bornes de paie', () => {
  const result = expenseHierarchy([
    purchase('start', 100, { occurredOn: bounds.start }), purchase('end', 100, { occurredOn: bounds.end }),
    purchase('before', 100, { occurredOn: '2026-10-27' }), purchase('planned', 100, { isPlanned: true }),
    purchase('salary', 100, { kind: 'income', categoryId: 'salary' }), purchase('refund', 100, { kind: 'income', categoryId: 'reimbursements' }),
  ], bounds);
  expect(result[0]!.amountCents).toBe(100);
  expect(result[0]!.children[0]!.amountCents).toBe(100);
});
it('garde le manque de précision visible sans attribuer une sous-catégorie incompatible', () => {
  expect(expenseHierarchy([purchase('unknown', 100, { subcategoryId: 'missing' }), purchase('wrong', 200, { subcategoryId: 'housing-rent' })], bounds)[0]!.children)
    .toEqual([{ subcategoryId: null, amountCents: 300 }]);
  expect(expenseHierarchy([], bounds)).toEqual([]);
  expect(() => expenseHierarchy([purchase('broken', 100, { splits: [{ categoryId: 'food', amountCents: 90 }] })], bounds)).toThrow();
});
