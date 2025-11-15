-- UA Ontology Database Schema
-- Run this SQL script in your Supabase SQL Editor to create the database structure

-- Main functions table
CREATE TABLE IF NOT EXISTS functions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  phase TEXT,
  purpose TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  guardrails JSONB DEFAULT '[]'::jsonb,
  source_md TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_id UUID REFERENCES functions(id) ON DELETE CASCADE NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(function_id, task_id)
);

-- Deliverables table
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  deliverable_id TEXT NOT NULL,
  filename TEXT,
  filetype TEXT,
  path_hint TEXT,
  description TEXT,
  aliases JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, deliverable_id)
);

-- Acceptance criteria table
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  criterion_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(deliverable_id, criterion_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_functions_code ON functions(code);
CREATE INDEX IF NOT EXISTS idx_functions_phase ON functions(phase);
CREATE INDEX IF NOT EXISTS idx_tasks_function_id ON tasks(function_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_task_id ON deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_deliverable_id ON acceptance_criteria(deliverable_id);

-- Enable Row Level Security
ALTER TABLE functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE acceptance_criteria ENABLE ROW LEVEL SECURITY;

-- Create policies (allow public read access)
DROP POLICY IF EXISTS "Allow public read access" ON functions;
CREATE POLICY "Allow public read access" ON functions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON tasks;
CREATE POLICY "Allow public read access" ON tasks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON deliverables;
CREATE POLICY "Allow public read access" ON deliverables FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access" ON acceptance_criteria;
CREATE POLICY "Allow public read access" ON acceptance_criteria FOR SELECT USING (true);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_functions_updated_at ON functions;
CREATE TRIGGER update_functions_updated_at
  BEFORE UPDATE ON functions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

