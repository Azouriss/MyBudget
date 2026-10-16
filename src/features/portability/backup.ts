import { sql } from 'drizzle-orm';
import { z } from 'zod';
import type { AppDatabase } from '../../db/client';
import journal from '../../db/migrations/meta/_journal.json';
import { isISODate } from '../../lib/dates';
import { MAX_AMOUNT_CENTS } from '../../lib/money';
import { defaultCategories } from '../categories/defaults';
import { transactionDraftSchema } from '../transactions/validation';
import { isValidExpenseSubcategory } from '../categories/subcategories';
import { MAX_FILE_BYTES, utf8Bytes } from '../csv/parser';

const id = z.string().min(1).max(160), label = z.string().trim().min(1).max(80);
const cents = z.number().int().min(1).max(MAX_AMOUNT_CENTS), zeroCents = z.number().int().min(0).max(MAX_AMOUNT_CENTS);
const date = z.string().refine(isISODate), timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const month = z.string().refine((s) => isISODate(`${s}-01`));
const kind = z.enum(['expense', 'income']), flag = z.union([z.literal(0), z.literal(1)]);
const times = { created_at: timestamp, updated_at: timestamp };
const schemas = {
  categories: z.object({ id, label, kind, color: z.string().regex(/^#[0-9a-fA-F]{6}$/), icon: z.string().min(1).max(40), position: z.number().int().min(0).max(10000) }).strict(),
  recurring_expenses: z.object({ id, label, amount_cents: cents, category_id: id, subcategory_id: id.nullable(), category_kind: z.literal('expense'),
    frequency: z.enum(['weekly', 'monthly', 'yearly']), start_on: date, next_index: z.number().int().min(0).max(100000), active: flag, ...times }).strict(),
  transactions: z.object({ id, kind, amount_cents: cents, label, category_id: id, subcategory_id: id.nullable(), occurred_on: date,
    recurring_expense_id: id.nullable(), recurring_occurrence_on: date.nullable(), ...times }).strict(),
  monthly_budgets: z.object({ month, amount_cents: zeroCents, ...times }).strict(),
  category_budgets: z.object({ month, category_id: id, category_kind: z.literal('expense'), amount_cents: zeroCents, ...times }).strict(),
  payday_settings: z.object({ id: z.literal(1), day: z.number().int().min(1).max(31), notifications_enabled: flag }).strict(),
  provision_goals: z.object({ id, label, target_cents: cents, due_on: date, contribution_day: z.number().int().min(1).max(31), ...times }).strict(),
  provision_movements: z.object({ id, goal_id: id, amount_cents: z.number().int().min(-MAX_AMOUNT_CENTS).max(MAX_AMOUNT_CENTS).refine((n) => n !== 0), created_at: timestamp }).strict(),
  transaction_templates: z.object({ id, label, kind, amount_cents: cents, category_id: id, subcategory_id: id.nullable() }).strict(),
  transaction_splits: z.object({ id, transaction_id: id, category_id: id, amount_cents: cents }).strict(),
  reimbursement_claims: z.object({ expense_id: id, expected_cents: cents, label }).strict(),
  reimbursement_receipts: z.object({ income_id: id, expense_id: id }).strict(),
  pay_cycles: z.object({ id, start_on: date, end_on: date, budget_cents: zeroCents }).strict(),
  import_rules: z.object({ id, pattern: label, kind, category_id: id }).strict(),
  import_records: z.object({ id, fingerprint: z.string().min(1).max(600), transaction_id: id }).strict(),
  renewals: z.object({ id, label, due_on: date, cancel_by: date, remind_days: z.number().int().min(0).max(90), amount_cents: zeroCents, notifications_enabled: flag }).strict(),
};
export const backupTables = Object.keys(schemas) as (keyof typeof schemas)[];
type Row = Record<string, string | number | null>;
export type Backup = { format: 'mybudget'; version: 1; migrations: string[]; exportedAt: string; tables: Record<keyof typeof schemas, Row[]> };

export function parseBackup(text: string): Backup {
  if (text.length > MAX_FILE_BYTES || utf8Bytes(text) > MAX_FILE_BYTES) throw new Error('Sauvegarde trop volumineuse (8 Mo maximum).');
  const envelope = z.object({ format: z.literal('mybudget'), version: z.literal(1), migrations: z.array(z.string()),
    exportedAt: z.iso.datetime(), tables: z.record(z.string(), z.array(z.unknown()).max(50000)) }).strict().parse(JSON.parse(text));
  if (JSON.stringify(envelope.migrations) !== JSON.stringify(journal.entries.map((e) => e.tag))) throw new Error('Sauvegarde créée avec une autre version du schéma. Utilisez la version correspondante de MyBudget.');
  if (Object.keys(envelope.tables).sort().join('|') !== [...backupTables].sort().join('|')) throw new Error('Tables manquantes ou inconnues.');
  const tables = Object.fromEntries(backupTables.map((table) => [table, envelope.tables[table]!.map((r) => schemas[table].parse(r))])) as unknown as Backup['tables'];
  const categories = new Map(tables.categories.map((c) => [c.id, c]));
  for (const c of defaultCategories) if (categories.get(c.id)?.kind !== c.kind) throw new Error('Catégories requises absentes.');
  for (const table of ['transactions', 'transaction_templates'] as const) for (const row of tables[table]) {
    transactionDraftSchema.parse({ kind: row.kind, label: row.label, amountCents: row.amount_cents, categoryId: row.category_id,
      subcategoryId: row.subcategory_id, occurredOn: row.occurred_on ?? '2000-01-01' });
    if (categories.get(row.category_id)?.kind !== row.kind) throw new Error('Catégorie incompatible.');
  }
  for (const row of tables.recurring_expenses) if (categories.get(row.category_id)?.kind !== 'expense'
    || !isValidExpenseSubcategory({ kind: 'expense', categoryId: String(row.category_id), subcategoryId: row.subcategory_id as string | null })) throw new Error('Récurrence invalide.');
  for (const row of tables.import_rules) if (categories.get(row.category_id)?.kind !== row.kind) throw new Error('Règle invalide.');
  const entries = new Map(tables.transactions.map((t) => [t.id, t]));
  const splitIds = new Set(tables.transaction_splits.map((s) => s.transaction_id));
  for (const transactionId of splitIds) {
    const parts = tables.transaction_splits.filter((s) => s.transaction_id === transactionId), entry = entries.get(transactionId);
    if (entry?.kind !== 'expense' || parts.length < 2 || parts.length > 20 || parts.reduce((n, p) => n + Number(p.amount_cents), 0) !== entry.amount_cents
      || parts.some((p) => categories.get(p.category_id)?.kind !== 'expense')) throw new Error('Répartition invalide.');
  }
  for (const claim of tables.reimbursement_claims) {
    const expense = entries.get(claim.expense_id);
    if (expense?.kind !== 'expense' || Number(claim.expected_cents) > Number(expense.amount_cents)) throw new Error('Remboursement invalide.');
    let received = 0;
    for (const r of tables.reimbursement_receipts.filter((r) => r.expense_id === claim.expense_id)) {
      const income = entries.get(r.income_id);
      if (income?.kind !== 'income' || String(income.occurred_on) < String(expense.occurred_on)) throw new Error('Remboursement reçu invalide.');
      received += Number(income.amount_cents);
    }
    if (received > Number(claim.expected_cents)) throw new Error('Remboursement excédentaire.');
  }
  for (const goal of tables.provision_goals) {
    const reserved = tables.provision_movements.filter((m) => m.goal_id === goal.id).reduce((n, m) => n + Number(m.amount_cents), 0);
    if (reserved < 0 || reserved > Number(goal.target_cents)) throw new Error('Provision invalide.');
  }
  const cycles = [...tables.pay_cycles].sort((a, b) => String(a.start_on).localeCompare(String(b.start_on)));
  cycles.forEach((c, i) => { const days = (Date.parse(String(c.end_on)) - Date.parse(String(c.start_on))) / 86400000;
    if (days < 1 || days > 62 || (i > 0 && String(cycles[i - 1]!.end_on) > String(c.start_on))) throw new Error('Périodes incohérentes.'); });
  for (const r of tables.renewals) if (String(r.cancel_by) > String(r.due_on)) throw new Error('Renouvellement invalide.');
  return { ...envelope, tables };
}

export function makeBackup(db: AppDatabase): string {
  const data = db.transaction(() => ({ format: 'mybudget', version: 1, exportedAt: new Date().toISOString(),
    migrations: journal.entries.map((e) => e.tag),
    tables: Object.fromEntries(backupTables.map((table) => [table, db.all(sql`SELECT * FROM ${sql.identifier(table)}`)])) }));
  const text = JSON.stringify(data); parseBackup(text); return text;
}
export function restoreBackup(db: AppDatabase, text: string) {
  const backup = parseBackup(text);
  db.transaction(() => {
    for (const table of [...backupTables].reverse()) db.run(sql`DELETE FROM ${sql.identifier(table)}`);
    for (const table of backupTables) for (const source of backup.tables[table]) {
      const row = { ...source };
      // Notification permission and consent belong to this device, never to an imported file.
      if ('notifications_enabled' in row) row.notifications_enabled = 0;
      const columns = Object.keys(row);
      db.run(sql`INSERT INTO ${sql.identifier(table)} (${sql.join(columns.map(sql.identifier), sql`, `)}) VALUES (${sql.join(columns.map((c) => sql`${row[c]}`), sql`, `)})`);
    }
    if (db.all(sql`PRAGMA foreign_key_check`).length) throw new Error('Références invalides.');
  });
}
