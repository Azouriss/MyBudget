import { expenseBranchKey, expenseRibbon, expenseTreeFlow } from '../expenseTreeFlow';
import type { ExpenseCategoryBreakdown } from '../expenseHierarchy';

const groups: ExpenseCategoryBreakdown[] = [
  { categoryId: 'housing', amountCents: 90000, children: [
    { subcategoryId: 'housing-rent', amountCents: 80000 }, { subcategoryId: null, amountCents: 10000 },
  ] },
  { categoryId: 'food', amountCents: 10000, children: [
    { subcategoryId: 'food-groceries', amountCents: 9999 }, { subcategoryId: null, amountCents: 1 },
  ] },
];

it('relie chaque catégorie et sous-catégorie avec une même échelle proportionnelle', () => {
  const before = JSON.stringify(groups);
  const flow = expenseTreeFlow(groups);
  expect(flow.total).toBe(100000);
  expect(flow.groups.reduce((sum, group) => sum + group.thickness, 0)).toBeCloseTo(flow.bandHeight);
  for (const group of flow.groups) {
    expect(group.children.reduce((sum, child) => sum + child.thickness, 0)).toBeCloseTo(group.thickness);
    expect(group.children[0]!.sourceY).toBeCloseTo(group.targetY);
    const last = group.children.at(-1)!;
    expect(last.sourceY + last.thickness).toBeCloseTo(group.targetY + group.thickness);
  }
  expect(flow.groups[1]!.children[1]!.thickness).toBeCloseTo(0.0016);
  expect(JSON.stringify(groups)).toBe(before);
});

it('garde toutes les branches et distingue les sous-catégories non précisées', () => {
  const flow = expenseTreeFlow(groups);
  const children = flow.groups.flatMap(group => group.children);
  expect(children).toHaveLength(4);
  expect(new Set(children.map(child => child.key)).size).toBe(4);
  expect(children.filter(child => child.subcategoryId === null)).toHaveLength(2);
});

it('espace les libellés agrandis sans changer la proportion des flux', () => {
  const key = expenseBranchKey('housing', null);
  const flow = expenseTreeFlow(groups, { [key]: 320, [`category:${key}`]: 500, total: 240 }, 1.5);
  expect(flow.rootHeight).toBe(264);
  expect(flow.groups[0]!.height).toBe(524);
  expect(flow.groups[0]!.children[1]!.height).toBe(344);
  for (const group of flow.groups) {
    expect(group.top + group.height).toBeLessThanOrEqual(flow.height);
    for (const [index, child] of group.children.entries()) {
      expect(child.top).toBeGreaterThanOrEqual(0);
      expect(child.targetY + child.thickness).toBeLessThanOrEqual(child.top + child.height);
      expect(child.top + child.height).toBeLessThanOrEqual(flow.height);
      if (index) expect(child.top).toBeGreaterThan(group.children[index - 1]!.top + group.children[index - 1]!.height);
      expect(expenseRibbon(100, 200, child.sourceY, child.targetY, child.thickness)).not.toMatch(/NaN|Infinity/);
    }
  }
  expect(flow.groups[0]!.thickness / flow.bandHeight).toBeCloseTo(0.9);
});

it('garde un ruban compact pour une seule branche et ignore les montants nuls', () => {
  const flow = expenseTreeFlow([{ categoryId: 'food', amountCents: 100, children: [
    { subcategoryId: null, amountCents: 100 }, { subcategoryId: 'food-groceries', amountCents: 0 },
  ] }]);
  expect(flow.bandHeight).toBe(16);
  expect(flow.groups[0]!.children).toHaveLength(1);
  expect(flow.groups[0]!.children[0]!.thickness).toBe(16);
  expect(expenseTreeFlow([]).groups).toEqual([]);
});

it('refuse les totaux incohérents, les doublons et les centimes invalides', () => {
  expect(() => expenseTreeFlow([{ ...groups[0]!, amountCents: 89999 }])).toThrow();
  expect(() => expenseTreeFlow([groups[0]!, groups[0]!])).toThrow();
  expect(() => expenseTreeFlow([{ categoryId: 'food', amountCents: 2, children: [
    { subcategoryId: null, amountCents: 1 }, { subcategoryId: null, amountCents: 1 },
  ] }])).toThrow();
  for (const amountCents of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => expenseTreeFlow([{ categoryId: 'food', amountCents, children: [{ subcategoryId: null, amountCents }] }])).toThrow();
  }
});
