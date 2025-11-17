-- Create backup table for function editor rollback functionality
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS function_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT -- Optional: track who created the backup
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_function_backups_created_at ON function_backups(created_at DESC);

-- Enable RLS (optional - you may want to restrict access)
ALTER TABLE function_backups ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (adjust based on your security needs)
CREATE POLICY "Allow public access to backups" ON function_backups
  FOR ALL USING (true);

-- Optional: Add a comment
COMMENT ON TABLE function_backups IS 'Stores backups of function data for rollback functionality';

