-- Check for duplicate tasks in the database
-- This will help identify if tasks are duplicated or if task_id values are incorrect

-- 1. Check total tasks per function
SELECT 
  f.code as function_code,
  f.title as function_title,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT t.task_id) as unique_task_ids,
  string_agg(DISTINCT t.task_id, ', ' ORDER BY t.task_id) as task_ids
FROM functions f
LEFT JOIN tasks t ON t.function_code = f.code
GROUP BY f.id, f.code, f.title
ORDER BY f.code;

-- 2. Check for duplicate task_id values within the same function
SELECT 
  f.code as function_code,
  t.task_id,
  COUNT(*) as duplicate_count
FROM functions f
JOIN tasks t ON t.function_code = f.code
GROUP BY f.code, t.task_id
HAVING COUNT(*) > 1
ORDER BY f.code, t.task_id;

-- 3. Check total unique tasks per category
SELECT 
  f.category,
  COUNT(DISTINCT f.code) as function_count,
  COUNT(DISTINCT t.id) as total_task_count,
  COUNT(DISTINCT t.task_id) as unique_task_id_count
FROM functions f
LEFT JOIN tasks t ON t.function_code = f.code
GROUP BY f.category
ORDER BY f.category;

-- 4. Sample tasks to see the format (all functions)
SELECT 
  f.code as function_code,
  t.task_id,
  t.title,
  t.id
FROM functions f
JOIN tasks t ON t.function_code = f.code
ORDER BY f.code, t.task_id;

