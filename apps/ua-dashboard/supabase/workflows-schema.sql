-- Workflows Database Schema
-- Run this in Supabase SQL Editor

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT UNIQUE NOT NULL, -- 'img2actions', 'txt2img', etc.
  name TEXT NOT NULL,
  description TEXT,
  image_path TEXT, -- Path in Supabase Storage (e.g., 'workflows/img2actions.png')
  supports_upload BOOLEAN DEFAULT false,
  hidden_prompt TEXT, -- System prompt for ChatGPT API
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow steps (directions)
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  step_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow relevant deliverables (many-to-many)
CREATE TABLE IF NOT EXISTS workflow_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE NOT NULL,
  deliverable_code TEXT NOT NULL, -- 'E1-T1-D1', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, deliverable_code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflows_workflow_id ON workflows(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_deliverables_workflow_id ON workflow_deliverables(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_deliverables_code ON workflow_deliverables(deliverable_code);

-- Enable RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_deliverables ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on workflows" ON workflows
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on workflow_steps" ON workflow_steps
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on workflow_deliverables" ON workflow_deliverables
  FOR SELECT USING (true);

-- Allow INSERT/UPDATE for workflows (for admin)
CREATE POLICY "Allow public insert on workflows" ON workflows
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update on workflows" ON workflows
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public insert on workflow_steps" ON workflow_steps
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public insert on workflow_deliverables" ON workflow_deliverables
  FOR INSERT TO public WITH CHECK (true);

