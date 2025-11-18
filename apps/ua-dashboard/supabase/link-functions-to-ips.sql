-- Manually link functions to IPs based on their verticals
-- This ensures all IPs have functions linked before initialization

-- Link functions for Doh World
INSERT INTO ip_functions (ip_id, function_code)
SELECT DISTINCT i.id, f.code
FROM ips i
INNER JOIN ip_verticals iv ON iv.ip_id = i.id
INNER JOIN functions f ON f.category = iv.vertical_name
WHERE i.slug = 'doh-world'
ON CONFLICT (ip_id, function_code) DO NOTHING;

-- Link functions for Squid Ninja
INSERT INTO ip_functions (ip_id, function_code)
SELECT DISTINCT i.id, f.code
FROM ips i
INNER JOIN ip_verticals iv ON iv.ip_id = i.id
INNER JOIN functions f ON f.category = iv.vertical_name
WHERE i.slug = 'squid-ninja'
ON CONFLICT (ip_id, function_code) DO NOTHING;

-- Link functions for Trapdoor City
INSERT INTO ip_functions (ip_id, function_code)
SELECT DISTINCT i.id, f.code
FROM ips i
INNER JOIN ip_verticals iv ON iv.ip_id = i.id
INNER JOIN functions f ON f.category = iv.vertical_name
WHERE i.slug = 'trapdoor-city'
ON CONFLICT (ip_id, function_code) DO NOTHING;

-- Show results
SELECT 
  i.name as ip_name,
  i.slug,
  COUNT(if.function_code) as functions_linked,
  string_agg(f.code, ', ' ORDER BY f.code) as function_codes
FROM ips i
LEFT JOIN ip_functions if ON if.ip_id = i.id
LEFT JOIN functions f ON f.code = if.function_code
GROUP BY i.id, i.name, i.slug
ORDER BY i.name;

