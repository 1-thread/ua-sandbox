-- Nuclear cleanup: Delete ALL IP-specific deliverables and related data
-- Then re-initialize cleanly

-- Step 1: Delete acceptance criteria for IP-specific deliverables
DELETE FROM acceptance_criteria
WHERE deliverable_id IN (
  SELECT id FROM deliverables WHERE ip_id IS NOT NULL
);

-- Step 2: Delete aliases for IP-specific deliverables
DELETE FROM deliverable_aliases
WHERE deliverable_id IN (
  SELECT id FROM deliverables WHERE ip_id IS NOT NULL
);

-- Step 3: Delete ALL IP-specific deliverables
DELETE FROM deliverables 
WHERE ip_id IS NOT NULL;

-- Step 4: Verify cleanup
SELECT 
  'After Cleanup' as step,
  COUNT(*) FILTER (WHERE ip_id IS NULL) as template_count,
  COUNT(*) FILTER (WHERE ip_id IS NOT NULL) as ip_specific_count
FROM deliverables;

-- Step 5: Re-create the initialization function (to ensure it has the latest fix)
-- (You'll need to re-run ontology-initializer.sql after this)

-- Step 6: Re-initialize
SELECT 'Re-initializing Doh World...' as status;
SELECT * FROM initialize_ip_ontology('doh-world');

SELECT 'Re-initializing Squid Ninja...' as status;
SELECT * FROM initialize_ip_ontology('squid-ninja');

SELECT 'Re-initializing Trapdoor City...' as status;
SELECT * FROM initialize_ip_ontology('trapdoor-city');

-- Step 7: Final check
SELECT 
  i.name as ip_name,
  COUNT(DISTINCT d.id) as deliverable_count,
  COUNT(DISTINCT (d.task_id, d.deliverable_id)) as unique_combinations
FROM ips i
LEFT JOIN deliverables d ON d.ip_id = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

