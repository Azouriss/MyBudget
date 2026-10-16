const pad = (value: number) => String(value).padStart(2, '0');

export function isISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year = 0, month = 0, day = 0] = value.split('-').map(Number);
  if (year < 1900 || year > 2099) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function currentMonth(): string {
  return localDateKey().slice(0, 7);
}

export function monthBounds(month: string): { start: string; end: string } {
  if (!isISODate(`${month}-01`)) throw new Error('Mois invalide.');
  const [year = 0, number = 0] = month.split('-').map(Number);
  const end = number === 12 ? `${year + 1}-01-01` : `${year}-${pad(number + 1)}-01`;
  return { start: `${month}-01`, end };
}

export function shiftMonth(month: string, offset: number): string {
  monthBounds(month);
  const [year = 0, number = 0] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, number - 1 + offset, 1));
  const result = `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}`;
  monthBounds(result);
  return result;
}

export function monthLabel(month: string): string {
  const { start } = monthBounds(month);
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${start}T12:00:00Z`));
}

export function displayDate(value: string): string {
  if (!isISODate(value)) throw new Error('Date invalide.');
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

export function parseFrenchDate(value: string): string {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value.trim())) throw new Error('Utilisez le format JJ/MM/AAAA.');
  const [day, month, year] = value.trim().split('/');
  const result = `${year}-${month}-${day}`;
  if (!isISODate(result)) throw new Error('Cette date n’existe pas (1900 à 2099).');
  return result;
}

export function shortDate(value: string): string {
  if (!isISODate(value)) throw new Error('Date invalide.');
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(`${value}T12:00:00Z`));
}
