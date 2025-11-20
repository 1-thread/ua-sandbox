-- Add role field to contributors table
-- Role can be either 'admin' or 'contributor'

ALTER TABLE contributors 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'contributor' CHECK (role IN ('admin', 'contributor'));

-- Update existing contributors to have 'contributor' role if not set
UPDATE contributors 
SET role = 'contributor' 
WHERE role IS NULL;

-- Make role NOT NULL after setting defaults
ALTER TABLE contributors 
ALTER COLUMN role SET NOT NULL;

