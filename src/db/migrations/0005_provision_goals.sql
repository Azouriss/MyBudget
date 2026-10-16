CREATE TABLE `provision_goals` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`target_cents` integer NOT NULL,
	`due_on` text NOT NULL,
	`contribution_day` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "provision_goals_label_check" CHECK(length(trim("provision_goals"."label")) BETWEEN 1 AND 80),
	CONSTRAINT "provision_goals_target_check" CHECK(typeof("provision_goals"."target_cents") = 'integer' AND "provision_goals"."target_cents" BETWEEN 1 AND 999999999),
	CONSTRAINT "provision_goals_day_check" CHECK(typeof("provision_goals"."contribution_day") = 'integer' AND "provision_goals"."contribution_day" BETWEEN 1 AND 31),
	CONSTRAINT "provision_goals_date_check" CHECK("provision_goals"."due_on" GLOB '[12][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND substr("provision_goals"."due_on", 1, 4) BETWEEN '1900' AND '2099' AND date("provision_goals"."due_on", '+0 days') IS NOT NULL AND date("provision_goals"."due_on", '+0 days') = "provision_goals"."due_on")
);
--> statement-breakpoint
CREATE TABLE `provision_movements` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `provision_goals`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "provision_movements_amount_check" CHECK(typeof("provision_movements"."amount_cents") = 'integer' AND "provision_movements"."amount_cents" BETWEEN -999999999 AND 999999999 AND "provision_movements"."amount_cents" != 0)
);
--> statement-breakpoint
CREATE INDEX `provision_movements_goal_index` ON `provision_movements` (`goal_id`);