-- Add model field to asset_history for workflow-generated assets
ALTER TABLE asset_history
ADD COLUMN IF NOT EXISTS model_used TEXT;

