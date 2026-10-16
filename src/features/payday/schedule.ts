import { monthBounds, localDateKey, shiftMonth } from '../../lib/dates';

export function paydayOn(month: string, day: number): string {
  monthBounds(month);
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('Jour de paie invalide.');
  const [year = 0, m = 0] = month.split('-').map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, '0')}`;
}

export type PlannedReminder = { identifier: string; month: string; timestamp: number };
export const REMINDER_PREFIX = 'mon-budget-salary:';
export function planSalaryReminders(day: number, recordedMonths: Set<string>, now = new Date()): PlannedReminder[] {
  const result: PlannedReminder[] = [];
  const current = localDateKey(now).slice(0, 7);
  for (let i = 0; i < 12; i++) {
    let month: string;
    try { month = shiftMonth(current, i); } catch { break; }
    if (recordedMonths.has(month)) continue;
    const [year = 0, m = 0, d = 0] = paydayOn(month, day).split('-').map(Number);
    const date = new Date(year, m - 1, d, 9, 0, 0, 0);
    const timestamp = date.getTime();
    if (timestamp <= now.getTime()) continue;
    result.push({ identifier: `${REMINDER_PREFIX}${month}`, month, timestamp });
  }
  return result;
}
