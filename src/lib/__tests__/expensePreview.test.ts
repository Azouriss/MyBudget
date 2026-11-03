import { expensePreview } from '../expensePreview';
import type { ExpenseCategoryBreakdown } from '../expenseHierarchy';

it('limite un grand aperçu à quatre branches en conservant chaque centime', () => {
  const children = Array.from({ length: 60 }, (_, i) => ({ subcategoryId: `child-${i}`, amountCents: 60 - i }));
  const group: ExpenseCategoryBreakdown = { categoryId: 'food', amountCents: 1830, children };
  const before = JSON.stringify(group);
  const preview = expensePreview(group);
  expect(preview).toHaveLength(4);
  expect(preview.slice(0, 3).map(row => row.subcategoryId)).toEqual(['child-0', 'child-1', 'child-2']);
  expect(preview[3]!.remainingCount).toBe(57);
  expect(preview.reduce((sum, row) => sum + row.amountCents, 0)).toBe(group.amountCents);
  expect(JSON.stringify(group)).toBe(before);
});

it('préserve une petite répartition et distingue Non précisé du regroupement', () => {
  const children = [{ subcategoryId: null, amountCents: 100 }, { subcategoryId: 'food-bakery', amountCents: 1 }];
  expect(expensePreview({ categoryId: 'food', amountCents: 101, children }).map(row => row.remainingCount)).toEqual([0, 0]);
  expect(expensePreview({ categoryId: 'food', amountCents: 0, children: [] })).toEqual([]);
  expect(() => expensePreview({ categoryId: 'food', amountCents: 0, children: [] }, 1)).toThrow();
});

it('ne masque pas un montant invalide ou un doublon dans le regroupement', () => {
  const children = Array.from({ length: 5 }, (_, i) => ({ subcategoryId: `child-${i}`, amountCents: 10 }));
  expect(() => expensePreview({ categoryId: 'food', amountCents: 40, children: [...children, { subcategoryId: 'negative', amountCents: -10 }] })).toThrow();
  expect(() => expensePreview({ categoryId: 'food', amountCents: 60, children: [...children, children[4]!] })).toThrow();
  expect(() => expensePreview({ categoryId: 'food', amountCents: 49, children })).toThrow();
});
