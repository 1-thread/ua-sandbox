-- Complete Cleanup and Re-initialization
-- This script removes ALL IP-specific deliverables and re-creates them properly

-- Step 1: Show current state
SELECT 
  'Before Cleanup' as step,
  i.name as ip_name,
  COUNT(d.id) as deliverable_count
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- Step 2: Delete ALL IP-specific deliverables (we'll recreate them)
DELETE FROM deliverables 
WHERE ip_id IS NOT NULL;

-- Step 3: Show state after deletion
SELECT 
  'After Cleanup' as step,
  i.name as ip_name,
  COUNT(d.id) as deliverable_count
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- Step 4: Verify generic templates still exist
SELECT 
  'Generic Templates' as step,
  COUNT(*) as template_count
FROM deliverables
WHERE ip_id IS NULL;

-- Step 5: Re-initialize all IPs (this will create proper copies)
SELECT 'Initializing Doh World...' as status;
SELECT * FROM initialize_ip_ontology('doh-world');

SELECT 'Initializing Squid Ninja...' as status;
SELECT * FROM initialize_ip_ontology('squid-ninja');

SELECT 'Initializing Trapdoor City...' as status;
SELECT * FROM initialize_ip_ontology('trapdoor-city');

-- Step 6: Final verification
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

-- Expected: Each IP should have ~193 deliverables (one copy of each template)

