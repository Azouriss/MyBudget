import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import type { AppDatabase } from '../../db/client';
import { reimbursementReceipts } from '../../db/planningSchema';
import { categories, recurringExpenses, recurringIncomes, transactions } from '../../db/schema';
import { localDateKey, isISODate, monthBounds, shiftMonth } from '../../lib/dates';
import { transactionDraftSchema } from '../transactions/validation';
import { recurringId, type Transaction, type TransactionDraft } from '../transactions/types';
import { occurrenceOn, occurrencesForMonth, type Frequency } from './schedule';
import { assertEditable } from '../entry-tools/repository';
import type { Period } from '../payday/period';

export type RecurringExpense = typeof recurringExpenses.$inferSelect;

export function recurrenceFields(rule: RecurringExpense, date: string) {
  return rule.categoryKind === 'income'
    ? { recurringIncomeId: rule.id, recurringIncomeOn: date }
    : { recurringExpenseId: rule.id, recurringOccurrenceOn: date };
}

export function createRecurringRepository(db: AppDatabase) {
  const tableFor = (kind: string) => kind === 'income' ? recurringIncomes : recurringExpenses;
  function validate(draft: TransactionDraft) {
    const category = db.select().from(categories).where(eq(categories.id, draft.categoryId)).get();
    if (category?.kind !== draft.kind) throw new Error('Catégorie incompatible.');
    if (draft.categoryId === 'reimbursements') throw new Error('Enregistrez le remboursement reçu depuis la dépense d’origine.');
  }
  return {
    all(): RecurringExpense[] {
      return [...db.select().from(recurringExpenses).all(), ...db.select().from(recurringIncomes).all()]
        .sort((a, b) => a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    },
    find(id: string): RecurringExpense | undefined {
      return db.select().from(recurringExpenses).where(eq(recurringExpenses.id, id)).get()
        ?? db.select().from(recurringIncomes).where(eq(recurringIncomes.id, id)).get();
    },
    plannedInPeriod({ start, end }: Period, today = localDateKey()): Transaction[] {
      if (!isISODate(today) || !isISODate(start) || end <= start) throw new Error('Date invalide.');
      const recorded = db.select().from(transactions).all();
      const existing = new Set(recorded.map((item) => `${recurringId(item)}:${item.recurringOccurrenceOn ?? item.recurringIncomeOn}`));
      const result: Transaction[] = [];
      const rules = this.all().filter((rule) => rule.active);
      for (let month = start.slice(0, 7); `${month}-01` < end;) {
        for (const rule of rules) {
          for (const date of occurrencesForMonth(rule.startOn, rule.frequency, rule.nextIndex, month)) {
            if (date < start || date >= end || date <= today || existing.has(`${rule.id}:${date}`)) continue;
            result.push({ id: `planned:${rule.id}:${date}`, kind: rule.categoryKind as 'expense' | 'income',
              label: rule.label, amountCents: rule.amountCents, categoryId: rule.categoryId, subcategoryId: rule.subcategoryId,
              occurredOn: date, ...recurrenceFields(rule, date), createdAt: rule.createdAt, updatedAt: rule.updatedAt, isPlanned: true });
          }
        }
        if (month === '2099-12') break;
        month = shiftMonth(month, 1);
      }
      return result;
    },
    plannedForMonth(month: string, today = localDateKey()): Transaction[] {
      const period = monthBounds(month);
      if (!isISODate(today)) throw new Error('Date invalide.');
      return month <= today.slice(0, 7) ? [] : this.plannedInPeriod(period, today);
    },
    saveTransaction(input: TransactionDraft, frequency: Frequency, existingId?: string): string {
      const draft = transactionDraftSchema.parse(input);
      validate(draft);
      occurrenceOn(draft.occurredOn, frequency, 0);
      const id = existingId ?? randomUUID(), ruleId = randomUUID(), now = Date.now();
      db.transaction((tx) => {
        if (existingId) {
          const existing = tx.select().from(transactions).where(eq(transactions.id, existingId)).get();
          if (!existing || recurringId(existing) || tx.select().from(reimbursementReceipts).where(eq(reimbursementReceipts.incomeId, existingId)).get()) throw new Error('Transaction déjà liée ou absente.');
          assertEditable(db, existingId, draft);
        }
        const rule = { id: ruleId, label: draft.label, amountCents: draft.amountCents,
          categoryId: draft.categoryId, categoryKind: draft.kind, subcategoryId: draft.subcategoryId, frequency,
          startOn: draft.occurredOn, nextIndex: 1, active: true, createdAt: now, updatedAt: now };
        tx.insert(tableFor(draft.kind)).values(rule).run();
        const value = { ...draft, ...recurrenceFields(rule, draft.occurredOn), updatedAt: now };
        if (existingId) tx.update(transactions).set(value).where(eq(transactions.id, existingId)).run();
        else tx.insert(transactions).values({ ...value, id, createdAt: now }).run();
      });
      return id;
    },
    update(id: string, input: TransactionDraft, frequency: Frequency, nextOn: string) {
      const draft = transactionDraftSchema.parse(input);
      if (!isISODate(nextOn) || nextOn <= localDateKey()) throw new Error('Choisissez une prochaine date future.');
      validate(draft);
      occurrenceOn(nextOn, frequency, 0);
      db.transaction((tx) => {
        const existing = this.find(id);
        if (!existing || existing.categoryKind !== draft.kind) throw new Error('Récurrence absente ou incompatible.');
        const keepAnchor = existing.active && existing.frequency === frequency
          && occurrenceOn(existing.startOn, frequency, existing.nextIndex) === nextOn;
        const table = tableFor(existing.categoryKind);
        tx.update(table).set({ label: draft.label, amountCents: draft.amountCents, categoryId: draft.categoryId,
          subcategoryId: draft.subcategoryId, frequency, startOn: keepAnchor ? existing.startOn : nextOn,
          nextIndex: keepAnchor ? existing.nextIndex : 0, active: true, updatedAt: Date.now() }).where(eq(table.id, id)).run();
      });
    },
    stop(id: string) {
      const rule = this.find(id);
      if (!rule) throw new Error('Récurrence absente.');
      const table = tableFor(rule.categoryKind);
      db.update(table).set({ active: false, updatedAt: Date.now() }).where(eq(table.id, id)).run();
    },
  };
}

// Each batch commits due entries and cursors together. Deleted occurrences stay deleted.
export function materializeDueExpenses(db: AppDatabase, today = localDateKey(), limit = 128): { count: number; more: boolean } {
  if (!isISODate(today) || !Number.isInteger(limit) || limit < 1) throw new Error('Date ou limite invalide.');
  return db.transaction((tx) => {
    let count = 0, more = false;
    const now = Date.now();
    for (const rule of createRecurringRepository(db).all().filter((r) => r.active)) {
      let cursor = rule.nextIndex;
      let next = occurrenceOn(rule.startOn, rule.frequency, cursor);
      while (next && next <= today && count < limit) {
        tx.insert(transactions).values({ id: `${rule.id}:${next}`, kind: rule.categoryKind as 'expense' | 'income',
          amountCents: rule.amountCents, label: rule.label, categoryId: rule.categoryId, subcategoryId: rule.subcategoryId,
          occurredOn: next, ...recurrenceFields(rule, next), createdAt: now, updatedAt: now }).onConflictDoNothing().run();
        cursor += 1; count += 1;
        next = occurrenceOn(rule.startOn, rule.frequency, cursor);
      }
      const table = rule.categoryKind === 'income' ? recurringIncomes : recurringExpenses;
      tx.update(table).set({ nextIndex: cursor, active: next !== null, updatedAt: now }).where(eq(table.id, rule.id)).run();
      more ||= next !== null && next <= today;
    }
    return { count, more };
  });
}

export async function catchUpExpenses(db: AppDatabase): Promise<number> {
  let total = 0, batch;
  do {
    batch = materializeDueExpenses(db);
    total += batch.count;
    if (batch.more) await new Promise((resolve) => setTimeout(resolve, 0));
  } while (batch.more);
  return total;
}
