-- Phase 1: Core Auth & Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('delegate','oc','chair','admin')),
  council TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE impersonation_log (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id),
  target_id TEXT NOT NULL REFERENCES users(id),
  started_at INTEGER NOT NULL,
  ended_at INTEGER
);

-- Phase 2: Delegate Profiles & QR Tokens
CREATE TABLE delegate_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  year TEXT,
  country TEXT,
  press_agency TEXT,
  awards TEXT DEFAULT '[]' -- JSON array
);

CREATE TABLE qr_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK(purpose IN ('attendance','benefit')),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Phase 3: Attendance & Benefits
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  session_label TEXT,
  scanned_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE benefit_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scanned_by TEXT NOT NULL REFERENCES users(id),
  benefit_type TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, benefit_type)
);

CREATE TABLE qr_scan_log (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  scanned_by TEXT NOT NULL REFERENCES users(id),
  result TEXT NOT NULL CHECK(result IN ('valid','expired','already_used','invalid_sig')),
  scanned_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Phase 4: Council & Awards
CREATE TABLE country_assignments (
  id TEXT PRIMARY KEY,
  council TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  country TEXT NOT NULL,
  assigned_by TEXT NOT NULL REFERENCES users(id),
  assigned_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(council, user_id)
);

CREATE TABLE awards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  council TEXT NOT NULL,
  award_type TEXT NOT NULL,
  given_by TEXT NOT NULL REFERENCES users(id),
  notes TEXT,
  given_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Phase 5: Press & Social Feed
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER
);

CREATE TABLE post_media (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  media_type TEXT NOT NULL CHECK(media_type IN ('image','video')),
  r2_key TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  CHECK(display_order < 2)
);

CREATE TABLE post_likes (
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  liked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY(post_id, user_id)
);

CREATE TABLE post_replies (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id),
  author_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Phase 7: Performance Indexes
CREATE INDEX idx_attendance_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_session ON attendance_records(session_label, scanned_at);
CREATE INDEX idx_posts_feed ON posts(created_at DESC);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_replies_post ON post_replies(post_id, created_at);
CREATE INDEX idx_likes_post ON post_likes(post_id);
