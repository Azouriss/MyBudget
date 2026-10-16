import { centsToInput, formatMoney, MAX_AMOUNT_CENTS, parseAmountToCents } from '../money';

describe('montants en centimes', () => {
  test.each([
    ['0,01', 1], ['0.10', 10], ['0,29', 29], ['12', 1200],
    ['12,3', 1230], ['12.34', 1234], [' 42,50 ', 4250],
    ['9999999,99', MAX_AMOUNT_CENTS],
  ])('%s est converti exactement en %i centimes', (input, cents) => {
    expect(parseAmountToCents(input)).toBe(cents);
  });

  test.each(['', '0', '0,00', '-12', '+12', '1e3', '1,234', '12.', '12,', '1 000', '1.000,00', 'NaN', 'Infinity', '10000000'])(
    'refuse le montant ambigu ou invalide %s', (input) => {
      expect(() => parseAmountToCents(input)).toThrow();
    },
  );

  it('conserve chaque centime lors d’un aller-retour', () => {
    for (let cents = 1; cents <= 10_000; cents++) {
      expect(parseAmountToCents(centsToInput(cents))).toBe(cents);
    }
    expect(parseAmountToCents(centsToInput(MAX_AMOUNT_CENTS))).toBe(MAX_AMOUNT_CENTS);
  });

  it('formate en français et accepte un bilan négatif', () => {
    expect(formatMoney(-1234).replace(/\s/g, ' ')).toBe('-12,34 €');
    expect(formatMoney(0).replace(/\s/g, ' ')).toBe('0,00 €');
  });

  it('refuse les centimes fractionnaires', () => {
    expect(() => formatMoney(1.5)).toThrow();
    expect(() => centsToInput(-1)).toThrow();
  });
});
