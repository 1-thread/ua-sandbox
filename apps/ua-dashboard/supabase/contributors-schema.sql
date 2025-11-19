-- Contributors table schema
CREATE TABLE IF NOT EXISTS contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  expertise TEXT[] DEFAULT '{}', -- Array of expertise strings
  roles TEXT[] DEFAULT '{}', -- Array of role strings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contributor deliverables (many-to-many relationship)
CREATE TABLE IF NOT EXISTS contributor_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contributor_id UUID REFERENCES contributors(id) ON DELETE CASCADE NOT NULL,
  deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'Assigned', -- 'Assigned', 'Completed'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(contributor_id, deliverable_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contributor_deliverables_contributor ON contributor_deliverables(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributor_deliverables_deliverable ON contributor_deliverables(deliverable_id);

-- Enable Row Level Security
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributor_deliverables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contributors (public read, authenticated write)
CREATE POLICY "Contributors are viewable by everyone" ON contributors
  FOR SELECT USING (true);

CREATE POLICY "Contributors are insertable by authenticated users" ON contributors
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Contributors are updatable by authenticated users" ON contributors
  FOR UPDATE USING (true);

CREATE POLICY "Contributors are deletable by authenticated users" ON contributors
  FOR DELETE USING (true);

-- RLS Policies for contributor_deliverables
CREATE POLICY "Contributor deliverables are viewable by everyone" ON contributor_deliverables
  FOR SELECT USING (true);

CREATE POLICY "Contributor deliverables are insertable by authenticated users" ON contributor_deliverables
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Contributor deliverables are updatable by authenticated users" ON contributor_deliverables
  FOR UPDATE USING (true);

CREATE POLICY "Contributor deliverables are deletable by authenticated users" ON contributor_deliverables
  FOR DELETE USING (true);

