CREATE TABLE `recurring_incomes` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` text NOT NULL,
	`subcategory_id` text,
	`category_kind` text DEFAULT 'income' NOT NULL,
	`frequency` text NOT NULL,
	`start_on` text NOT NULL,
	`next_index` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`,`category_kind`) REFERENCES `categories`(`id`,`kind`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recurring_incomes_kind_check" CHECK("recurring_incomes"."category_kind" = 'income'),
	CONSTRAINT "recurring_incomes_subcategory_check" CHECK("recurring_incomes"."subcategory_id" IS NULL),
	CONSTRAINT "recurring_incomes_amount_check" CHECK(typeof("recurring_incomes"."amount_cents") = 'integer' AND "recurring_incomes"."amount_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "recurring_incomes_label_check" CHECK(length(trim("recurring_incomes"."label")) BETWEEN 1 AND 80),
	CONSTRAINT "recurring_incomes_frequency_check" CHECK("recurring_incomes"."frequency" IN ('weekly', 'monthly', 'yearly')),
	CONSTRAINT "recurring_incomes_index_check" CHECK(typeof("recurring_incomes"."next_index") = 'integer' AND "recurring_incomes"."next_index" >= 0),
	CONSTRAINT "recurring_incomes_active_check" CHECK("recurring_incomes"."active" IN (0, 1))
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_income_id` text REFERENCES `recurring_incomes`(`id`) ON DELETE restrict;
--> statement-breakpoint
ALTER TABLE `transactions` ADD `recurring_income_on` text CONSTRAINT `transactions_recurring_income_check` CHECK (
  (`recurring_income_id` IS NULL AND `recurring_income_on` IS NULL) OR
  (`recurring_income_id` IS NOT NULL AND `recurring_income_on` IS NOT NULL AND `kind` = 'income' AND `recurring_expense_id` IS NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_income_unique` ON `transactions` (`recurring_income_id`,`recurring_income_on`);
