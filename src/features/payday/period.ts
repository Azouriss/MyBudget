import type { AppDatabase } from '../../db/client';
import { isISODate, localDateKey, monthBounds, shiftMonth } from '../../lib/dates';
import { createPaydayRepository } from './repository';
import { paydayOn } from './schedule';

export type Period = { start: string; end: string };

export function createPeriodRepository(db: AppDatabase) {
  const payday = createPaydayRepository(db);
  return {
    forMonth(month: string): Period {
      const calendar = monthBounds(month);
      const day = payday.settings()?.day;
      if (!day) return calendar;
      // Recorded salary dates take precedence over the usual payday.
      const boundary = (m: string) => payday.salaryForMonth(m)?.occurredOn ?? paydayOn(m, day);
      return { start: boundary(month), end: month === '2099-12' ? calendar.end : boundary(shiftMonth(month, 1)) };
    },
    monthForDate(date = localDateKey()): string {
      if (!isISODate(date)) throw new Error('Date invalide.');
      const month = date.slice(0, 7);
      return date >= this.forMonth(month).start || month === '1900-01' ? month : shiftMonth(month, -1);
    },
  };
}
