import { calendarDateLabel, calendarDays, calendarSelection } from '../calendar';

describe('calendrier de saisie des dépenses', () => {
  it('commence les semaines le lundi et conserve tous les jours une seule fois', () => {
    const days = calendarDays('2026-10');
    expect(days).toHaveLength(42);
    expect(days.slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(days.filter(Boolean)).toHaveLength(31);
    expect(new Set(days.filter(Boolean)).size).toBe(31);
    expect(days[33]).toBe('2026-10-31');
  });

  it('gère les mois de 28 à 31 jours, les dimanches et les années bissextiles', () => {
    expect(calendarDays('2026-02').filter(Boolean)).toHaveLength(28);
    expect(calendarDays('2024-02').filter(Boolean)).toHaveLength(29);
    expect(calendarDays('1900-02').filter(Boolean)).toHaveLength(28);
    expect(calendarDays('2000-02').filter(Boolean)).toHaveLength(29);
    expect(calendarDays('2026-04').filter(Boolean)).toHaveLength(30);
    expect(calendarDays('2026-03')[6]).toBe('2026-03-01');
    expect(calendarDays('2026-06')[0]).toBe('2026-06-01');
    expect(calendarDays('2026-03')[36]).toBe('2026-03-31');
  });

  it('respecte les limites de dates de l’application', () => {
    expect(calendarDays('1900-01').filter(Boolean)[0]).toBe('1900-01-01');
    expect(calendarDays('2099-12').filter(Boolean).pop()).toBe('2099-12-31');
    for (const month of ['1899-12', '2100-01', '2026-13']) expect(() => calendarDays(month)).toThrow();
  });

  it('ouvre le mois saisi ou utilise aujourd’hui si la saisie est incomplète ou invalide', () => {
    expect(calendarSelection('29/02/2024', '2026-10-16')).toBe('2024-02-29');
    for (const value of ['', '16/10', '31/02/2026', '2026-10-16']) {
      expect(calendarSelection(value, '2026-10-16')).toBe('2026-10-16');
    }
  });

  it('annonce le jour complet en français sans décalage de fuseau', () => {
    expect(calendarDateLabel('2026-10-16')).toBe('vendredi 16 octobre 2026');
    expect(calendarDateLabel('2024-02-29')).toBe('jeudi 29 février 2024');
    expect(() => calendarDateLabel('2026-02-31')).toThrow();
  });
});
