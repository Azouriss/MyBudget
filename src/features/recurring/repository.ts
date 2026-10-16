import { asc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import type { AppDatabase } from '../../db/client';
import { categories, recurringExpenses, transactions } from '../../db/schema';
import { localDateKey, isISODate } from '../../lib/dates';
import { transactionDraftSchema } from '../transactions/validation';
import type { TransactionDraft } from '../transactions/types';
import { occurrenceOn, type Frequency } from './schedule';

export type RecurringExpense = typeof recurringExpenses.$inferSelect;
export function createRecurringRepository(db: AppDatabase) {
  return {
    all: () => db.select().from(recurringExpenses).orderBy(asc(recurringExpenses.label)).all(),
    find: (id: string) => db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get(),
    saveTransaction(input: TransactionDraft, frequency: Frequency, existingId?: string): string {
      const draft = transactionDraftSchema.parse(input);
      if (draft.kind !== 'expense') throw new Error('Une récurrence doit être une dépense.');
      occurrenceOn(draft.occurredOn, frequency, 0);
      const id = existingId ?? randomUUID();
      const ruleId = randomUUID();
      const now = Date.now();
      db.transaction((tx) => {
        const category = tx.select().from(categories).where(eq(categories.id, draft.categoryId)).get();
        if (category?.kind !== 'expense') throw new Error('Catégorie incompatible.');
        if (existingId) {
          const existing = tx.select().from(transactions).where(eq(transactions.id, existingId)).get();
          if (!existing || existing.recurringExpenseId) throw new Error('Transaction déjà liée ou absente.');
        }
        tx.insert(recurringExpenses).values({ id: ruleId, label: draft.label, amountCents: draft.amountCents,
          categoryId: draft.categoryId, frequency, startOn: draft.occurredOn, nextIndex: 1, active: true, createdAt: now, updatedAt: now }).run();
        const value = { ...draft, recurringExpenseId: ruleId, recurringOccurrenceOn: draft.occurredOn, updatedAt: now };
        if (existingId) tx.update(transactions).set(value).where(eq(transactions.id, existingId)).run();
        else tx.insert(transactions).values({ ...value, id, createdAt: now }).run();
      });
      return id;
    },
    update(id: string, input: TransactionDraft, frequency: Frequency, nextOn: string) {
      const draft = transactionDraftSchema.parse(input);
      if (draft.kind !== 'expense' || !isISODate(nextOn) || nextOn <= localDateKey()) throw new Error('Choisissez une prochaine date future.');
      occurrenceOn(nextOn, frequency, 0);
      db.transaction((tx) => {
        const category = tx.select().from(categories).where(eq(categories.id, draft.categoryId)).get();
        if (category?.kind !== 'expense') throw new Error('Catégorie incompatible.');
        const existing = tx.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get();
        if (!existing) throw new Error('Récurrence absente.');
        const keepAnchor = existing.active && existing.frequency === frequency
          && occurrenceOn(existing.startOn, frequency, existing.nextIndex) === nextOn;
        const result = tx.update(recurringExpenses).set({ label: draft.label, amountCents: draft.amountCents,
          categoryId: draft.categoryId, frequency, startOn: keepAnchor ? existing.startOn : nextOn,
          nextIndex: keepAnchor ? existing.nextIndex : 0, active: true, updatedAt: Date.now() })
          .where(eq(recurringExpenses.id, id)).run();
        if (result.changes !== 1) throw new Error('Récurrence absente.');
      });
    },
    stop(id: string) {
      const result = db.update(recurringExpenses).set({ active: false, updatedAt: Date.now() }).where(eq(recurringExpenses.id, id)).run();
      if (result.changes !== 1) throw new Error('Récurrence absente.');
    },
  };
}

// Each batch commits the expenses and the cursor together. A deleted occurrence stays deleted.
export function materializeDueExpenses(db: AppDatabase, today = localDateKey(), limit = 128): { count: number; more: boolean } {
  if (!isISODate(today) || !Number.isInteger(limit) || limit < 1) throw new Error('Date ou limite invalide.');
  return db.transaction((tx) => {
    let count = 0;
    let more = false;
    const now = Date.now();
    for (const rule of tx.select().from(recurringExpenses).where(eq(recurringExpenses.active, true)).all()) {
      let cursor = rule.nextIndex;
      let next = occurrenceOn(rule.startOn, rule.frequency, cursor);
      while (next && next <= today && count < limit) {
        tx.insert(transactions).values({ id: `${rule.id}:${next}`, kind: 'expense', amountCents: rule.amountCents,
          label: rule.label, categoryId: rule.categoryId, occurredOn: next, recurringExpenseId: rule.id,
          recurringOccurrenceOn: next, createdAt: now, updatedAt: now }).onConflictDoNothing().run();
        cursor += 1;
        count += 1;
        next = occurrenceOn(rule.startOn, rule.frequency, cursor);
      }
      tx.update(recurringExpenses).set({ nextIndex: cursor, active: next !== null, updatedAt: now }).where(eq(recurringExpenses.id, rule.id)).run();
      more ||= next !== null && next <= today;
    }
    return { count, more };
  });
}

export async function catchUpExpenses(db: AppDatabase): Promise<number> {
  let total = 0;
  let batch;
  do {
    batch = materializeDueExpenses(db);
    total += batch.count;
    if (batch.more) await new Promise((resolve) => setTimeout(resolve, 0));
  } while (batch.more);
  return total;
}
