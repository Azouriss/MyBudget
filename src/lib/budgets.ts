export function budgetProgress(spentCents: number, limitCents: number) {
  if (!Number.isSafeInteger(spentCents) || spentCents < 0
    || !Number.isSafeInteger(limitCents) || limitCents < 0) {
    throw new Error('Montants de budget invalides.');
  }
  const ratio = limitCents === 0 ? (spentCents === 0 ? 0 : 1) : spentCents / limitCents;
  return {
    ratio, percent: limitCents === 0 ? null : Math.round(ratio * 100),
    remainingCents: limitCents - spentCents,
    exceeded: spentCents > limitCents,
    nearLimit: ratio >= 0.8,
  };
}

export function budgetEnvelopeExcess(current: {
  monthly?: { amountCents: number };
  categories: readonly { categoryId: string; amountCents: number }[];
}, proposed: { amountCents: number; categoryId?: string }): number {
  const limit = proposed.categoryId ? current.monthly?.amountCents : proposed.amountCents;
  if (limit === undefined) return 0;
  let categoryTotal = current.categories.reduce((sum, item) => sum
    + (item.categoryId === proposed.categoryId ? proposed.amountCents : item.amountCents), 0);
  if (proposed.categoryId && !current.categories.some((item) => item.categoryId === proposed.categoryId)) categoryTotal += proposed.amountCents;
  if (!Number.isSafeInteger(categoryTotal)) throw new Error('Total des budgets hors limites.');
  return Math.max(0, categoryTotal - limit);
}
