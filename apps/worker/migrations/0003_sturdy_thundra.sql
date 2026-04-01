CREATE TABLE `delegate_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`question_id` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`question_id`) REFERENCES `registration_questions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `registration_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`step_id` text NOT NULL,
	`label` text NOT NULL,
	`type` text NOT NULL,
	`options` text,
	`required` integer DEFAULT false NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`step_id`) REFERENCES `registration_steps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `registration_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`order` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
/*
 SQLite does not support "Set default to column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html
                  https://stackoverflow.com/questions/2083543/modify-a-columns-type-in-sqlite3

 Due to that we don't generate migration automatically and it has to be done manually
*/--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `first_choice` text;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `second_choice` text;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `deposit_amount` integer;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `full_amount` integer;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `deposit_payment_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `full_payment_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE delegate_profiles ADD `payment_proof_r2_key` text;--> statement-breakpoint
ALTER TABLE users ADD `first_name` text;--> statement-breakpoint
ALTER TABLE users ADD `last_name` text;--> statement-breakpoint
ALTER TABLE users ADD `registration_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_delegate_answers_user` ON `delegate_answers` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `delegate_answers_user_id_question_id_unique` ON `delegate_answers` (`user_id`,`question_id`);--> statement-breakpoint
CREATE INDEX `idx_req_questions_step` ON `registration_questions` (`step_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE INDEX `idx_registration_status` ON `users` (`registration_status`);