CREATE TABLE `payday_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`day` integer NOT NULL,
	`notifications_enabled` integer NOT NULL,
	CONSTRAINT "payday_settings_id_check" CHECK("payday_settings"."id" = 1),
	CONSTRAINT "payday_settings_day_check" CHECK(typeof("payday_settings"."day") = 'integer' AND "payday_settings"."day" BETWEEN 1 AND 31),
	CONSTRAINT "payday_settings_notifications_check" CHECK("payday_settings"."notifications_enabled" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `recurring_expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` text NOT NULL,
	`category_kind` text DEFAULT 'expense' NOT NULL,
	`frequency` text NOT NULL,
	`start_on` text NOT NULL,
	`next_index` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`,`category_kind`) REFERENCES `categories`(`id`,`kind`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recurring_expenses_kind_check" CHECK("recurring_expenses"."category_kind" = 'expense'),
	CONSTRAINT "recurring_expenses_amount_check" CHECK(typeof("recurring_expenses"."amount_cents") = 'integer' AND "recurring_expenses"."amount_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "recurring_expenses_label_check" CHECK(length(trim("recurring_expenses"."label")) BETWEEN 1 AND 80),
	CONSTRAINT "recurring_expenses_frequency_check" CHECK("recurring_expenses"."frequency" IN ('weekly', 'monthly', 'yearly')),
	CONSTRAINT "recurring_expenses_index_check" CHECK(typeof("recurring_expenses"."next_index") = 'integer' AND "recurring_expenses"."next_index" >= 0),
	CONSTRAINT "recurring_expenses_active_check" CHECK("recurring_expenses"."active" IN (0, 1))
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_expense_id` text REFERENCES `recurring_expenses`(`id`) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_occurrence_on` text CONSTRAINT "transactions_recurring_check" CHECK(("recurring_expense_id" IS NULL AND "recurring_occurrence_on" IS NULL) OR ("recurring_expense_id" IS NOT NULL AND "recurring_occurrence_on" IS NOT NULL AND "kind" = 'expense'));
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_occurrence_unique` ON `transactions` (`recurring_expense_id`,`recurring_occurrence_on`);
