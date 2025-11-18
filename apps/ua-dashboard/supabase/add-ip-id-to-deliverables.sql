-- Add ip_id to deliverables table to distinguish templates from IP-specific deliverables
-- Run this in Supabase SQL Editor

-- Add ip_id column (nullable - NULL means it's a generic template)
ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS ip_id UUID REFERENCES ips(id) ON DELETE CASCADE;

-- Create index for IP-specific queries
CREATE INDEX IF NOT EXISTS idx_deliverables_ip_id ON deliverables(ip_id);

-- Update unique constraint to allow same deliverable_id for different IPs
-- But keep uniqueness within same task and IP (or NULL for templates)
ALTER TABLE deliverables 
DROP CONSTRAINT IF EXISTS deliverables_task_id_deliverable_id_key;

-- New constraint: unique per (task_id, deliverable_id, ip_id)
-- This allows:
-- - Multiple IPs to have the same deliverable_id for the same task (different ip_id)
-- - Templates to be unique per task (ip_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS deliverables_task_id_deliverable_id_ip_id_key 
ON deliverables(task_id, deliverable_id, COALESCE(ip_id::text, 'template'));

-- Update RLS policies if needed (should already exist from add-asset-fields.sql)
-- But ensure they work with ip_id filtering

