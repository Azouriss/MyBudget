import { sql } from 'drizzle-orm';
import { check, foreignKey, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  position: integer('position').notNull(),
}, (table) => [
  check('categories_kind_check', sql`${table.kind} IN ('expense', 'income')`),
  uniqueIndex('categories_id_kind_unique').on(table.id, table.kind),
]);

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').notNull(),
  categoryKind: text('category_kind').notNull().default('expense'),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startOn: text('start_on').notNull(),
  nextIndex: integer('next_index').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.categoryKind], foreignColumns: [categories.id, categories.kind] }).onDelete('restrict'),
  check('recurring_expenses_kind_check', sql`${table.categoryKind} = 'expense'`),
  check('recurring_expenses_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 1 AND 999999999`),
  check('recurring_expenses_label_check', sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
  check('recurring_expenses_frequency_check', sql`${table.frequency} IN ('weekly', 'monthly', 'yearly')`),
  check('recurring_expenses_index_check', sql`typeof(${table.nextIndex}) = 'integer' AND ${table.nextIndex} >= 0`),
  check('recurring_expenses_active_check', sql`${table.active} IN (0, 1)`),
]);

export const paydaySettings = sqliteTable('payday_settings', {
  id: integer('id').primaryKey(),
  day: integer('day').notNull(),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull(),
}, (table) => [
  check('payday_settings_id_check', sql`${table.id} = 1`),
  check('payday_settings_day_check', sql`typeof(${table.day}) = 'integer' AND ${table.day} BETWEEN 1 AND 31`),
  check('payday_settings_notifications_check', sql`${table.notificationsEnabled} IN (0, 1)`),
]);

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  label: text('label').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  occurredOn: text('occurred_on').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  recurringExpenseId: text('recurring_expense_id').references(() => recurringExpenses.id, { onDelete: 'restrict' }),
  recurringOccurrenceOn: text('recurring_occurrence_on'),
}, (table) => [
  uniqueIndex('transactions_recurring_occurrence_unique').on(table.recurringExpenseId, table.recurringOccurrenceOn),
  check('transactions_recurring_check', sql`(${table.recurringExpenseId} IS NULL AND ${table.recurringOccurrenceOn} IS NULL) OR (${table.recurringExpenseId} IS NOT NULL AND ${table.recurringOccurrenceOn} IS NOT NULL AND ${table.kind} = 'expense')`),
  index('transactions_date_index').on(table.occurredOn),
  check('transactions_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 1 AND 999999999`),
  check('transactions_kind_check', sql`${table.kind} IN ('expense', 'income')`),
  check('transactions_label_check', sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
  check('transactions_date_check', sql`length(${table.occurredOn}) = 10 AND ${table.occurredOn} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
]);

export type Category = typeof categories.$inferSelect;

export const monthlyBudgets = sqliteTable('monthly_budgets', {
  month: text('month').primaryKey(),
  amountCents: integer('amount_cents').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  check('monthly_budgets_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 0 AND 999999999`),
  check('monthly_budgets_month_check', sql`${table.month} GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr(${table.month}, 1, 4) BETWEEN '1900' AND '2099' AND substr(${table.month}, 6, 2) BETWEEN '01' AND '12'`),
]);

export const categoryBudgets = sqliteTable('category_budgets', {
  month: text('month').notNull(),
  categoryId: text('category_id').notNull(),
  categoryKind: text('category_kind').notNull().default('expense'),
  amountCents: integer('amount_cents').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.month, table.categoryId] }),
  foreignKey({ columns: [table.categoryId, table.categoryKind], foreignColumns: [categories.id, categories.kind] }).onDelete('restrict'),
  check('category_budgets_kind_check', sql`${table.categoryKind} = 'expense'`),
  check('category_budgets_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 0 AND 999999999`),
  check('category_budgets_month_check', sql`${table.month} GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr(${table.month}, 1, 4) BETWEEN '1900' AND '2099' AND substr(${table.month}, 6, 2) BETWEEN '01' AND '12'`),
]);
