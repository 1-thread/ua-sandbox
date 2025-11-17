-- Fix RLS Policies for Function Editor
-- Run this in Supabase SQL Editor
-- This will drop existing policies and create new ones with proper permissions

-- First, drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow public insert on functions" ON functions;
DROP POLICY IF EXISTS "Allow public update on functions" ON functions;
DROP POLICY IF EXISTS "Allow public delete on functions" ON functions;

DROP POLICY IF EXISTS "Allow public insert on function_guardrails" ON function_guardrails;
DROP POLICY IF EXISTS "Allow public update on function_guardrails" ON function_guardrails;
DROP POLICY IF EXISTS "Allow public delete on function_guardrails" ON function_guardrails;

DROP POLICY IF EXISTS "Allow public insert on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public update on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow public delete on tasks" ON tasks;

DROP POLICY IF EXISTS "Allow public insert on deliverables" ON deliverables;
DROP POLICY IF EXISTS "Allow public update on deliverables" ON deliverables;
DROP POLICY IF EXISTS "Allow public delete on deliverables" ON deliverables;

DROP POLICY IF EXISTS "Allow public insert on deliverable_aliases" ON deliverable_aliases;
DROP POLICY IF EXISTS "Allow public update on deliverable_aliases" ON deliverable_aliases;
DROP POLICY IF EXISTS "Allow public delete on deliverable_aliases" ON deliverable_aliases;

DROP POLICY IF EXISTS "Allow public insert on acceptance_criteria" ON acceptance_criteria;
DROP POLICY IF EXISTS "Allow public update on acceptance_criteria" ON acceptance_criteria;
DROP POLICY IF EXISTS "Allow public delete on acceptance_criteria" ON acceptance_criteria;

DROP POLICY IF EXISTS "Allow public insert on function_dependencies" ON function_dependencies;
DROP POLICY IF EXISTS "Allow public update on function_dependencies" ON function_dependencies;
DROP POLICY IF EXISTS "Allow public delete on function_dependencies" ON function_dependencies;

-- Now create the policies with proper syntax
-- Functions table policies
CREATE POLICY "Allow public insert on functions" ON functions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on functions" ON functions
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on functions" ON functions
  FOR DELETE
  TO public
  USING (true);

-- Function Guardrails policies
CREATE POLICY "Allow public insert on function_guardrails" ON function_guardrails
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on function_guardrails" ON function_guardrails
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on function_guardrails" ON function_guardrails
  FOR DELETE
  TO public
  USING (true);

-- Tasks policies
CREATE POLICY "Allow public insert on tasks" ON tasks
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on tasks" ON tasks
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on tasks" ON tasks
  FOR DELETE
  TO public
  USING (true);

-- Deliverables policies
CREATE POLICY "Allow public insert on deliverables" ON deliverables
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on deliverables" ON deliverables
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on deliverables" ON deliverables
  FOR DELETE
  TO public
  USING (true);

-- Deliverable Aliases policies
CREATE POLICY "Allow public insert on deliverable_aliases" ON deliverable_aliases
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on deliverable_aliases" ON deliverable_aliases
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on deliverable_aliases" ON deliverable_aliases
  FOR DELETE
  TO public
  USING (true);

-- Acceptance Criteria policies
CREATE POLICY "Allow public insert on acceptance_criteria" ON acceptance_criteria
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on acceptance_criteria" ON acceptance_criteria
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on acceptance_criteria" ON acceptance_criteria
  FOR DELETE
  TO public
  USING (true);

-- Function Dependencies policies
CREATE POLICY "Allow public insert on function_dependencies" ON function_dependencies
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update on function_dependencies" ON function_dependencies
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on function_dependencies" ON function_dependencies
  FOR DELETE
  TO public
  USING (true);

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('functions', 'function_guardrails', 'tasks', 'deliverables', 'deliverable_aliases', 'acceptance_criteria', 'function_dependencies')
ORDER BY tablename, policyname;

