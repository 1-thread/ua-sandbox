-- Workflow Results Table
-- Caches workflow execution results (prompts and outputs) for background processing and history

CREATE TABLE IF NOT EXISTS workflow_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL, -- 'txt2img', 'img2actions', etc.
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
  contributor_id UUID REFERENCES contributors(id) ON DELETE SET NULL,
  context_prompt TEXT NOT NULL, -- Read-only context prompt
  user_prompt TEXT NOT NULL, -- User's editable prompt
  output_text TEXT, -- Text output (if any)
  output_image_url TEXT, -- URL to generated image (if any)
  model_used TEXT, -- e.g., 'OpenAI DALL-E', 'OpenAI GPT-4'
  status TEXT DEFAULT 'processing', -- 'processing', 'completed', 'failed', 'archived', 'deleted'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_prompt_path TEXT, -- Storage path for archived prompt text file
  archived_image_path TEXT -- Storage path for archived image
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workflow_results_workflow_id ON workflow_results(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_results_deliverable_id ON workflow_results(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_workflow_results_contributor_id ON workflow_results(contributor_id);
CREATE INDEX IF NOT EXISTS idx_workflow_results_status ON workflow_results(status);
CREATE INDEX IF NOT EXISTS idx_workflow_results_created_at ON workflow_results(created_at DESC);

-- Enable RLS
ALTER TABLE workflow_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public read access on workflow_results" ON workflow_results
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert on workflow_results" ON workflow_results
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on workflow_results" ON workflow_results
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on workflow_results" ON workflow_results
  FOR DELETE USING (true);

