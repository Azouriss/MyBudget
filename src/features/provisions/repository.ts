import { asc, desc, eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import { provisionGoals, provisionMovements } from '../../db/schema';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { sumCents } from '../forecast/calculations';
import { provisionDraftSchema, type ProvisionDraft } from './calculations';

export function createProvisionRepository(db: AppDatabase) {
  function movements(goalId: string) {
    return db.select().from(provisionMovements).where(eq(provisionMovements.goalId, goalId))
      .orderBy(desc(provisionMovements.createdAt), desc(provisionMovements.id)).all();
  }
  function reserved(goalId: string) { return sumCents(movements(goalId).map((entry) => entry.amountCents)); }
  function find(id: string) {
    const goal = db.select().from(provisionGoals).where(eq(provisionGoals.id, id)).get();
    return goal ? { ...goal, reservedCents: reserved(id) } : undefined;
  }
  return {
    find, movements,
    all: () => db.select().from(provisionGoals).orderBy(asc(provisionGoals.dueOn), asc(provisionGoals.label)).all()
      .map((goal) => ({ ...goal, reservedCents: reserved(goal.id) })),
    save(input: ProvisionDraft, id?: string) {
      const draft = provisionDraftSchema.parse(input);
      const now = Date.now();
      const goalId = id ?? randomUUID();
      db.transaction(() => {
        if (id) {
          const existing = find(id);
          if (!existing) throw new Error('Objectif introuvable.');
          if (existing.reservedCents > draft.targetCents) throw new Error('Libérez la réserve excédentaire avant de réduire cet objectif.');
          db.update(provisionGoals).set({ ...draft, updatedAt: now }).where(eq(provisionGoals.id, id)).run();
        } else db.insert(provisionGoals).values({ ...draft, id: goalId, createdAt: now, updatedAt: now }).run();
      });
      return goalId;
    },
    move(goalId: string, amountCents: number) {
      z.number().int().min(-MAX_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS).refine((value) => value !== 0).parse(amountCents);
      db.transaction(() => {
        const goal = find(goalId);
        if (!goal) throw new Error('Objectif introuvable.');
        const next = sumCents([goal.reservedCents, amountCents]);
        if (next < 0) throw new Error('Le montant dépasse la réserve actuelle.');
        if (next > goal.targetCents) throw new Error('Le montant dépasse ce qu’il reste à réserver.');
        const now = Date.now();
        db.insert(provisionMovements).values({ id: randomUUID(), goalId, amountCents, createdAt: now }).run();
        db.update(provisionGoals).set({ updatedAt: now }).where(eq(provisionGoals.id, goalId)).run();
      });
    },
    remove(id: string) {
      const result = db.delete(provisionGoals).where(eq(provisionGoals.id, id)).run();
      if (result.changes !== 1) throw new Error('Objectif introuvable.');
    },
  };
}
