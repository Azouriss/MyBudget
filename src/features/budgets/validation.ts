import { z } from 'zod';
import { monthBounds } from '../../lib/dates';
import { MAX_AMOUNT_CENTS, parseAmountToCents } from '../../lib/money';

export const budgetMonthSchema = z.string().refine((value) => {
  try { monthBounds(value); return true; } catch { return false; }
}, 'Mois invalide.');

export const budgetDraftSchema = z.object({
  month: budgetMonthSchema,
  amountCents: z.number().int().nonnegative().max(MAX_AMOUNT_CENTS),
}).strict();

export function parseBudgetAmount(value: string): number {
  if (/^0{1,7}(?:[.,]0{1,2})?$/.test(value.trim())) return 0;
  try { return parseAmountToCents(value); }
  catch { throw new Error('Saisissez un budget entre 0,00 et 9 999 999,99 €, avec au plus deux décimales.'); }
}
