import { periodLabel, currentMonth, displayDate, isISODate, localDateKey, monthBounds, parseFrenchDate, shiftMonth } from '../dates';

describe('dates civiles et mois', () => {
  it('valide les années bissextiles', () => {
    expect(isISODate('2024-02-29')).toBe(true);
    expect(isISODate('2025-02-29')).toBe(false);
    expect(isISODate('1900-02-29')).toBe(false);
    expect(isISODate('2000-02-29')).toBe(true);
  });

  test.each(['2026-02-30', '2026-04-31', '2026-00-10', '2026-13-01', '2026-10-00', '2026-1-01', '2100-01-01', '1899-12-31'])(
    'refuse %s', (input) => { expect(isISODate(input)).toBe(false); },
  );

  it('convertit le format français sans décalage UTC', () => {
    expect(parseFrenchDate('15/10/2026')).toBe('2026-10-15');
    expect(displayDate('2026-10-15')).toBe('15/10/2026');
    expect(() => parseFrenchDate('31/04/2026')).toThrow();
    expect(() => parseFrenchDate('2026-10-15')).toThrow();
  });

  it('utilise la date locale du téléphone', () => {
    const local = new Date(2026, 9, 15, 0, 1);
    expect(localDateKey(local)).toBe('2026-10-15');
    expect(currentMonth()).toMatch(/^\d{4}-\d{2}$/);
  });

  it('gère décembre et la borne haute exclusive', () => {
    expect(monthBounds('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(monthBounds('2099-12').end).toBe('2100-01-01');
    expect(() => shiftMonth('2099-12', 1)).toThrow();
    expect(() => monthBounds('2026-13')).toThrow();
  });
});

  test.each([
    ['2028-02-01', '2028-03-01', '1 févr. – 29 févr.'],
    ['2026-10-28', '2026-11-28', '28 oct. – 27 nov.'],
    ['2099-12-01', '2100-01-01', '1 déc. – 31 déc.'],
  ])('affiche la période %s avec un dernier jour inclus', (start, end, label) => {
    expect(periodLabel({ start, end })).toBe(label);
  });
  it('refuse une période de présentation inversée ou invalide', () => {
    expect(() => periodLabel({ start: '2026-10-10', end: '2026-10-01' })).toThrow();
    expect(() => periodLabel({ start: '2026-02-30', end: '2026-03-01' })).toThrow();
  });
