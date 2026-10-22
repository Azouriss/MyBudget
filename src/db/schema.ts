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
  subcategoryId: text('subcategory_id'),
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

// Income rules are additive: preserve existing expense rules and their references.
export const recurringIncomes = sqliteTable('recurring_incomes', {
  id: text('id').primaryKey(), label: text('label').notNull(),
  amountCents: integer('amount_cents').notNull(),
  categoryId: text('category_id').notNull(), subcategoryId: text('subcategory_id'),
  categoryKind: text('category_kind').notNull().default('income'),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startOn: text('start_on').notNull(), nextIndex: integer('next_index').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(),
}, (table) => [
  foreignKey({ columns: [table.categoryId, table.categoryKind], foreignColumns: [categories.id, categories.kind] }).onDelete('restrict'),
  check('recurring_incomes_kind_check', sql`${table.categoryKind} = 'income'`),
  check('recurring_incomes_subcategory_check', sql`${table.subcategoryId} IS NULL`),
  check('recurring_incomes_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 1 AND 999999999`),
  check('recurring_incomes_label_check', sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
  check('recurring_incomes_frequency_check', sql`${table.frequency} IN ('weekly', 'monthly', 'yearly')`),
  check('recurring_incomes_index_check', sql`typeof(${table.nextIndex}) = 'integer' AND ${table.nextIndex} >= 0`),
  check('recurring_incomes_active_check', sql`${table.active} IN (0, 1)`),
]);

export const userProfile = sqliteTable('user_profile', {
  id: integer('id').primaryKey(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  language: text('language', { enum: ['fr', 'en'] }).notNull().default('fr'),
}, (table) => [
  check('user_profile_id_check', sql`${table.id} = 1`),
  check('user_profile_first_name_check', sql`length(${table.firstName}) <= 80`),
  check('user_profile_last_name_check', sql`length(${table.lastName}) <= 80`),
  check('user_profile_language_check', sql`${table.language} IN ('fr', 'en')`),
]);

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  kind: text('kind', { enum: ['expense', 'income'] }).notNull(),
  amountCents: integer('amount_cents').notNull(),
  label: text('label').notNull(),
  categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  subcategoryId: text('subcategory_id'),
  occurredOn: text('occurred_on').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  recurringExpenseId: text('recurring_expense_id').references(() => recurringExpenses.id, { onDelete: 'restrict' }),
  recurringOccurrenceOn: text('recurring_occurrence_on'),
  recurringIncomeId: text('recurring_income_id').references(() => recurringIncomes.id, { onDelete: 'restrict' }),
  recurringIncomeOn: text('recurring_income_on'),
}, (table) => [
  uniqueIndex('transactions_recurring_income_unique').on(table.recurringIncomeId, table.recurringIncomeOn),
  check('transactions_recurring_income_check', sql`(${table.recurringIncomeId} IS NULL AND ${table.recurringIncomeOn} IS NULL) OR (${table.recurringIncomeId} IS NOT NULL AND ${table.recurringIncomeOn} IS NOT NULL AND ${table.kind} = 'income' AND ${table.recurringExpenseId} IS NULL)`),
  uniqueIndex('transactions_recurring_occurrence_unique').on(table.recurringExpenseId, table.recurringOccurrenceOn),
  check('transactions_recurring_check', sql`(${table.recurringExpenseId} IS NULL AND ${table.recurringOccurrenceOn} IS NULL) OR (${table.recurringExpenseId} IS NOT NULL AND ${table.recurringOccurrenceOn} IS NOT NULL AND ${table.kind} = 'expense')`),
  index('transactions_date_index').on(table.occurredOn),
  check('transactions_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN 1 AND 999999999`),
  check('transactions_kind_check', sql`${table.kind} IN ('expense', 'income')`),
  check('transactions_label_check', sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
  check('transactions_date_check', sql`length(${table.occurredOn}) = 10 AND ${table.occurredOn} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'`),
]);

export type Category = typeof categories.$inferSelect;

export const provisionGoals = sqliteTable('provision_goals', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  targetCents: integer('target_cents').notNull(),
  dueOn: text('due_on').notNull(),
  contributionDay: integer('contribution_day').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  check('provision_goals_label_check', sql`length(trim(${table.label})) BETWEEN 1 AND 80`),
  check('provision_goals_target_check', sql`typeof(${table.targetCents}) = 'integer' AND ${table.targetCents} BETWEEN 1 AND 999999999`),
  check('provision_goals_day_check', sql`typeof(${table.contributionDay}) = 'integer' AND ${table.contributionDay} BETWEEN 1 AND 31`),
  check('provision_goals_date_check', sql`${table.dueOn} GLOB '[12][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND substr(${table.dueOn}, 1, 4) BETWEEN '1900' AND '2099' AND date(${table.dueOn}, '+0 days') IS NOT NULL AND date(${table.dueOn}, '+0 days') = ${table.dueOn}`),
]);

export const provisionMovements = sqliteTable('provision_movements', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => provisionGoals.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  index('provision_movements_goal_index').on(table.goalId),
  check('provision_movements_amount_check', sql`typeof(${table.amountCents}) = 'integer' AND ${table.amountCents} BETWEEN -999999999 AND 999999999 AND ${table.amountCents} != 0`),
]);

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
