-- Complete fix: Link functions and initialize all IPs
-- Run this script to fix the missing function links and initialize deliverables

-- Step 1: Link functions to all IPs based on their verticals
INSERT INTO ip_functions (ip_id, function_code)
SELECT DISTINCT i.id, f.code
FROM ips i
INNER JOIN ip_verticals iv ON iv.ip_id = i.id
INNER JOIN functions f ON f.category = iv.vertical_name
ON CONFLICT (ip_id, function_code) DO NOTHING;

-- Step 2: Show what was linked
SELECT 
  'Functions Linked' as step,
  i.name as ip_name,
  COUNT(if.function_code) as function_count
FROM ips i
LEFT JOIN ip_functions if ON if.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- Step 3: Initialize all IPs
-- Note: This will create IP-specific deliverables for each IP
SELECT 'Initializing Doh World...' as status;
SELECT * FROM initialize_ip_ontology('doh-world');

SELECT 'Initializing Squid Ninja...' as status;
SELECT * FROM initialize_ip_ontology('squid-ninja');

SELECT 'Initializing Trapdoor City...' as status;
SELECT * FROM initialize_ip_ontology('trapdoor-city');

-- Step 4: Final check
SELECT 
  'Final Status' as step,
  i.name as ip_name,
  COUNT(DISTINCT if.function_code) as function_count,
  COUNT(d.id) as deliverable_count
FROM ips i
LEFT JOIN ip_functions if ON if.ip_id = i.id
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

