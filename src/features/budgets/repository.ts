import { and, eq } from 'drizzle-orm';
import type { AppDatabase } from '../../db/client';
import { categories, categoryBudgets, monthlyBudgets } from '../../db/schema';
import { budgetDraftSchema, budgetMonthSchema } from './validation';

export function createBudgetRepository(db: AppDatabase) {
  function expenseCategory(categoryId: string) {
    const category = db.select().from(categories).where(eq(categories.id, categoryId)).get();
    if (category?.kind !== 'expense') throw new Error('Choisissez une catégorie de dépense.');
  }
  return {
    forMonth(input: string) {
      const month = budgetMonthSchema.parse(input);
      return {
        monthly: db.select().from(monthlyBudgets).where(eq(monthlyBudgets.month, month)).get(),
        categories: db.select().from(categoryBudgets).where(eq(categoryBudgets.month, month)).all(),
      };
    },
    setMonthly(input: { month: string; amountCents: number }) {
      const draft = budgetDraftSchema.parse(input);
      const now = Date.now();
      db.insert(monthlyBudgets).values({ ...draft, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: monthlyBudgets.month, set: { amountCents: draft.amountCents, updatedAt: now } }).run();
    },
    setCategory(input: { month: string; amountCents: number }, categoryId: string) {
      const draft = budgetDraftSchema.parse(input);
      expenseCategory(categoryId);
      const now = Date.now();
      db.insert(categoryBudgets).values({ ...draft, categoryId, createdAt: now, updatedAt: now })
        .onConflictDoUpdate({ target: [categoryBudgets.month, categoryBudgets.categoryId],
          set: { amountCents: draft.amountCents, updatedAt: now } }).run();
    },
    removeMonthly(input: string) {
      const month = budgetMonthSchema.parse(input);
      db.delete(monthlyBudgets).where(eq(monthlyBudgets.month, month)).run();
    },
    removeCategory(input: string, categoryId: string) {
      const month = budgetMonthSchema.parse(input);
      expenseCategory(categoryId);
      db.delete(categoryBudgets).where(and(eq(categoryBudgets.month, month), eq(categoryBudgets.categoryId, categoryId))).run();
    },
  };
}

export type MonthlyBudgets = ReturnType<ReturnType<typeof createBudgetRepository>['forMonth']>;
