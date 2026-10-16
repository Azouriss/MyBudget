CREATE TABLE `import_records` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`transaction_id` text NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_fingerprint_unique` ON `import_records` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `import_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`pattern` text NOT NULL,
	`kind` text NOT NULL,
	`category_id` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "rules_pattern" CHECK(length(trim("import_rules"."pattern")) BETWEEN 1 AND 80),
	CONSTRAINT "rules_kind" CHECK("import_rules"."kind" IN ('expense', 'income'))
);
--> statement-breakpoint
CREATE TABLE `pay_cycles` (
	`id` text PRIMARY KEY NOT NULL,
	`start_on` text NOT NULL,
	`end_on` text NOT NULL,
	`budget_cents` integer NOT NULL,
	CONSTRAINT "cycles_order" CHECK("pay_cycles"."start_on" < "pay_cycles"."end_on"),
	CONSTRAINT "cycles_amount" CHECK(typeof("pay_cycles"."budget_cents") = 'integer' AND "pay_cycles"."budget_cents" BETWEEN 0 AND 999999999)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cycles_start_unique` ON `pay_cycles` (`start_on`);--> statement-breakpoint
CREATE TABLE `reimbursement_claims` (
	`expense_id` text PRIMARY KEY NOT NULL,
	`expected_cents` integer NOT NULL,
	`label` text NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "claims_amount" CHECK(typeof("reimbursement_claims"."expected_cents") = 'integer' AND "reimbursement_claims"."expected_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "claims_label" CHECK(length(trim("reimbursement_claims"."label")) BETWEEN 1 AND 80)
);
--> statement-breakpoint
CREATE TABLE `reimbursement_receipts` (
	`income_id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	FOREIGN KEY (`income_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`expense_id`) REFERENCES `reimbursement_claims`(`expense_id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `renewals` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`due_on` text NOT NULL,
	`cancel_by` text NOT NULL,
	`remind_days` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`notifications_enabled` integer DEFAULT false NOT NULL,
	CONSTRAINT "renewals_amount" CHECK(typeof("renewals"."amount_cents") = 'integer' AND "renewals"."amount_cents" BETWEEN 0 AND 999999999),
	CONSTRAINT "renewals_days" CHECK(typeof("renewals"."remind_days") = 'integer' AND "renewals"."remind_days" BETWEEN 0 AND 90),
	CONSTRAINT "renewals_order" CHECK("renewals"."cancel_by" <= "renewals"."due_on"),
	CONSTRAINT "renewals_enabled" CHECK("renewals"."notifications_enabled" IN (0, 1)),
	CONSTRAINT "renewals_label" CHECK(length(trim("renewals"."label")) BETWEEN 1 AND 80)
);
--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`category_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "splits_amount" CHECK(typeof("transaction_splits"."amount_cents") = 'integer' AND "transaction_splits"."amount_cents" BETWEEN 1 AND 999999999)
);
--> statement-breakpoint
CREATE TABLE `transaction_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`kind` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`category_id` text NOT NULL,
	`subcategory_id` text,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "templates_amount" CHECK(typeof("transaction_templates"."amount_cents") = 'integer' AND "transaction_templates"."amount_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "templates_kind" CHECK("transaction_templates"."kind" IN ('expense', 'income')),
	CONSTRAINT "templates_label" CHECK(length(trim("transaction_templates"."label")) BETWEEN 1 AND 80)
);
