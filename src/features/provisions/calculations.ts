import { z } from 'zod';
import { isISODate, shiftMonth } from '../../lib/dates';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { paydayOn } from '../payday/schedule';

export const provisionDraftSchema = z.object({
  label: z.string().trim().min(1, 'Donnez un nom à cet objectif.').max(80),
  targetCents: z.number().int().min(1).max(MAX_AMOUNT_CENTS),
  dueOn: z.string().refine(isISODate, 'Échéance invalide.'),
  contributionDay: z.number().int().min(1).max(31),
}).strict();
export type ProvisionDraft = z.infer<typeof provisionDraftSchema>;

export function provisionPlan(goal: ProvisionDraft, reservedCents: number, today: string) {
  provisionDraftSchema.parse({ label: goal.label, targetCents: goal.targetCents, dueOn: goal.dueOn, contributionDay: goal.contributionDay });
  if (!isISODate(today) || !Number.isSafeInteger(reservedCents) || reservedCents < 0 || reservedCents > goal.targetCents) {
    throw new Error('Provision invalide.');
  }
  let contributions = 0;
  for (let month = today.slice(0, 7); month <= goal.dueOn.slice(0, 7);) {
    const date = paydayOn(month, goal.contributionDay);
    if (date >= today && date <= goal.dueOn) contributions++;
    if (month === '2099-12') break;
    month = shiftMonth(month, 1);
  }
  const remainingCents = goal.targetCents - reservedCents;
  return { remainingCents, contributions, overdue: goal.dueOn < today && remainingCents > 0,
    monthlyCents: contributions > 0 ? Math.ceil(remainingCents / contributions) : null };
}
