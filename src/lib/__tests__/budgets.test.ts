import { budgetEnvelopeExcess, budgetProgress } from '../budgets';
import { budgetDraftSchema, budgetMonthSchema, parseBudgetAmount } from '../../features/budgets/validation';

describe('budgets mensuels', () => {
  it('calcule le reste et la progression à partir de centimes entiers', () => {
    expect(budgetProgress(89_250, 120_000)).toEqual({
      ratio: 0.74375, percent: 74, remainingCents: 30_750, exceeded: false, nearLimit: false,
    });
  });
  it('distingue limite atteinte et dépassement sans masquer les montants', () => {
    expect(budgetProgress(10_000, 10_000)).toMatchObject({ percent: 100, remainingCents: 0, exceeded: false, nearLimit: true });
    expect(budgetProgress(12_500, 10_000)).toMatchObject({ percent: 125, remainingCents: -2500, exceeded: true });
  });
  it('affiche une progression nulle quand aucun montant n’est dépensé', () => {
    expect(budgetProgress(0, 1)).toMatchObject({ percent: 0, remainingCents: 1, exceeded: false });
  });
  it('affiche un crédit net sans progression négative', () => {
    expect(budgetProgress(-2000, 10000)).toMatchObject({ ratio: 0, remainingCents: 12000, exceeded: false });
  });
  test.each([1.5, NaN, Number.MAX_SAFE_INTEGER + 1])('refuse une dépense invalide %s', (amount) => {
    expect(() => budgetProgress(amount, 10_000)).toThrow();
  });
  test.each([-1, 1.5, Infinity])('refuse une limite invalide %s', (amount) => {
    expect(() => budgetProgress(0, amount)).toThrow();
    expect(budgetDraftSchema.safeParse({ month: '2026-10', amountCents: amount }).success).toBe(false);
  });
  test.each(['2026-00', '2026-13', '2026-1', '1899-12', '2100-01', '2026-10-01'])('refuse le mois %s', (month) => {
    expect(budgetMonthSchema.safeParse(month).success).toBe(false);
  });
  it('conserve la précision de saisie et les bornes métier', () => {
    expect(parseBudgetAmount('0,29')).toBe(29);
    expect(parseBudgetAmount('9999999,99')).toBe(999_999_999);
    expect(() => parseBudgetAmount('10000000')).toThrow();
    expect(parseBudgetAmount('0')).toBe(0);
    expect(parseBudgetAmount('0,00')).toBe(0);
    expect(() => parseBudgetAmount('12,345')).toThrow();
  });
  it('distingue un budget nul d’une limite absente sans inventer de pourcentage', () => {
    expect(budgetProgress(0, 0)).toEqual({ ratio: 0, percent: null, remainingCents: 0, exceeded: false, nearLimit: false });
    expect(budgetProgress(29, 0)).toEqual({ ratio: 1, percent: null, remainingCents: -29, exceeded: true, nearLimit: true });
    expect(budgetDraftSchema.safeParse({ month: '2026-10', amountCents: 0 }).success).toBe(true);
  });
  it('calcule l’excédent avant de réduire le budget global, y compris à zéro', () => {
    const current = { monthly: { amountCents: 120_000 }, categories: [{ categoryId: 'food', amountCents: 25_000 }, { categoryId: 'housing', amountCents: 65_000 }] };
    expect(budgetEnvelopeExcess(current, { amountCents: 120_000 })).toBe(0);
    expect(budgetEnvelopeExcess(current, { amountCents: 80_000 })).toBe(10_000);
    expect(budgetEnvelopeExcess(current, { amountCents: 0 })).toBe(90_000);
  });
  it('remplace l’enveloppe modifiée sans la compter deux fois et ajoute les nouvelles', () => {
    const current = { monthly: { amountCents: 100_000 }, categories: [{ categoryId: 'food', amountCents: 25_000 }, { categoryId: 'housing', amountCents: 65_000 }] };
    expect(budgetEnvelopeExcess(current, { categoryId: 'food', amountCents: 40_000 })).toBe(5_000);
    expect(budgetEnvelopeExcess(current, { categoryId: 'transport', amountCents: 20_000 })).toBe(10_000);
    expect(budgetEnvelopeExcess({ categories: current.categories }, { categoryId: 'transport', amountCents: 20_000 })).toBe(0);
  });
});
