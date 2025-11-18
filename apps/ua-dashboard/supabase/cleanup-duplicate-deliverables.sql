-- Clean up duplicate deliverables
-- This script removes duplicate IP-specific deliverables, keeping only one per (task_id, deliverable_id, ip_id)

-- First, check how many duplicates exist
SELECT 
  i.name as ip_name,
  d.deliverable_id,
  d.task_id,
  COUNT(*) as duplicate_count
FROM ips i
JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name, d.deliverable_id, d.task_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Delete duplicates, keeping the oldest one (lowest id)
DELETE FROM deliverables d1
WHERE d1.ip_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM deliverables d2
    WHERE d2.task_id = d1.task_id
      AND d2.deliverable_id = d1.deliverable_id
      AND d2.ip_id = d1.ip_id
      AND d2.id < d1.id  -- Keep the one with smaller id (older)
  );

-- Show final counts after cleanup
SELECT 
  i.name as ip_name,
  COUNT(d.id) as deliverable_count
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

