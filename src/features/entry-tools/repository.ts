import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import { categories, transactions } from '../../db/schema';
import { reimbursementClaims, reimbursementReceipts, transactionSplits, transactionTemplates } from '../../db/planningSchema';
import { transactionDraftSchema } from '../transactions/validation';
import type { Transaction, TransactionDraft } from '../transactions/types';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { isISODate, localDateKey } from '../../lib/dates';

const cents = z.number().int().positive().max(MAX_AMOUNT_CENTS);
export const splitSchema = z.array(z.object({ categoryId: z.string().min(1), amountCents: cents }).strict()).min(2).max(20);

export function attachSplits(db: AppDatabase, entries: Transaction[]): Transaction[] {
  const parts = db.select().from(transactionSplits).all();
  const byId = new Map<string, typeof parts>();
  for (const part of parts) byId.set(part.transactionId, [...(byId.get(part.transactionId) ?? []), part]);
  return entries.map((entry) => ({ ...entry, splits: byId.get(entry.id) }));
}

export function assertEditable(db: AppDatabase, id: string, draft: TransactionDraft) {
  const previous = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!previous) throw new Error('Transaction absente.');
  const linked = db.select().from(reimbursementClaims).where(eq(reimbursementClaims.expenseId, id)).get()
    || db.select().from(reimbursementReceipts).where(eq(reimbursementReceipts.incomeId, id)).get()
    || db.select().from(transactionSplits).where(eq(transactionSplits.transactionId, id)).get();
  if (linked && (draft.amountCents !== previous.amountCents || draft.kind !== previous.kind || draft.occurredOn !== previous.occurredOn)) {
    throw new Error('Retirez d’abord la répartition ou le suivi de remboursement avant de modifier le montant, le type ou la date.');
  }
}

export function createEntryToolsRepository(db: AppDatabase) {
  function expense(id: string) {
    const entry = db.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!entry || entry.kind !== 'expense') throw new Error('Choisissez une dépense enregistrée.');
    return entry;
  }
  return {
    templates: () => db.select().from(transactionTemplates).all(),
    saveTemplate(input: TransactionDraft) {
      const draft = transactionDraftSchema.parse(input);
      if (db.select().from(categories).where(eq(categories.id, draft.categoryId)).get()?.kind !== draft.kind) throw new Error('Catégorie incompatible.');
      if (db.select().from(transactionTemplates).all().length >= 30) throw new Error('Limite de 30 favoris atteinte.');
      const { occurredOn: _, ...template } = draft;
      db.insert(transactionTemplates).values({ ...template, id: randomUUID() }).run();
    },
    removeTemplate(id: string) { db.delete(transactionTemplates).where(eq(transactionTemplates.id, id)).run(); },
    splits: (id: string) => db.select().from(transactionSplits).where(eq(transactionSplits.transactionId, id)).all(),
    split(id: string, input: z.input<typeof splitSchema>) {
      const parts = splitSchema.parse(input);
      db.transaction(() => {
        const entry = expense(id);
        if (parts.reduce((sum, part) => sum + part.amountCents, 0) !== entry.amountCents) throw new Error('La répartition doit correspondre exactement au total.');
        for (const part of parts) if (db.select().from(categories).where(eq(categories.id, part.categoryId)).get()?.kind !== 'expense') throw new Error('Catégorie incompatible.');
        db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id)).run();
        for (const part of parts) db.insert(transactionSplits).values({ ...part, transactionId: id, id: randomUUID() }).run();
      });
    },
    clearSplits(id: string) { db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id)).run(); },
    claims() {
      const entries = db.select().from(transactions).all();
      const byId = new Map(entries.map((entry) => [entry.id, entry]));
      const receipts = db.select().from(reimbursementReceipts).all();
      return db.select().from(reimbursementClaims).all().map((claim) => {
        const received = receipts.filter((r) => r.expenseId === claim.expenseId).map((r) => byId.get(r.incomeId)!);
        const receivedCents = received.reduce((sum, r) => sum + r.amountCents, 0);
        return { ...claim, expense: byId.get(claim.expenseId)!, received, receivedCents,
          outstandingCents: claim.expectedCents - receivedCents };
      });
    },
    claim(expenseId: string, expectedCents: number, label: string) {
      const draft = z.object({ expectedCents: cents, label: z.string().trim().min(1).max(80) }).parse({ expectedCents, label });
      db.transaction(() => {
        const entry = expense(expenseId);
        if (draft.expectedCents > entry.amountCents) throw new Error('Le remboursement attendu dépasse la dépense.');
        const received = this.claims().find((c) => c.expenseId === expenseId)?.receivedCents ?? 0;
        if (draft.expectedCents < received) throw new Error('Le montant attendu est inférieur aux remboursements reçus.');
        db.insert(reimbursementClaims).values({ expenseId, ...draft })
          .onConflictDoUpdate({ target: reimbursementClaims.expenseId, set: draft }).run();
      });
    },
    receive(expenseId: string, amountCents: number, occurredOn: string) {
      cents.parse(amountCents);
      if (!isISODate(occurredOn) || occurredOn > localDateKey()) throw new Error('Choisissez la date réelle du remboursement reçu.');
      db.transaction(() => {
        const claim = this.claims().find((c) => c.expenseId === expenseId);
        if (!claim || amountCents > claim.outstandingCents) throw new Error('Ce montant dépasse le remboursement restant.');
        if (occurredOn < claim.expense.occurredOn) throw new Error('Le remboursement précède la dépense.');
        const id = randomUUID(), now = Date.now();
        db.insert(transactions).values({ id, kind: 'income', label: `Remboursement · ${claim.label}`.slice(0, 80),
          categoryId: 'other-income', amountCents, occurredOn, createdAt: now, updatedAt: now }).run();
        db.insert(reimbursementReceipts).values({ incomeId: id, expenseId }).run();
      });
    },
    cancelReceipt(incomeId: string) {
      db.transaction(() => {
        if (!db.select().from(reimbursementReceipts).where(eq(reimbursementReceipts.incomeId, incomeId)).get()) throw new Error('Remboursement absent.');
        db.delete(reimbursementReceipts).where(eq(reimbursementReceipts.incomeId, incomeId)).run();
        db.delete(transactions).where(eq(transactions.id, incomeId)).run();
      });
    },
    removeClaim(expenseId: string) {
      // Received income remains in the ledger; removing tracking never invents a cash movement.
      db.transaction(() => {
        db.delete(reimbursementReceipts).where(eq(reimbursementReceipts.expenseId, expenseId)).run();
        db.delete(reimbursementClaims).where(eq(reimbursementClaims.expenseId, expenseId)).run();
      });
    },
  };
}
