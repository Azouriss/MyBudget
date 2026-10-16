import { isISODate, localDateKey, monthBounds } from '../../lib/dates';

export const frequencies = [
  { value: 'weekly', label: 'Semaine' }, { value: 'monthly', label: 'Mois' }, { value: 'yearly', label: 'Année' },
] as const;
export type Frequency = typeof frequencies[number]['value'];

export function occurrenceOn(startOn: string, frequency: Frequency, index: number): string | null {
  if (!isISODate(startOn) || !Number.isSafeInteger(index) || index < 0 || !frequencies.some((f) => f.value === frequency)) {
    throw new Error('Échéance invalide.');
  }
  const [year = 0, month = 0, day = 0] = startOn.split('-').map(Number);
  let date: Date;
  if (frequency === 'weekly') date = new Date(Date.UTC(year, month - 1, day + index * 7));
  else {
    const target = new Date(Date.UTC(year + (frequency === 'yearly' ? index : 0), month - 1 + (frequency === 'monthly' ? index : 0), 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    date = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
  }
  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() > 2099) return null;
  return date.toISOString().slice(0, 10);
}

export function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return localDateKey(date);
}

export function occurrencesForMonth(startOn: string, frequency: Frequency, nextIndex: number, month: string): string[] {
  const { start, end } = monthBounds(month);
  occurrenceOn(startOn, frequency, nextIndex);
  const [year = 0, number = 0] = start.split('-').map(Number);
  const [anchorYear = 0, anchorMonth = 0] = startOn.split('-').map(Number);
  // Seek directly to the selected month, even for a much older weekly rule.
  const offset = frequency === 'weekly'
    ? Math.floor((Date.parse(`${start}T00:00:00Z`) - Date.parse(`${startOn}T00:00:00Z`)) / (7 * 86400000))
    : frequency === 'monthly' ? (year - anchorYear) * 12 + number - anchorMonth : year - anchorYear;
  let index = Math.max(nextIndex, offset);
  let next = occurrenceOn(startOn, frequency, index);
  const dates: string[] = [];
  while (next && next < end) {
    if (next >= start) dates.push(next);
    next = occurrenceOn(startOn, frequency, ++index);
  }
  return dates;
}
