import type { Transaction } from '../features/transactions/types';
import { getExpenseSubcategory } from '../features/categories/subcategories';
import { expenseByCategory } from './finance';

export type ExpenseCategoryBreakdown = {
  categoryId: string; amountCents: number;
  children: { subcategoryId: string | null; amountCents: number }[];
};

/** Read-only breakdown of recorded gross purchases; splits have no stored subcategory. */
export function expenseHierarchy(entries: readonly Transaction[], bounds: { start: string; end: string }): ExpenseCategoryBreakdown[] {
  const purchases = entries.filter((entry) => entry.kind === 'expense' && !entry.isPlanned
    && entry.occurredOn >= bounds.start && entry.occurredOn < bounds.end);
  // Reuse validated cent arithmetic and the existing category-split contract.
  const categories = expenseByCategory(purchases, false);
  const children = new Map<string, Map<string | null, number>>();
  for (const entry of purchases) {
    const split = !!entry.splits?.length;
    const parts = split ? entry.splits! : [{ categoryId: entry.categoryId, amountCents: entry.amountCents }];
    for (const part of parts) {
      const subcategory = !split ? getExpenseSubcategory(entry.subcategoryId) : undefined;
      const key = subcategory?.categoryId === part.categoryId ? subcategory.id : null;
      const group = children.get(part.categoryId) ?? new Map<string | null, number>();
      const amount = (group.get(key) ?? 0) + part.amountCents;
      if (!Number.isSafeInteger(amount)) throw new Error('Total hors limites.');
      group.set(key, amount); children.set(part.categoryId, group);
    }
  }
  return categories.map((category) => ({ ...category,
    children: [...children.get(category.categoryId)!].map(([subcategoryId, amountCents]) => ({ subcategoryId, amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents || (a.subcategoryId ?? '').localeCompare(b.subcategoryId ?? '')),
  }));
}
