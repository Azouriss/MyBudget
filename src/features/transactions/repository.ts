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
import { createPeriodRepository } from '../payday/period';

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
    forBudgetMonth(month: string): Transaction[] {
      const { start, end } = createPeriodRepository(db).forMonth(month);
      return attachSplits(db, db.select().from(transactions)
        .where(and(gte(transactions.occurredOn, start), lt(transactions.occurredOn, end)))
        .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt), desc(transactions.id)).all());
    },
    withPlannedForBudgetMonth(month: string, today?: string): Transaction[] {
      const periods = createPeriodRepository(db);
      const planned = month > periods.monthForDate(today)
        ? createRecurringRepository(db).plannedInPeriod(periods.forMonth(month), today) : [];
      return [...this.forBudgetMonth(month), ...planned]
        .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn) || b.createdAt - a.createdAt || b.id.localeCompare(a.id));
    },
    find(id: string): Transaction | undefined {
      const entry = db.select().from(transactions).where(eq(transactions.id, id)).get();
      return entry ? attachSplits(db, [entry])[0] : undefined;
    },
    create(input: TransactionDraft): string {
      const draft = transactionDraftSchema.parse(input);
      validateCategory(draft);
      if (draft.categoryId === 'reimbursements') throw new Error('Enregistrez le remboursement reçu depuis la dépense d’origine.');
      const now = Date.now();
      const id = randomUUID();
      db.insert(transactions).values({ ...draft, id, createdAt: now, updatedAt: now }).run();
      return id;
    },
    update(id: string, input: TransactionDraft) {
      const draft = transactionDraftSchema.parse(input);
      validateCategory(draft);
      assertEditable(db, id, draft);
      const previous = this.find(id);
      if (previous?.reimbursement && draft.categoryId !== previous.categoryId) throw new Error('La catégorie du remboursement lié est conservée.');
      if (!previous?.reimbursement && draft.categoryId === 'reimbursements') throw new Error('Reliez le remboursement à la dépense d’origine.');
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
          assertEditable(db, existing.id, draft);
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
