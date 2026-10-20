CREATE TABLE `user_profile` (
	`id` integer PRIMARY KEY NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`language` text DEFAULT 'fr' NOT NULL,
	CONSTRAINT "user_profile_id_check" CHECK("user_profile"."id" = 1),
	CONSTRAINT "user_profile_first_name_check" CHECK(length("user_profile"."first_name") <= 80),
	CONSTRAINT "user_profile_last_name_check" CHECK(length("user_profile"."last_name") <= 80),
	CONSTRAINT "user_profile_language_check" CHECK("user_profile"."language" IN ('fr', 'en'))
);
