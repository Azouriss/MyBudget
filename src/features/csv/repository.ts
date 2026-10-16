import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import { categories, transactions } from '../../db/schema';
import { importRecords, importRules } from '../../db/planningSchema';
import { transactionDraftSchema } from '../transactions/validation';
import { normalizeLabel, type CsvPreview } from './parser';

export function createImportRepository(db: AppDatabase) {
  return {
    rules: () => db.select().from(importRules).all(),
    saveRule(pattern: string, categoryId: string) {
      const text = z.string().trim().min(1).max(80).parse(pattern);
      const category = db.select().from(categories).where(eq(categories.id, categoryId)).get();
      if (!category) throw new Error('Catégorie absente.');
      db.insert(importRules).values({ id: randomUUID(), pattern: text, categoryId, kind: category.kind }).run();
    },
    removeRule(id: string) { db.delete(importRules).where(eq(importRules.id, id)).run(); },
    review(preview: CsvPreview[]) {
      const known = new Set(db.select().from(importRecords).all().map((r) => r.fingerprint));
      const entries = db.select().from(transactions).all();
      return preview.map((row) => ({ ...row,
        imported: !!row.fingerprint && known.has(row.fingerprint),
        possibleDuplicate: !!row.draft && entries.some((e) => e.kind === row.draft!.kind && e.amountCents === row.draft!.amountCents && e.occurredOn === row.draft!.occurredOn),
        labelMatch: !!row.draft && entries.some((e) => e.occurredOn === row.draft!.occurredOn && normalizeLabel(e.label) === normalizeLabel(row.draft!.label)),
      }));
    },
    commit(rows: CsvPreview[]) {
      if (!rows.length || rows.length > 1000) throw new Error('Sélectionnez de 1 à 1 000 opérations.');
      return db.transaction(() => {
        for (const row of rows) {
          if (!row.draft || !row.fingerprint || row.error) throw new Error('Ligne invalide.');
          const draft = transactionDraftSchema.parse(row.draft);
          if (db.select().from(categories).where(eq(categories.id, draft.categoryId)).get()?.kind !== draft.kind) throw new Error('Catégorie incompatible.');
          if (db.select().from(importRecords).where(eq(importRecords.fingerprint, row.fingerprint)).get()) throw new Error('Une ligne a déjà été importée. Recréez l’aperçu.');
          const id = randomUUID(), now = Date.now();
          db.insert(transactions).values({ ...draft, id, createdAt: now, updatedAt: now }).run();
          db.insert(importRecords).values({ id: randomUUID(), fingerprint: row.fingerprint, transactionId: id }).run();
        }
        return rows.length;
      });
    },
  };
}
