-- Deep diagnosis to understand why we're getting 4439 deliverables

-- 1. Check how many unique (task_id, deliverable_id) combinations exist per IP
SELECT 
  i.name as ip_name,
  COUNT(DISTINCT (d.task_id, d.deliverable_id)) as unique_combinations,
  COUNT(d.id) as total_deliverables,
  COUNT(d.id) / NULLIF(COUNT(DISTINCT (d.task_id, d.deliverable_id)), 0) as avg_duplicates
FROM ips i
JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- 2. Check if the unique constraint is working
SELECT 
  d.task_id,
  d.deliverable_id,
  d.ip_id,
  COUNT(*) as count
FROM deliverables d
WHERE d.ip_id IS NOT NULL
GROUP BY d.task_id, d.deliverable_id, d.ip_id
HAVING COUNT(*) > 1
LIMIT 10;

-- 3. Check how many tasks exist for the linked functions
SELECT 
  i.name as ip_name,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT if.function_code) as function_count
FROM ips i
JOIN ip_functions if ON if.ip_id = i.id
JOIN tasks t ON t.function_code = if.function_code
GROUP BY i.id, i.name
ORDER BY i.name;

-- 4. Check how many deliverables exist per task (should be same for all IPs if working correctly)
SELECT 
  t.task_id,
  COUNT(DISTINCT d.id) FILTER (WHERE d.ip_id IS NULL) as template_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.ip_id = (SELECT id FROM ips WHERE slug = 'doh-world')) as doh_world_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.ip_id = (SELECT id FROM ips WHERE slug = 'squid-ninja')) as squid_ninja_count,
  COUNT(DISTINCT d.id) FILTER (WHERE d.ip_id = (SELECT id FROM ips WHERE slug = 'trapdoor-city')) as trapdoor_city_count
FROM tasks t
LEFT JOIN deliverables d ON d.task_id = t.id
GROUP BY t.id, t.task_id
HAVING COUNT(DISTINCT d.id) FILTER (WHERE d.ip_id IS NULL) > 0
ORDER BY t.task_id
LIMIT 20;

