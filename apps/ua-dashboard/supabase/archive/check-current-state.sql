-- Check Current State of Dataset
-- Run this to understand what's generic vs IP-specific

-- 1. Check generic functions (templates)
SELECT 
  'Generic Functions' as data_type,
  COUNT(*) as count,
  string_agg(code, ', ' ORDER BY code) as examples
FROM functions;

-- 2. Check generic tasks (templates)
SELECT 
  'Generic Tasks' as data_type,
  COUNT(*) as count,
  (SELECT string_agg(task_id, ', ' ORDER BY task_id) 
   FROM (SELECT task_id FROM tasks ORDER BY task_id LIMIT 10) t) as examples
FROM tasks;

-- 3. Check generic deliverables (templates)
SELECT 
  'Generic Deliverables' as data_type,
  COUNT(*) as count,
  (SELECT string_agg(deliverable_id, ', ' ORDER BY deliverable_id) 
   FROM (SELECT deliverable_id FROM deliverables ORDER BY deliverable_id LIMIT 10) d) as examples
FROM deliverables;

-- 4. Check IPs
SELECT 
  'IPs' as data_type,
  COUNT(*) as count,
  string_agg(name, ', ') as examples
FROM ips;

-- 5. Check IP-Function mappings
SELECT 
  'IP-Function Mappings' as data_type,
  COUNT(*) as count,
  i.name as ip_name,
  COUNT(if.function_code) as function_count
FROM ips i
LEFT JOIN ip_functions if ON i.id = if.ip_id
GROUP BY i.id, i.name
ORDER BY i.name;

-- 6. Check if deliverables have ip_id (should be NULL for templates)
-- NOTE: Uncomment this query ONLY AFTER running supabase/add-ip-id-to-deliverables.sql
-- If you get an error about ip_id not existing, run the schema update first.

SELECT 
  'Deliverables with IP' as data_type,
  COUNT(*) FILTER (WHERE ip_id IS NULL) as template_count,
  COUNT(*) FILTER (WHERE ip_id IS NOT NULL) as ip_specific_count
FROM deliverables;


