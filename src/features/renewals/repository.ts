import { eq } from 'drizzle-orm';
import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import { renewals } from '../../db/planningSchema';
import { isISODate } from '../../lib/dates';
import { MAX_AMOUNT_CENTS } from '../../lib/money';

export const renewalSchema = z.object({ label: z.string().trim().min(1).max(80),
  dueOn: z.string().refine(isISODate), cancelBy: z.string().refine(isISODate),
  remindDays: z.number().int().min(0).max(90), amountCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS),
  notificationsEnabled: z.boolean(),
}).strict().refine((r) => r.cancelBy <= r.dueOn, 'La date limite doit précéder le renouvellement.');
export function createRenewalRepository(db: AppDatabase) {
  return {
    all: () => db.select().from(renewals).all().sort((a, b) => a.cancelBy.localeCompare(b.cancelBy)),
    save(input: z.input<typeof renewalSchema>, id?: string) {
      const draft = renewalSchema.parse(input);
      if (id) { if (db.update(renewals).set(draft).where(eq(renewals.id, id)).run().changes !== 1) throw new Error('Renouvellement absent.'); }
      else db.insert(renewals).values({ ...draft, id: randomUUID() }).run();
    },
    remove(id: string) { db.delete(renewals).where(eq(renewals.id, id)).run(); },
  };
}
export const RENEWAL_PREFIX = 'mybudget-renewal:';
export function renewalReminder(row: typeof renewals.$inferSelect, now = new Date()) {
  const [y = 0, m = 0, d = 0] = row.cancelBy.split('-').map(Number);
  const timestamp = new Date(y, m - 1, d - row.remindDays, 9).getTime();
  return row.notificationsEnabled && timestamp > now.getTime()
    ? { identifier: `${RENEWAL_PREFIX}${row.id}`, timestamp } : null;
}
