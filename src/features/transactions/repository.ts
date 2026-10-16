import { and, asc, desc, eq, gte, lt } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import type { AppDatabase } from '../../db/client';
import { categories, transactions } from '../../db/schema';
import { monthBounds } from '../../lib/dates';
import { transactionDraftSchema } from './validation';
import type { Transaction, TransactionDraft } from './types';
import { createPaydayRepository } from '../payday/repository';
import { createRecurringRepository } from '../recurring/repository';
import { assertEditable, attachSplits } from '../entry-tools/repository';

export function createTransactionRepository(db: AppDatabase) {
  function validateCategory(draft: TransactionDraft) {
    const category = db.select().from(categories).where(eq(categories.id, draft.categoryId)).get();
    if (!category || category.kind !== draft.kind) throw new Error('Catégorie incompatible.');
  }

  return {
    categories: () => db.select().from(categories).orderBy(asc(categories.position)).all(),
    forMonth(month: string): Transaction[] {
      const { start, end } = monthBounds(month);
      return attachSplits(db, db.select().from(transactions)
        .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)))
        .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt), desc(transactions.id)).all());
    },
    withPlannedForMonth(month: string, today?: string): Transaction[] {
      return [...this.forMonth(month), ...createRecurringRepository(db).plannedForMonth(month, today)]
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    },
    find(id: string): Transaction | undefined {
      return db.select().from(transactions).where(eq(transactions.id, id)).get();
    },
    create(input: TransactionDraft): string {
      const draft = transactionDraftSchema.parse(input);
      validateCategory(draft);
      const now = Date.now();
      const id = randomUUID();
      db.insert(transactions).values({ ...draft, id, createdAt: now, updatedAt: now }).run();
      return id;
    },
    update(id: string, input: TransactionDraft) {
      const draft = transactionDraftSchema.parse(input);
      validateCategory(draft);
      assertEditable(db, id, draft);
      const result = db.update(transactions).set({ ...draft, updatedAt: Date.now() })
        .where(eq(transactions.id, id)).run();
      if (result.changes !== 1) throw new Error('Transaction introuvable.');
    },
    saveSalary(month: string, input: TransactionDraft): string {
      const draft = transactionDraftSchema.parse(input);
      monthBounds(month);
      if (draft.kind !== 'income' || draft.categoryId !== 'salary' || draft.occurredOn.slice(0, 7) !== month) {
        throw new Error('Le salaire doit appartenir au mois indiqué.');
      }
      validateCategory(draft);
      return db.transaction(() => {
        const existing = createPaydayRepository(db).salaryForMonth(month);
        const now = Date.now();
        if (existing) {
          db.update(transactions).set({ ...draft, updatedAt: now }).where(eq(transactions.id, existing.id)).run();
          return existing.id;
        }
        const id = randomUUID();
        db.insert(transactions).values({ ...draft, id, createdAt: now, updatedAt: now }).run();
        return id;
      });
    },
    remove(id: string) {
      const result = db.delete(transactions).where(eq(transactions.id, id)).run();
      if (result.changes !== 1) throw new Error('Transaction introuvable.');
    },
  };
}
