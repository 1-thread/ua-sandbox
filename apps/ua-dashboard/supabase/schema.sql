-- UA Dashboard Database Schema
-- Run this in Supabase SQL Editor to create all required tables

-- Main IPs table
CREATE TABLE IF NOT EXISTS ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL, -- e.g., 'doh-world'
  name TEXT NOT NULL, -- e.g., 'Doh World'
  icon_url TEXT, -- URL to icon image
  representative_image_url TEXT, -- Main hero image
  description TEXT, -- Full text description
  health_summary TEXT, -- Health status summary
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IP Verticals (many-to-many: each IP can have multiple verticals)
CREATE TABLE IF NOT EXISTS ip_verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_id UUID REFERENCES ips(id) ON DELETE CASCADE NOT NULL,
  vertical_name TEXT NOT NULL, -- 'game', 'entertainment', 'product', etc.
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_id, vertical_name) -- Prevent duplicate verticals per IP
);

-- Core Functions (from functions folder: E1, G1, P1, etc.)
CREATE TABLE IF NOT EXISTS functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'E1', 'G1', 'P1', etc.
  title TEXT NOT NULL,
  category TEXT NOT NULL, -- 'entertainment', 'game', 'product'
  phase TEXT, -- 'R&D', etc.
  purpose TEXT,
  source_md TEXT, -- Path to source markdown file
  position_x FLOAT, -- X position for graph layout (optional)
  position_y FLOAT, -- Y position for graph layout (optional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function Dependencies (relationships between functions)
CREATE TABLE IF NOT EXISTS function_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_function_code TEXT REFERENCES functions(code) ON DELETE CASCADE NOT NULL,
  to_function_code TEXT REFERENCES functions(code) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_function_code, to_function_code),
  CHECK (from_function_code != to_function_code) -- Prevent self-references
);

-- IP-Function Mapping (many-to-many: each IP can have multiple functions)
CREATE TABLE IF NOT EXISTS ip_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_id UUID REFERENCES ips(id) ON DELETE CASCADE NOT NULL,
  function_code TEXT REFERENCES functions(code) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_id, function_code) -- Prevent duplicate function assignments per IP
);

-- Function Guardrails
CREATE TABLE IF NOT EXISTS function_guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_code TEXT REFERENCES functions(code) ON DELETE CASCADE NOT NULL,
  guardrail_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks (linked to functions)
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_code TEXT REFERENCES functions(code) ON DELETE CASCADE NOT NULL,
  task_id TEXT NOT NULL, -- 'E1-T1', 'G1-T2', etc.
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(function_code, task_id) -- Prevent duplicate task IDs per function
);

-- Deliverables (linked to tasks)
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
  deliverable_id TEXT NOT NULL, -- 'E1-T1-D1', etc.
  filename TEXT NOT NULL,
  filetype TEXT, -- 'pdf', 'docx', 'pptx', etc.
  path_hint TEXT, -- Path hint for file location
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, deliverable_id) -- Prevent duplicate deliverable IDs per task
);

-- Deliverable Aliases (multiple aliases per deliverable)
CREATE TABLE IF NOT EXISTS deliverable_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deliverable_id, alias) -- Prevent duplicate aliases
);

-- Acceptance Criteria (linked to deliverables)
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  criteria_id TEXT NOT NULL, -- 'AC-1', 'AC-2', etc.
  criteria_text TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deliverable_id, criteria_id) -- Prevent duplicate criteria IDs per deliverable
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ip_verticals_ip_id ON ip_verticals(ip_id);
CREATE INDEX IF NOT EXISTS idx_ip_functions_ip_id ON ip_functions(ip_id);
CREATE INDEX IF NOT EXISTS idx_ip_functions_function_code ON ip_functions(function_code);
CREATE INDEX IF NOT EXISTS idx_functions_code ON functions(code);
CREATE INDEX IF NOT EXISTS idx_functions_category ON functions(category);
CREATE INDEX IF NOT EXISTS idx_function_dependencies_from ON function_dependencies(from_function_code);
CREATE INDEX IF NOT EXISTS idx_function_dependencies_to ON function_dependencies(to_function_code);
CREATE INDEX IF NOT EXISTS idx_function_guardrails_function_code ON function_guardrails(function_code);
CREATE INDEX IF NOT EXISTS idx_tasks_function_code ON tasks(function_code);
CREATE INDEX IF NOT EXISTS idx_deliverables_task_id ON deliverables(task_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_aliases_deliverable_id ON deliverable_aliases(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_deliverable_id ON acceptance_criteria(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_ips_slug ON ips(slug);

-- Enable Row Level Security (RLS) - allow public read access
ALTER TABLE ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE function_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverable_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE acceptance_criteria ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on ips" ON ips
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on ip_verticals" ON ip_verticals
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on functions" ON functions
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on function_dependencies" ON function_dependencies
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on ip_functions" ON ip_functions
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on function_guardrails" ON function_guardrails
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on tasks" ON tasks
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on deliverables" ON deliverables
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on deliverable_aliases" ON deliverable_aliases
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on acceptance_criteria" ON acceptance_criteria
  FOR SELECT USING (true);

