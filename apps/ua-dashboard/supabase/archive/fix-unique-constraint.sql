-- Fix the unique constraint to work properly with ON CONFLICT
-- The current index might not be working as expected

-- Drop the existing index
DROP INDEX IF EXISTS deliverables_task_id_deliverable_id_ip_id_key;

-- Create a proper unique constraint (not just an index)
-- This will work with ON CONFLICT
ALTER TABLE deliverables
DROP CONSTRAINT IF EXISTS deliverables_task_id_deliverable_id_ip_id_key;

-- Create unique constraint using a function-based approach
-- Since we can't use COALESCE directly in a constraint, we'll use a unique index with a function
CREATE UNIQUE INDEX deliverables_task_id_deliverable_id_ip_id_key 
ON deliverables(task_id, deliverable_id, COALESCE(ip_id::text, 'template'::text));

-- Verify the constraint exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'deliverables'
  AND indexname = 'deliverables_task_id_deliverable_id_ip_id_key';

