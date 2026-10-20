import { defaultCategories } from '../defaults';
import { setLanguage } from '../../../i18n/locale';
import { detectExpenseSubcategory, expenseSubcategories, getExpenseSubcategory, isValidExpenseSubcategory, searchExpenseSubcategories } from '../subcategories';

const categories = defaultCategories.filter((category) => category.kind === 'expense');
afterEach(() => setLanguage('fr'));

describe('catalogue et recherche locale de sous-catégories', () => {
  it('étend les six sections avec des identifiants uniques et conserve les anciens identifiants', () => {
    expect(expenseSubcategories.length).toBeGreaterThanOrEqual(120);
    expect(new Set(expenseSubcategories.map((item) => item.id)).size).toBe(expenseSubcategories.length);
    for (const category of categories) {
      expect(searchExpenseSubcategories('', category.id, categories).length).toBeGreaterThan(15);
    }
    expect(expenseSubcategories.every((item) => categories.some((category) => category.id === item.categoryId))).toBe(true);
    expect(isValidExpenseSubcategory({ kind: 'expense', categoryId: 'housing', subcategoryId: 'housing-phone' })).toBe(true);
    expect(isValidExpenseSubcategory({ kind: 'expense', categoryId: 'housing', subcategoryId: 'other-expense-mobile' })).toBe(false);
    expect(searchExpenseSubcategories('telephone', 'food', categories).some((entry) => entry.id === 'housing-phone')).toBe(false);
    expect(getExpenseSubcategory(null)).toBeUndefined();
    expect(getExpenseSubcategory('unknown')).toBeUndefined();
  });

  it.each([
    ['  ESSENCE  ', 'transport-fuel'],
    ['electricite', 'housing-electricity'],
    ['sante kine', 'health-physio'],
    ['netflix', 'leisure-video'],
    ['mon abonnement orange pour mon téléphone', 'other-expense-mobile'],
    ['wi-fi', 'housing-internet'],
    ['pharamcie', 'health-pharmacy'],
    ['carburent', 'transport-fuel'],
    ['contrôle technique', 'transport-inspection'],
  ])('classe le résultat pertinent en premier pour %s', (query, id) => {
    expect(searchExpenseSubcategories(query, 'food', categories)[0]?.id).toBe(id);
  });

  it('permet de parcourir les abonnements, les opérateurs ambigus et la section active', () => {
    expect(searchExpenseSubcategories('téléph', 'food', categories).map((entry) => entry.id))
      .toEqual(expect.arrayContaining(['other-expense-mobile', 'other-expense-landline']));
    expect(searchExpenseSubcategories('abonnement', 'food', categories).length).toBeGreaterThan(5);
    expect(searchExpenseSubcategories('orange', 'food', categories).map((entry) => entry.id)).toEqual(expect.arrayContaining(['housing-internet', 'other-expense-mobile']));
    expect(searchExpenseSubcategories('  ', 'transport', categories).every((item) => item.categoryId === 'transport')).toBe(true);
    expect(searchExpenseSubcategories('cœur introuvable', 'food', categories)).toEqual([]);
    expect(searchExpenseSubcategories('essence', 'food', categories.filter((item) => item.id !== 'transport'))).toEqual([]);
    expect(searchExpenseSubcategories('essence', 'food', [])).toEqual([]);
  });
});

describe('détection prudente à partir du libellé', () => {
  it.each([
    ['Mon abonnement Orange pour mon téléphone', 'other-expense-mobile'],
    ['forfait Orange 5G', 'other-expense-mobile'],
    ['Orange mobile', 'other-expense-mobile'],
    ['Sosh mobile', 'other-expense-mobile'],
    ['Free Mobile', 'other-expense-mobile'],
    ['forfait téléphonique SFR', 'other-expense-mobile'],
    ['Orange fibre', 'housing-internet'],
    ['abonnement Livebox', 'housing-internet'],
    ['Freebox', 'housing-internet'],
    ['Bbox fibre', 'housing-internet'],
    ['téléphone fixe', 'other-expense-landline'],
    ['achat téléphone', 'other-expense-phone-device'],
    ['achat iPhone', 'other-expense-phone-device'],
    ['Netflix', 'leisure-video'],
    ['abonnement Spotify', 'leisure-music'],
    ['abonnement iCloud', 'leisure-cloud'],
    ['Xbox Game Pass', 'leisure-gaming'],
    ['Uber Eats', 'food-delivery'],
    ['Uber', 'transport-taxi'],
    ['courses Carrefour', 'food-groceries'],
    ['jus d’orange', 'food-drinks'],
    ['assurance habitation', 'housing-insurance'],
    ['assurance voiture', 'transport-insurance'],
    ['assurance chien', 'other-expense-pet-insurance'],
    ['mutuelle santé', 'health-insurance'],
    ['contrôle technique', 'transport-inspection'],
    ['taxe foncière', 'housing-property-tax'],
    ['abonnement Basic-Fit', 'leisure-sport'],
    ['orthophoniste', 'health-speech'],
    ['EDF électricité', 'housing-electricity'],
    ['EDF gaz', 'housing-gas'],
  ])('%s propose %s', (label, id) => {
    expect(detectExpenseSubcategory(label, categories)?.id).toBe(id);
  });

  it.each(['', 'Orange', 'SFR', 'Free', 'Bouygues', 'Sosh', 'EDF', 'Engie', 'abonnement', 'forfait', 'assurance', 'box',
    'paiement 42,90', 'Amazon', 'Apple', 'pharamcie', 'kine introuvable', 'Orange mobile fibre', 'forfait internet mobile'])
  ('ne décide pas sans contexte suffisant : %s', (label) => {
    expect(detectExpenseSubcategory(label, categories)).toBeUndefined();
  });

  it('respecte les catégories disponibles et les limites de mots', () => {
    expect(detectExpenseSubcategory('Netflix', categories.filter((category) => category.id !== 'leisure'))).toBeUndefined();
    expect(detectExpenseSubcategory('Netflix', [])).toBeUndefined();
    expect(detectExpenseSubcategory('Orange', categories.filter((category) => category.id === 'housing'))).toBeUndefined();
    expect(detectExpenseSubcategory('freestyle', categories)).toBeUndefined();
    expect(detectExpenseSubcategory('supermarket', categories)).toBeUndefined();
  });

  it('actualise son index au changement de langue sans perdre les recherches françaises', () => {
    setLanguage('en');
    expect(detectExpenseSubcategory('mobile phone plan', categories)?.id).toBe('other-expense-mobile');
    expect(searchExpenseSubcategories('cloud storage', 'food', categories)[0]?.id).toBe('leisure-cloud');
    expect(detectExpenseSubcategory('Orange téléphone', categories)?.id).toBe('other-expense-mobile');
    setLanguage('fr');
    expect(detectExpenseSubcategory('Orange téléphone', categories)?.id).toBe('other-expense-mobile');
  });
});
