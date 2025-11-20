-- Asset History Table
-- Tracks all uploads of assets for deliverables, including versioning

CREATE TABLE IF NOT EXISTS asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  contributor_id UUID REFERENCES contributors(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- Full path to the file in storage
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_asset_history_deliverable_id ON asset_history(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_contributor_id ON asset_history(contributor_id);
CREATE INDEX IF NOT EXISTS idx_asset_history_uploaded_at ON asset_history(uploaded_at DESC);

-- Enable RLS
ALTER TABLE asset_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access on asset_history" ON asset_history
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on asset_history" ON asset_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on asset_history" ON asset_history
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on asset_history" ON asset_history
  FOR DELETE USING (true);

