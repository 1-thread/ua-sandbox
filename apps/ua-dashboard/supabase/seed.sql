-- Seed data for testing
-- Run this after creating the schema to add sample data for "Doh World"

-- Insert sample IP
INSERT INTO ips (slug, name, icon_url, representative_image_url, description, health_summary)
VALUES (
  'doh-world',
  'Doh World',
  '/icons/doh-world-icon.svg', -- Update with actual icon path
  '/images/doh-world-hero.jpg', -- Update with actual image path
  'Doh World is an innovative intellectual property that combines gaming, entertainment, and product development into a cohesive universe. The project focuses on creating engaging experiences across multiple verticals while maintaining a consistent brand identity and narrative.',
  'The project is in good health with active development across all verticals. Core functions are stable and the pipeline shows steady progress. Recent milestones have been met on schedule.'
)
ON CONFLICT (slug) DO NOTHING;

-- Get the IP ID for foreign key references
DO $$
DECLARE
  v_ip_id UUID;
BEGIN
  SELECT id INTO v_ip_id FROM ips WHERE slug = 'doh-world';

  -- Insert sample verticals
  INSERT INTO ip_verticals (ip_id, vertical_name, progress_percentage)
  VALUES
    (v_ip_id, 'game', 75),
    (v_ip_id, 'entertainment', 60),
    (v_ip_id, 'product', 45)
  ON CONFLICT (ip_id, vertical_name) DO NOTHING;

  -- Insert sample functions
  INSERT INTO ip_functions (ip_id, function_name, function_type, position_x, position_y)
  VALUES
    (v_ip_id, 'Character System', 'core', 0, 0),
    (v_ip_id, 'World Building', 'core', 100, 0),
    (v_ip_id, 'Narrative Engine', 'core', 50, 100),
    (v_ip_id, 'Asset Management', 'supporting', -100, 100),
    (v_ip_id, 'User Interface', 'supporting', 200, 100),
    (v_ip_id, 'Audio System', 'utility', 0, 200)
  ON CONFLICT DO NOTHING;

  -- Insert function relationships
  INSERT INTO ip_function_relationships (ip_id, from_function_id, to_function_id, relationship_type)
  SELECT 
    v_ip_id,
    f1.id,
    f2.id,
    'depends_on'
  FROM ip_functions f1, ip_functions f2
  WHERE f1.ip_id = v_ip_id 
    AND f2.ip_id = v_ip_id
    AND (
      (f1.function_name = 'World Building' AND f2.function_name = 'Character System') OR
      (f1.function_name = 'Narrative Engine' AND f2.function_name = 'World Building') OR
      (f1.function_name = 'Narrative Engine' AND f2.function_name = 'Character System') OR
      (f1.function_name = 'User Interface' AND f2.function_name = 'Character System') OR
      (f1.function_name = 'Asset Management' AND f2.function_name = 'World Building')
    )
  ON CONFLICT DO NOTHING;
END $$;

