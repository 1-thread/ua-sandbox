-- Diagnose why deliverable counts are so high
-- Check for duplicates and see what's actually in the database

-- 1. Check total deliverables per IP
SELECT 
  i.name as ip_name,
  COUNT(d.id) as total_deliverables,
  COUNT(DISTINCT d.deliverable_id) as unique_deliverable_ids,
  COUNT(DISTINCT d.task_id) as unique_tasks
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- 2. Check for duplicate deliverable_id within same IP and task
SELECT 
  i.name as ip_name,
  d.deliverable_id,
  d.task_id,
  COUNT(*) as duplicate_count
FROM ips i
JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name, d.deliverable_id, d.task_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- 3. Check sample deliverables for one IP
SELECT 
  d.deliverable_id,
  d.task_id,
  d.filename,
  d.ip_id,
  t.task_id as task_code,
  f.code as function_code
FROM deliverables d
JOIN tasks t ON t.id = d.task_id
JOIN functions f ON f.code = t.function_code
WHERE d.ip_id = (SELECT id FROM ips WHERE slug = 'doh-world')
ORDER BY d.created_at DESC
LIMIT 20;

-- 4. Check how many generic (template) deliverables exist
SELECT 
  COUNT(*) as generic_deliverable_count
FROM deliverables
WHERE ip_id IS NULL;

