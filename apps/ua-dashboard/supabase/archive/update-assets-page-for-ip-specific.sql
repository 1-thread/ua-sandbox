-- Update Assets Page Query to Filter by IP
-- This ensures the assets page only shows IP-specific deliverables
-- (where ip_id matches the current IP)

-- The assets page should query deliverables with:
-- WHERE ip_id = <current_ip_id>
-- This way it only shows IP-specific deliverables, not generic templates

-- No schema changes needed, just a note for the application code

