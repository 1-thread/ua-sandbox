-- Verify Function Structure
-- Check if the database matches the expected structure from JSON files

-- Expected counts:
-- Entertainment: E1-E8 (8 functions)
-- Game: G1-G7 (7 functions)  
-- Product: P1-P7 (7 functions)
-- Total: 22 functions

SELECT 
  'Function Count by Category' as check_type,
  category,
  COUNT(*) as function_count,
  string_agg(code, ', ' ORDER BY code) as function_codes
FROM functions
GROUP BY category
ORDER BY category;

-- Check if we have the expected functions
SELECT 
  'Expected vs Actual' as check_type,
  CASE 
    WHEN category = 'entertainment' AND COUNT(*) = 8 THEN '✓ Correct'
    WHEN category = 'game' AND COUNT(*) = 7 THEN '✓ Correct'
    WHEN category = 'product' AND COUNT(*) = 7 THEN '✓ Correct'
    ELSE '✗ Mismatch'
  END as status,
  category,
  COUNT(*) as actual_count,
  CASE 
    WHEN category = 'entertainment' THEN 8
    WHEN category = 'game' THEN 7
    WHEN category = 'product' THEN 7
  END as expected_count
FROM functions
GROUP BY category
ORDER BY category;

