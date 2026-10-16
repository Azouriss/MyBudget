import { defaultCategories } from '../defaults';
import { expenseSubcategories, getExpenseSubcategory, searchExpenseSubcategories } from '../subcategories';

describe('recherche locale de sous-catégories', () => {
  it('propose un catalogue unique dans chacune des six catégories de dépenses', () => {
    expect(expenseSubcategories).toHaveLength(90);
    expect(new Set(expenseSubcategories.map((item) => item.id)).size).toBe(90);
    for (const category of defaultCategories.filter((item) => item.kind === 'expense')) {
      expect(searchExpenseSubcategories('', category.id, defaultCategories)).toHaveLength(15);
    }
    expect(expenseSubcategories.every((item) => defaultCategories.some((category) =>
      category.id === item.categoryId && category.kind === 'expense'))).toBe(true);
  });

  it('recherche dans toutes les sections avec accents, casse, espaces et mots associés', () => {
    expect(searchExpenseSubcategories('  ESSENCE  ', 'food', defaultCategories).map((item) => item.id)).toEqual(['transport-fuel']);
    expect(searchExpenseSubcategories('electricite', 'food', defaultCategories).map((item) => item.id)).toEqual(['housing-electricity']);
    expect(searchExpenseSubcategories('sante kine', 'housing', defaultCategories).map((item) => item.id)).toEqual(['health-physio']);
    expect(searchExpenseSubcategories('netflix', 'food', defaultCategories).map((item) => item.id)).toEqual(['leisure-streaming']);
    expect(searchExpenseSubcategories('cœur introuvable', 'food', defaultCategories)).toEqual([]);
  });

  it('suggère la section active et exclut les catégories indisponibles', () => {
    expect(searchExpenseSubcategories('  ', 'transport', defaultCategories).every((item) => item.categoryId === 'transport')).toBe(true);
    expect(searchExpenseSubcategories('essence', 'food', defaultCategories.filter((item) => item.id !== 'transport'))).toEqual([]);
    expect(getExpenseSubcategory(null)).toBeUndefined();
    expect(getExpenseSubcategory('unknown')).toBeUndefined();
  });
});
