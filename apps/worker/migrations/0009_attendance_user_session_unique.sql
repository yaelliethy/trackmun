CREATE UNIQUE INDEX IF NOT EXISTS attendance_records_user_session_unique
ON attendance_records (user_id, session_label);
