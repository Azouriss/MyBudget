import type { ExpenseCategoryBreakdown } from './expenseHierarchy';

/** A short display-only breakdown; the remainder retains every omitted cent. */
export function expensePreview(group: ExpenseCategoryBreakdown, maxRows = 4) {
  if (!Number.isInteger(maxRows) || maxRows < 2) throw new Error('Aperçu invalide.');
  if (!Number.isSafeInteger(group.amountCents) || group.amountCents < 0
    || group.children.some(child => !Number.isSafeInteger(child.amountCents) || child.amountCents < 0)
    || new Set(group.children.map(child => child.subcategoryId)).size !== group.children.length
    || group.children.reduce((sum, child) => sum + child.amountCents, 0) !== group.amountCents) {
    throw new Error('Répartition incohérente.');
  }
  const children = group.children.filter(child => child.amountCents > 0);
  const visible = children.length > maxRows ? children.slice(0, maxRows - 1) : children;
  const rows = visible.map(child => ({ ...child, categoryId: child.subcategoryId ?? 'unspecified', remainingCount: 0 }));
  if (visible.length < children.length) {
    const remaining = children.slice(visible.length);
    rows.push({ categoryId: 'preview:remaining', subcategoryId: null,
      amountCents: remaining.reduce((sum, child) => sum + child.amountCents, 0), remainingCount: remaining.length });
  }
  return rows;
}
