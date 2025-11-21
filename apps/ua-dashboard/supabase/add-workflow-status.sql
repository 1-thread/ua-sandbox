-- Add status field to workflows table
-- Default all workflows to 'under development'
-- Set 'txt2img' workflow to 'production'

ALTER TABLE workflows
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'under development';

-- Update txt2img workflow to production
UPDATE workflows
SET status = 'production'
WHERE workflow_id = 'txt2img';

-- Set all other workflows to under development (if they're NULL)
UPDATE workflows
SET status = 'under development'
WHERE status IS NULL;

