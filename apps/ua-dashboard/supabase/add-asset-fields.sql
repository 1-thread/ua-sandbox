-- Add status and storage_path fields to deliverables table for asset management
-- Run this in Supabase SQL Editor

ALTER TABLE deliverables 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'In Progress', 'Completed', 'Approved', 'Needs Review')),
ADD COLUMN IF NOT EXISTS storage_path TEXT; -- Path in Supabase Storage (e.g., 'ip-assets/doh-world/E1-T1-D1.pdf')

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_deliverables_status ON deliverables(status);

-- Update RLS policies to allow INSERT, UPDATE, DELETE for asset management
DROP POLICY IF EXISTS "Allow public insert on deliverables" ON deliverables;
DROP POLICY IF EXISTS "Allow public update on deliverables" ON deliverables;
DROP POLICY IF EXISTS "Allow public delete on deliverables" ON deliverables;

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

