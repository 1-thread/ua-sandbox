-- Find and Clean Duplicate Tasks
-- This script identifies and removes duplicate tasks that may have been created

-- Step 1: Check for duplicate tasks (same function_code and task_id)
SELECT 
  'Duplicate Tasks Found' as check_type,
  function_code,
  task_id,
  COUNT(*) as duplicate_count,
  string_agg(id::text, ', ' ORDER BY created_at) as task_ids
FROM tasks
GROUP BY function_code, task_id
HAVING COUNT(*) > 1
ORDER BY function_code, task_id;

-- Step 2: Show sample of what will be deleted (keeping the oldest one)
SELECT 
  'Tasks to Delete (duplicates)' as action,
  t1.id,
  t1.function_code,
  t1.task_id,
  t1.title,
  t1.created_at
FROM tasks t1
WHERE EXISTS (
  SELECT 1
  FROM tasks t2
  WHERE t2.function_code = t1.function_code
    AND t2.task_id = t1.task_id
    AND t2.id < t1.id  -- Keep the one with smaller id (older)
)
ORDER BY t1.function_code, t1.task_id, t1.created_at
LIMIT 20;

-- Step 3: Delete duplicate tasks (keeping the oldest one)
-- WARNING: This will cascade delete deliverables for the duplicate tasks
-- Make sure to backup first if needed
DELETE FROM tasks t1
WHERE EXISTS (
  SELECT 1
  FROM tasks t2
  WHERE t2.function_code = t1.function_code
    AND t2.task_id = t1.task_id
    AND t2.id < t1.id  -- Keep the one with smaller id (older)
);

-- Step 4: Verify cleanup
SELECT 
  'After Cleanup' as check_type,
  function_code,
  task_id,
  COUNT(*) as count
FROM tasks
GROUP BY function_code, task_id
HAVING COUNT(*) > 1;

-- Step 5: Show final task counts per function
SELECT 
  f.code as function_code,
  f.category,
  COUNT(t.id) as task_count,
  COUNT(DISTINCT t.task_id) as unique_task_ids
FROM functions f
LEFT JOIN tasks t ON t.function_code = f.code
GROUP BY f.id, f.code, f.category
ORDER BY f.category, f.code;

