import { expenseFlow } from '../expenseFlow';

it('conserve la largeur proportionnelle et le total du flux sans modifier les centimes', () => {
  const parts = [{ categoryId: 'housing', amountCents: 90000 }, { categoryId: 'food', amountCents: 9999 }, { categoryId: 'health', amountCents: 1 }];
  const flow = expenseFlow(parts, 100000, 100);
  expect(flow.rows.reduce((sum, row) => sum + row.thickness, 0)).toBeCloseTo(flow.bandHeight);
  expect(flow.rows[0]!.thickness / flow.bandHeight).toBeCloseTo(0.9);
  expect(flow.rows[2]!.thickness).toBeCloseTo(0.0012);
  expect(flow.rows.every((row) => !/NaN|Infinity/.test(row.path))).toBe(true);
  expect(parts[0]!.amountCents).toBe(90000);
});
it('agrandit les espaces de libellés sans grossir artificiellement les petites dépenses', () => {
  const flow = expenseFlow([{ categoryId: 'food', amountCents: 100 }, { categoryId: 'health', amountCents: 100 }], 200, 100, { food: 250 }, 1.5);
  expect(flow.rows[0]!.height).toBe(250);
  expect(flow.rows[0]!.thickness).toBe(flow.rows[1]!.thickness);
  expect(flow.rows[1]!.targetY).toBeGreaterThan(250);
});
it('distingue zéro, répartition incohérente et part négative', () => {
  expect(expenseFlow([], 0, 100).rows).toEqual([]);
  expect(() => expenseFlow([{ categoryId: 'food', amountCents: -1 }], 0, 100)).toThrow();
  expect(() => expenseFlow([{ categoryId: 'food', amountCents: 100 }], 200, 100)).toThrow();
  expect(() => expenseFlow([{ categoryId: 'food', amountCents: 1 }, { categoryId: 'food', amountCents: 1 }], 2, 100)).toThrow();
});
