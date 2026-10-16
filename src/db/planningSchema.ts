import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { categories, transactions } from './schema';

export const transactionTemplates = sqliteTable('transaction_templates', {
  id: text('id').primaryKey(), label: text('label').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  subcategoryId: text('subcategory_id'),
}, (t) => [check('templates_amount', sql`typeof(${t.amountCents}) = 'integer' AND ${t.amountCents} BETWEEN 1 AND 999999999`),
  check('templates_kind', sql`${t.kind} IN ('expense', 'income')`),
  check('templates_label', sql`length(trim(${t.label})) BETWEEN 1 AND 80`)]);

export const transactionSplits = sqliteTable('transaction_splits', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  amountCents: integer('amount_cents').notNull(),
}, (t) => [check('splits_amount', sql`typeof(${t.amountCents}) = 'integer' AND ${t.amountCents} BETWEEN 1 AND 999999999`)]);

export const reimbursementClaims = sqliteTable('reimbursement_claims', {
  expenseId: text('expense_id').primaryKey().references(() => transactions.id, { onDelete: 'restrict' }),
  expectedCents: integer('expected_cents').notNull(), label: text('label').notNull(),
}, (t) => [check('claims_amount', sql`typeof(${t.expectedCents}) = 'integer' AND ${t.expectedCents} BETWEEN 1 AND 999999999`),
  check('claims_label', sql`length(trim(${t.label})) BETWEEN 1 AND 80`)]);

export const reimbursementReceipts = sqliteTable('reimbursement_receipts', {
  incomeId: text('income_id').primaryKey().references(() => transactions.id, { onDelete: 'restrict' }),
  expenseId: text('expense_id').notNull().references(() => reimbursementClaims.expenseId, { onDelete: 'restrict' }),
});

export const payCycles = sqliteTable('pay_cycles', {
  id: text('id').primaryKey(), startOn: text('start_on').notNull(), endOn: text('end_on').notNull(),
  budgetCents: integer('budget_cents').notNull(),
}, (t) => [uniqueIndex('cycles_start_unique').on(t.startOn),
  check('cycles_order', sql`${t.startOn} < ${t.endOn}`),
  check('cycles_amount', sql`typeof(${t.budgetCents}) = 'integer' AND ${t.budgetCents} BETWEEN 0 AND 999999999`)]);

export const importRules = sqliteTable('import_rules', {
  id: text('id').primaryKey(), pattern: text('pattern').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
}, (t) => [check('rules_pattern', sql`length(trim(${t.pattern})) BETWEEN 1 AND 80`),
  check('rules_kind', sql`${t.kind} IN ('expense', 'income')`)]);

export const importRecords = sqliteTable('import_records', {
  id: text('id').primaryKey(), fingerprint: text('fingerprint').notNull(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
}, (t) => [uniqueIndex('import_fingerprint_unique').on(t.fingerprint)]);

export const renewals = sqliteTable('renewals', {
  id: text('id').primaryKey(), label: text('label').notNull(),
  dueOn: text('due_on').notNull(), cancelBy: text('cancel_by').notNull(),
  remindDays: integer('remind_days').notNull(), amountCents: integer('amount_cents').notNull(),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(false),
}, (t) => [check('renewals_amount', sql`typeof(${t.amountCents}) = 'integer' AND ${t.amountCents} BETWEEN 0 AND 999999999`),
  check('renewals_days', sql`typeof(${t.remindDays}) = 'integer' AND ${t.remindDays} BETWEEN 0 AND 90`),
  check('renewals_order', sql`${t.cancelBy} <= ${t.dueOn}`),
  check('renewals_enabled', sql`${t.notificationsEnabled} IN (0, 1)`),
  check('renewals_label', sql`length(trim(${t.label})) BETWEEN 1 AND 80`)]);
