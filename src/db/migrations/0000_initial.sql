CREATE TABLE `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `label` text NOT NULL,
  `kind` text NOT NULL,
  `color` text NOT NULL,
  `icon` text NOT NULL,
  `position` integer NOT NULL,
  CONSTRAINT "categories_kind_check" CHECK("categories"."kind" IN ('expense', 'income'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_id_kind_unique` ON `categories` (`id`, `kind`);
--> statement-breakpoint
CREATE TABLE `transactions` (
  `id` text PRIMARY KEY NOT NULL,
  `kind` text NOT NULL,
  `amount_cents` integer NOT NULL,
  `label` text NOT NULL,
  `category_id` text NOT NULL REFERENCES `categories`(`id`) ON DELETE restrict,
  `occurred_on` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  CONSTRAINT "transactions_amount_check" CHECK(typeof("transactions"."amount_cents") = 'integer' AND "transactions"."amount_cents" BETWEEN 1 AND 999999999),
  CONSTRAINT "transactions_kind_check" CHECK("transactions"."kind" IN ('expense', 'income')),
  CONSTRAINT "transactions_label_check" CHECK(length(trim("transactions"."label")) BETWEEN 1 AND 80),
  CONSTRAINT "transactions_date_check" CHECK(length("transactions"."occurred_on") = 10 AND "transactions"."occurred_on" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')
);
--> statement-breakpoint
CREATE INDEX `transactions_date_index` ON `transactions` (`occurred_on`);
