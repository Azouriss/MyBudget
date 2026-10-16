import { expenseByCategory, monthlySummary } from '../finance';

const expense = (amountCents: number, occurredOn = '2026-10-15', categoryId = 'food') =>
  ({ kind: 'expense' as const, amountCents, occurredOn, categoryId });

describe('calculs indépendants de l’interface', () => {
  it('retourne un bilan nul pour un mois vide', () => {
    expect(monthlySummary([], '2026-10')).toEqual({ incomeCents: 0, expenseCents: 0, netCents: 0, count: 0 });
  });

  it('ne perd aucun centime et accepte un bilan négatif', () => {
    const entries = [expense(10), expense(20), { ...expense(29), kind: 'income' as const }];
    expect(monthlySummary(entries, '2026-10')).toEqual({
      incomeCents: 29, expenseCents: 30, netCents: -1, count: 3,
    });
  });

  it('exclut les deux mois voisins et inclut tout le mois choisi', () => {
    expect(monthlySummary([
      expense(100, '2026-09-30'), expense(10, '2026-10-01'),
      expense(20, '2026-10-31'), expense(100, '2026-11-01'),
    ], '2026-10').expenseCents).toBe(30);
  });

  it('regroupe uniquement les dépenses et trie les catégories par montant', () => {
    expect(expenseByCategory([
      expense(10), expense(20), expense(50, '2026-10-15', 'housing'),
      { ...expense(9999), kind: 'income' as const },
    ])).toEqual([{ categoryId: 'housing', amountCents: 50 }, { categoryId: 'food', amountCents: 30 }]);
  });

  test.each([0, -10, 1.5, Number.NaN, 1_000_000_000])('refuse le montant incohérent %s', (amount) => {
    expect(() => monthlySummary([expense(amount)], '2026-10')).toThrow();
  });
});
