CREATE TABLE `attendance_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`day_id` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	FOREIGN KEY (`day_id`) REFERENCES `conference_days`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scanned_by` text NOT NULL,
	`session_label` text,
	`scanned_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `awards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`council` text NOT NULL,
	`award_type` text NOT NULL,
	`given_by` text NOT NULL,
	`notes` text,
	`given_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`given_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `benefit_redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scanned_by` text NOT NULL,
	`benefit_type` text NOT NULL,
	`redeemed_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `benefits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `conference_days` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Unnamed Day' NOT NULL,
	`date` text NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `councils` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`short_name` text,
	`capacity` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `country_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`council` text NOT NULL,
	`user_id` text NOT NULL,
	`country` text NOT NULL,
	`assigned_by` text NOT NULL,
	`assigned_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
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
CREATE TABLE `delegate_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`identifier` text,
	`year` text,
	`country` text,
	`press_agency` text,
	`first_choice` text,
	`second_choice` text,
	`current_preference_tracker` integer DEFAULT 1 NOT NULL,
	`awards` text DEFAULT '[]',
	`deposit_amount` integer,
	`full_amount` integer,
	`deposit_payment_status` text DEFAULT 'pending' NOT NULL,
	`full_payment_status` text DEFAULT 'pending' NOT NULL,
	`payment_proof_r2_key` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `impersonation_log` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`target_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `post_likes` (
	`post_id` text NOT NULL,
	`user_id` text NOT NULL,
	`liked_at` integer DEFAULT 1775113111 NOT NULL,
	PRIMARY KEY(`post_id`, `user_id`),
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `post_media` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`media_type` text NOT NULL,
	`r2_key` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `post_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT 1775113111 NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `qr_scan_log` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`scanned_by` text NOT NULL,
	`result` text NOT NULL,
	`scanned_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`scanned_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `qr_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT 1775113111 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
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
	`council_preference_count` integer DEFAULT 1 NOT NULL,
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
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`name` text NOT NULL,
	`role` text DEFAULT 'delegate' NOT NULL,
	`registration_status` text DEFAULT 'pending' NOT NULL,
	`council` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`updated_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_periods_day` ON `attendance_periods` (`day_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_user` ON `attendance_records` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_attendance_session` ON `attendance_records` (`session_label`,`scanned_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_records_user_id_session_label_unique` ON `attendance_records` (`user_id`,`session_label`);--> statement-breakpoint
CREATE UNIQUE INDEX `benefit_redemptions_user_id_benefit_type_unique` ON `benefit_redemptions` (`user_id`,`benefit_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `councils_name_unique` ON `councils` (`name`);--> statement-breakpoint
CREATE INDEX `idx_councils_name` ON `councils` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `country_assignments_council_user_id_unique` ON `country_assignments` (`council`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_delegate_answers_user` ON `delegate_answers` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `delegate_answers_user_id_question_id_unique` ON `delegate_answers` (`user_id`,`question_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `delegate_profiles_identifier_unique` ON `delegate_profiles` (`identifier`);--> statement-breakpoint
CREATE INDEX `idx_admin` ON `impersonation_log` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_target` ON `impersonation_log` (`target_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_post` ON `post_likes` (`post_id`);--> statement-breakpoint
CREATE INDEX `idx_replies_post` ON `post_replies` (`post_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_feed` ON `posts` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_posts_author` ON `posts` (`author_id`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `qr_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_expires` ON `qr_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_req_questions_step` ON `registration_questions` (`step_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_registration_status` ON `users` (`registration_status`);