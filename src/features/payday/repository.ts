import { and, eq, gte, lt, asc } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { paydaySettings, transactions } from '../../db/schema';
import { monthBounds } from '../../lib/dates';

export function createPaydayRepository(db: AppDatabase) {
  return {
    settings: () => db.select().from(paydaySettings).where(eq(paydaySettings.id, 1)).get(),
    save(day: number, notificationsEnabled: boolean) {
      if (!Number.isInteger(day) || day < 1 || day > 31 || typeof notificationsEnabled !== 'boolean') throw new Error('Jour invalide.');
      db.insert(paydaySettings).values({ id: 1, day, notificationsEnabled })
        .onConflictDoUpdate({ target: paydaySettings.id, set: { day, notificationsEnabled } }).run();
    },
    remove: () => db.delete(paydaySettings).where(eq(paydaySettings.id, 1)).run(),
    salaryForMonth(month: string) {
      const { start, end } = monthBounds(month);
      return db.select().from(transactions).where(and(eq(transactions.kind, 'income'), eq(transactions.categoryId, 'salary'),
        gte(transactions.occurredOn, start), lt(transactions.occurredOn, end))).orderBy(asc(transactions.createdAt), asc(transactions.id)).get();
    },
    recordedMonths: () => new Set(db.select({ date: transactions.occurredOn }).from(transactions)
      .where(and(eq(transactions.kind, 'income'), eq(transactions.categoryId, 'salary'))).all().map((r) => r.date.slice(0, 7))),
  };
}
