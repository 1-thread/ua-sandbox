-- Final Fix Procedure
-- Run these steps in order:

-- Step 1: Run deep diagnosis to understand the problem
-- (Run supabase/deep-diagnose.sql first to see what's happening)

-- Step 2: Nuclear cleanup - delete ALL IP-specific deliverables
DELETE FROM acceptance_criteria
WHERE deliverable_id IN (SELECT id FROM deliverables WHERE ip_id IS NOT NULL);

DELETE FROM deliverable_aliases
WHERE deliverable_id IN (SELECT id FROM deliverables WHERE ip_id IS NOT NULL);

DELETE FROM deliverables WHERE ip_id IS NOT NULL;

-- Step 3: Re-create the initialization function with the latest fix
-- (Re-run supabase/ontology-initializer.sql to update the function)

-- Step 4: Re-initialize all IPs
SELECT 'Initializing Doh World...' as status;
SELECT * FROM initialize_ip_ontology('doh-world');

SELECT 'Initializing Squid Ninja...' as status;
SELECT * FROM initialize_ip_ontology('squid-ninja');

SELECT 'Initializing Trapdoor City...' as status;
SELECT * FROM initialize_ip_ontology('trapdoor-city');

-- Step 5: Verify results
SELECT 
  i.name as ip_name,
  COUNT(DISTINCT d.id) as deliverable_count,
  COUNT(DISTINCT (d.task_id, d.deliverable_id)) as unique_combinations
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- Expected: Each IP should have ~193 deliverables (one per template)
-- The unique_combinations should equal deliverable_count (no duplicates)

