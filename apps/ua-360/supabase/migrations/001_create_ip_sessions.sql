-- Create ip_sessions table for storing generation sessions

CREATE TABLE IF NOT EXISTS ip_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_idea TEXT NOT NULL,
  story_title TEXT NOT NULL,
  story_logline TEXT NOT NULL,
  story_config JSONB NOT NULL,
  game_config JSONB NOT NULL,
  comic_panel_urls JSONB NOT NULL, -- array of strings
  model_3d_url TEXT NOT NULL,
  character_name TEXT,
  notes TEXT
);

-- Create index on created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_ip_sessions_created_at ON ip_sessions(created_at DESC);

-- Enable Row Level Security (optional, adjust as needed)
ALTER TABLE ip_sessions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to insert (adjust based on your auth setup)
CREATE POLICY "Service role can insert" ON ip_sessions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read" ON ip_sessions
  FOR SELECT
  USING (true);

