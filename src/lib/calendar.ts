import { isISODate, localDateKey, monthBounds, parseFrenchDate } from './dates';
import { getLocale } from '../i18n/locale';

export function calendarSelection(value: string, today = localDateKey()): string {
  try { return parseFrenchDate(value); }
  catch {
    if (!isISODate(today)) throw new Error('Date actuelle invalide.');
    return today;
  }
}

// Civil dates only: UTC arithmetic keeps the grid stable across time zones/DST.
export function calendarDays(month: string): (string | null)[] {
  monthBounds(month);
  const [year, number] = month.split('-').map(Number) as [number, number];
  const offset = (new Date(Date.UTC(year, number - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year, number, 0)).getUTCDate();
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1;
    return day >= 1 && day <= count ? `${month}-${String(day).padStart(2, '0')}` : null;
  });
}

export function calendarDateLabel(value: string): string {
  if (!isISODate(value)) throw new Error('Date invalide.');
  return new Intl.DateTimeFormat(getLocale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));
}
