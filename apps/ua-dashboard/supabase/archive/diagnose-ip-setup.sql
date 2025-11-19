-- Diagnose IP Setup
-- Run this to check why an IP might not have deliverables

-- Replace 'squid-ninja' with the IP slug you want to check
\set ip_slug 'squid-ninja'

-- 1. Check if IP exists
SELECT 
  'IP Info' as check_type,
  id,
  slug,
  name
FROM ips 
WHERE slug = :'ip_slug';

-- 2. Check IP's verticals
SELECT 
  'IP Verticals' as check_type,
  iv.vertical_name,
  iv.progress_percentage
FROM ips i
JOIN ip_verticals iv ON iv.ip_id = i.id
WHERE i.slug = :'ip_slug';

-- 3. Check if functions are linked to IP
SELECT 
  'IP Functions' as check_type,
  COUNT(*) as function_count,
  string_agg(f.code, ', ' ORDER BY f.code) as function_codes
FROM ips i
LEFT JOIN ip_functions if ON if.ip_id = i.id
LEFT JOIN functions f ON f.code = if.function_code
WHERE i.slug = :'ip_slug'
GROUP BY i.id;

-- 4. Check available functions for IP's verticals
SELECT 
  'Available Functions' as check_type,
  f.code,
  f.category,
  f.title
FROM ips i
JOIN ip_verticals iv ON iv.ip_id = i.id
JOIN functions f ON f.category = iv.vertical_name
WHERE i.slug = :'ip_slug'
ORDER BY f.code;

-- 5. Check if tasks exist for linked functions
SELECT 
  'Tasks for IP Functions' as check_type,
  COUNT(*) as task_count
FROM ips i
JOIN ip_functions if ON if.ip_id = i.id
JOIN tasks t ON t.function_code = if.function_code
WHERE i.slug = :'ip_slug';

-- 6. Check if generic deliverables exist for IP's tasks
SELECT 
  'Generic Deliverables' as check_type,
  COUNT(*) as deliverable_count
FROM ips i
JOIN ip_functions if ON if.ip_id = i.id
JOIN tasks t ON t.function_code = if.function_code
JOIN deliverables d ON d.task_id = t.id
WHERE i.slug = :'ip_slug'
  AND d.ip_id IS NULL; -- Only generic templates

-- 7. Check IP-specific deliverables
SELECT 
  'IP-Specific Deliverables' as check_type,
  COUNT(*) as deliverable_count
FROM ips i
JOIN deliverables d ON d.ip_id = i.id
WHERE i.slug = :'ip_slug';

