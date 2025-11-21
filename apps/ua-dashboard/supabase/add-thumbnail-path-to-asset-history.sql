-- Add thumbnail_path field to asset_history for image thumbnails
ALTER TABLE asset_history
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Create index for faster thumbnail lookups
CREATE INDEX IF NOT EXISTS idx_asset_history_thumbnail_path ON asset_history(thumbnail_path) WHERE thumbnail_path IS NOT NULL;

