import { z } from 'zod';
import { isISODate, parseFrenchDate } from '../../lib/dates';
import { MAX_AMOUNT_CENTS, parseAmountToCents } from '../../lib/money';
import { isValidExpenseSubcategory } from '../categories/subcategories';

const subcategoryError = { path: ['subcategoryId'], message: 'Choisissez une sous-catégorie de cette catégorie.' };

export const transactionDraftSchema = z.object({
  kind: z.enum(['expense', 'income']),
  amountCents: z.number().int().positive().max(MAX_AMOUNT_CENTS),
  label: z.string().trim().min(1).max(80),
  categoryId: z.string().min(1).max(64),
  subcategoryId: z.string().min(1).max(64).nullable().optional().default(null),
  occurredOn: z.string().refine(isISODate),
}).strict().refine(isValidExpenseSubcategory, subcategoryError);

export const transactionFormSchema = z.object({
  kind: z.enum(['expense', 'income']),
  amount: z.string().superRefine((value, ctx) => {
    try { parseAmountToCents(value); }
    catch (error) {
      ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Montant invalide.' });
    }
  }),
  label: z.string().trim().min(1, 'Ajoutez un libellé.').max(80, '80 caractères maximum.'),
  categoryId: z.string().min(1, 'Choisissez une catégorie.'),
  subcategoryId: z.string().min(1).max(64).nullable().optional(),
  date: z.string().superRefine((value, ctx) => {
    try { parseFrenchDate(value); }
    catch (error) {
      ctx.addIssue({ code: 'custom', message: error instanceof Error ? error.message : 'Date invalide.' });
    }
  }),
}).refine(isValidExpenseSubcategory, subcategoryError);

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export function formToDraft(values: TransactionFormValues) {
  const valid = transactionFormSchema.parse(values);
  return transactionDraftSchema.parse({
    kind: valid.kind,
    amountCents: parseAmountToCents(valid.amount),
    label: valid.label,
    categoryId: valid.categoryId,
    subcategoryId: valid.subcategoryId ?? null,
    occurredOn: parseFrenchDate(valid.date),
  });
}
