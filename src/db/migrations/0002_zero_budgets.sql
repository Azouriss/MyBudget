PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_category_budgets` (
	`month` text NOT NULL,
	`category_id` text NOT NULL,
	`category_kind` text DEFAULT 'expense' NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`month`, `category_id`),
	FOREIGN KEY (`category_id`,`category_kind`) REFERENCES `categories`(`id`,`kind`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "category_budgets_kind_check" CHECK("__new_category_budgets"."category_kind" = 'expense'),
	CONSTRAINT "category_budgets_amount_check" CHECK(typeof("__new_category_budgets"."amount_cents") = 'integer' AND "__new_category_budgets"."amount_cents" BETWEEN 0 AND 999999999),
	CONSTRAINT "category_budgets_month_check" CHECK("__new_category_budgets"."month" GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr("__new_category_budgets"."month", 1, 4) BETWEEN '1900' AND '2099' AND substr("__new_category_budgets"."month", 6, 2) BETWEEN '01' AND '12')
);
--> statement-breakpoint
INSERT INTO `__new_category_budgets`("month", "category_id", "category_kind", "amount_cents", "created_at", "updated_at") SELECT "month", "category_id", "category_kind", "amount_cents", "created_at", "updated_at" FROM `category_budgets`;--> statement-breakpoint
DROP TABLE `category_budgets`;--> statement-breakpoint
ALTER TABLE `__new_category_budgets` RENAME TO `category_budgets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_monthly_budgets` (
	`month` text PRIMARY KEY NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "monthly_budgets_amount_check" CHECK(typeof("__new_monthly_budgets"."amount_cents") = 'integer' AND "__new_monthly_budgets"."amount_cents" BETWEEN 0 AND 999999999),
	CONSTRAINT "monthly_budgets_month_check" CHECK("__new_monthly_budgets"."month" GLOB '[12][0-9][0-9][0-9]-[01][0-9]' AND substr("__new_monthly_budgets"."month", 1, 4) BETWEEN '1900' AND '2099' AND substr("__new_monthly_budgets"."month", 6, 2) BETWEEN '01' AND '12')
);
--> statement-breakpoint
INSERT INTO `__new_monthly_budgets`("month", "amount_cents", "created_at", "updated_at") SELECT "month", "amount_cents", "created_at", "updated_at" FROM `monthly_budgets`;--> statement-breakpoint
DROP TABLE `monthly_budgets`;--> statement-breakpoint
ALTER TABLE `__new_monthly_budgets` RENAME TO `monthly_budgets`;