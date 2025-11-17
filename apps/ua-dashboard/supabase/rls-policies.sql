-- RLS Policies for Function Editor
-- Run this in Supabase SQL Editor to enable INSERT, UPDATE, DELETE operations
-- This allows the function editor to create, update, and delete functions and related data

-- Functions table policies
CREATE POLICY "Allow public insert on functions" ON functions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on functions" ON functions
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on functions" ON functions
  FOR DELETE
  USING (true);

-- Function Guardrails policies
CREATE POLICY "Allow public insert on function_guardrails" ON function_guardrails
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on function_guardrails" ON function_guardrails
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on function_guardrails" ON function_guardrails
  FOR DELETE
  USING (true);

-- Tasks policies
CREATE POLICY "Allow public insert on tasks" ON tasks
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on tasks" ON tasks
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on tasks" ON tasks
  FOR DELETE
  USING (true);

-- Deliverables policies
CREATE POLICY "Allow public insert on deliverables" ON deliverables
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on deliverables" ON deliverables
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on deliverables" ON deliverables
  FOR DELETE
  USING (true);

-- Deliverable Aliases policies
CREATE POLICY "Allow public insert on deliverable_aliases" ON deliverable_aliases
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on deliverable_aliases" ON deliverable_aliases
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on deliverable_aliases" ON deliverable_aliases
  FOR DELETE
  USING (true);

-- Acceptance Criteria policies
CREATE POLICY "Allow public insert on acceptance_criteria" ON acceptance_criteria
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on acceptance_criteria" ON acceptance_criteria
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on acceptance_criteria" ON acceptance_criteria
  FOR DELETE
  USING (true);

-- Function Dependencies policies (if you want to edit these too)
CREATE POLICY "Allow public insert on function_dependencies" ON function_dependencies
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on function_dependencies" ON function_dependencies
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow public delete on function_dependencies" ON function_dependencies
  FOR DELETE
  USING (true);

