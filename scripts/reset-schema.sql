-- DEPRECATED — do not maintain this file for schema changes.
-- `pnpm db:reset` now wipes Turso and reapplies `apps/worker/migrations/NNNN_*.sql` in order
-- (see apps/worker/scripts/reset-turso-migrations.mjs). This snapshot is kept only for one-off reference.
--
-- reset-schema.sql (legacy)
-- Drops all tables and recreates the full schema from scratch.

PRAGMA foreign_keys = OFF;

-- Drop all tables
DROP TABLE IF EXISTS attendance_periods;
DROP TABLE IF EXISTS conference_days;
DROP TABLE IF EXISTS benefits;
DROP TABLE IF EXISTS qr_scan_log;
DROP TABLE IF EXISTS benefit_redemptions;
DROP TABLE IF EXISTS attendance_records;
DROP TABLE IF EXISTS qr_tokens;
DROP TABLE IF EXISTS post_replies;
DROP TABLE IF EXISTS post_likes;
DROP TABLE IF EXISTS post_media;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS awards;
DROP TABLE IF EXISTS country_assignments;
DROP TABLE IF EXISTS impersonation_log;
DROP TABLE IF EXISTS delegate_answers;
DROP TABLE IF EXISTS registration_questions;
DROP TABLE IF EXISTS registration_steps;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS delegate_profiles;
DROP TABLE IF EXISTS councils;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

-- Core Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'delegate',
  registration_status TEXT NOT NULL DEFAULT 'pending',
  council TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE INDEX idx_email ON users (email);
CREATE INDEX idx_role ON users (role);
CREATE INDEX idx_registration_status ON users (registration_status);

-- Councils
CREATE TABLE councils (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  short_name TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE UNIQUE INDEX councils_name_unique ON councils (name);
CREATE INDEX idx_councils_name ON councils (name);

-- Delegate Profiles
CREATE TABLE delegate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  identifier TEXT UNIQUE,
  year TEXT,
  country TEXT,
  press_agency TEXT,
  first_choice TEXT,
  second_choice TEXT,
  awards TEXT DEFAULT '[]',
  deposit_amount INTEGER,
  full_amount INTEGER,
  deposit_payment_status TEXT NOT NULL DEFAULT 'pending',
  full_payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_proof_r2_key TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delegate_profiles_identifier ON delegate_profiles (identifier);

-- Impersonation Log
CREATE TABLE impersonation_log (
  id TEXT PRIMARY KEY NOT NULL,
  admin_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);
CREATE INDEX idx_admin ON impersonation_log (admin_id);
CREATE INDEX idx_target ON impersonation_log (target_id);

-- Settings
CREATE TABLE settings (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE UNIQUE INDEX settings_key_unique ON settings (key);

-- Registration Steps
CREATE TABLE registration_steps (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Registration Questions
CREATE TABLE registration_questions (
  id TEXT PRIMARY KEY NOT NULL,
  step_id TEXT NOT NULL REFERENCES registration_steps(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL,
  options TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0,
  council_preference_count INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE INDEX idx_req_questions_step ON registration_questions (step_id);

-- Delegate Answers
CREATE TABLE delegate_answers (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES registration_questions(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  UNIQUE (user_id, question_id)
);
CREATE INDEX idx_delegate_answers_user ON delegate_answers (user_id);
CREATE UNIQUE INDEX delegate_answers_user_id_question_id_unique ON delegate_answers (user_id, question_id);

-- QR Tokens
CREATE TABLE qr_tokens (
  token TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX idx_user ON qr_tokens (user_id);
CREATE INDEX idx_expires ON qr_tokens (expires_at);

-- Attendance Records
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  session_label TEXT,
  scanned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX idx_attendance_user ON attendance_records (user_id);
CREATE INDEX idx_attendance_session ON attendance_records (session_label, scanned_at);

-- Benefit Redemptions
CREATE TABLE benefit_redemptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  benefit_type TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (user_id, benefit_type)
);
CREATE UNIQUE INDEX benefit_redemptions_user_id_benefit_type_unique ON benefit_redemptions (user_id, benefit_type);

-- QR Scan Log
CREATE TABLE qr_scan_log (
  id TEXT PRIMARY KEY NOT NULL,
  token TEXT NOT NULL,
  scanned_by TEXT NOT NULL REFERENCES users(id),
  result TEXT NOT NULL,
  scanned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Country Assignments
CREATE TABLE country_assignments (
  id TEXT PRIMARY KEY NOT NULL,
  council TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  country TEXT NOT NULL,
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE (council, user_id)
);
CREATE UNIQUE INDEX country_assignments_council_user_id_unique ON country_assignments (council, user_id);

-- Awards
CREATE TABLE awards (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  council TEXT NOT NULL,
  award_type TEXT NOT NULL,
  given_by TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  given_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Press Posts
CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER
);
CREATE INDEX idx_posts_feed ON posts (created_at);
CREATE INDEX idx_posts_author ON posts (author_id);

-- Post Media
CREATE TABLE post_media (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id),
  media_type TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Post Likes
CREATE TABLE post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  liked_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_likes_post ON post_likes (post_id);

-- Post Replies
CREATE TABLE post_replies (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX idx_replies_post ON post_replies (post_id, created_at);

-- Benefits (admin-managed list)
CREATE TABLE benefits (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Conference Days
CREATE TABLE conference_days (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL DEFAULT 'Unnamed Day',
  date TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

-- Attendance Periods
CREATE TABLE attendance_periods (
  id TEXT PRIMARY KEY NOT NULL,
  day_id TEXT NOT NULL REFERENCES conference_days(id) ON DELETE CASCADE,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);
CREATE INDEX idx_attendance_periods_day ON attendance_periods (day_id);
