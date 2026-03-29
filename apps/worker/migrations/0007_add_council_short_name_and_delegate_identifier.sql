-- Add short_name to councils table
ALTER TABLE councils ADD COLUMN short_name TEXT;

-- Add unique identifier to delegate_profiles table
-- Format: {council_short_name}-{sequential_number}, e.g. SC-001
ALTER TABLE delegate_profiles ADD COLUMN identifier TEXT;

-- Create unique index on identifier
CREATE UNIQUE INDEX IF NOT EXISTS idx_delegate_profiles_identifier ON delegate_profiles(identifier);
