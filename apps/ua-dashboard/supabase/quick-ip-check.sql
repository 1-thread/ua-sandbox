-- Quick check for all IPs
-- Shows what's missing for each IP

SELECT 
  i.name as ip_name,
  i.slug,
  (SELECT COUNT(*) FROM ip_verticals WHERE ip_id = i.id) as vertical_count,
  (SELECT COUNT(*) FROM ip_functions WHERE ip_id = i.id) as function_count,
  (SELECT COUNT(*) FROM deliverables WHERE ip_id = i.id) as deliverable_count
FROM ips i
ORDER BY i.name;

