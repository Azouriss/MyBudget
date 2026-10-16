CREATE TABLE `category_budgets` (
	`month` text NOT NULL,
	`category_id` text NOT NULL,
	`category_kind` text DEFAULT 'expense' NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`month`, `category_id`),
	FOREIGN KEY (`category_id`,`category_kind`) REFERENCES `categories`(`id`,`kind`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "category_budgets_kind_check" CHECK("category_budgets"."category_kind" = 'expense'),
	CONSTRAINT "category_budgets_amount_check" CHECK(typeof("category_budgets"."amount_cents") = 'integer' AND "category_budgets"."amount_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "category_budgets_month_check" CHECK("category_budgets"."month" GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr("category_budgets"."month", 1, 4) BETWEEN '1900' AND '2099' AND substr("category_budgets"."month", 6, 2) BETWEEN '01' AND '12')
);
--> statement-breakpoint
CREATE TABLE `monthly_budgets` (
	`month` text PRIMARY KEY NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "monthly_budgets_amount_check" CHECK(typeof("monthly_budgets"."amount_cents") = 'integer' AND "monthly_budgets"."amount_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "monthly_budgets_month_check" CHECK("monthly_budgets"."month" GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr("monthly_budgets"."month", 1, 4) BETWEEN '1900' AND '2099' AND substr("monthly_budgets"."month", 6, 2) BETWEEN '01' AND '12')
);
