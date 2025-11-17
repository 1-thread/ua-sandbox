-- Seed IP data for UA Dashboard
-- Run this in Supabase SQL Editor after creating the schema
-- This creates sample data for Doh World, Squid Ninja, and Trapdoor City
--
-- SAFE TO RUN MULTIPLE TIMES: This script uses ON CONFLICT clauses
-- to prevent duplicate entries. If an IP already exists, it will
-- update the existing record instead of creating a duplicate.

-- Insert Doh World
INSERT INTO ips (slug, name, icon_url, representative_image_url, description, health_summary)
VALUES (
  'doh-world',
  'Doh World',
  '/icons/doh-world-icon.svg',
  '/images/doh-world-hero.jpg',
  'Doh World is an innovative intellectual property that combines gaming, entertainment, and product development into a cohesive universe. The project focuses on creating engaging experiences across multiple verticals while maintaining a consistent brand identity and narrative.',
  'The project is in good health with active development across all verticals. Core functions are stable and the pipeline shows steady progress. Recent milestones have been met on schedule.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  representative_image_url = EXCLUDED.representative_image_url,
  description = EXCLUDED.description,
  health_summary = EXCLUDED.health_summary;

-- Insert Squid Ninja
INSERT INTO ips (slug, name, icon_url, representative_image_url, description, health_summary)
VALUES (
  'squid-ninja',
  'Squid Ninja',
  '/icons/squid-ninja-icon.svg',
  '/images/squid-ninja-hero.jpg',
  'Squid Ninja is a fast-paced action IP featuring stealth mechanics and aquatic combat. The property spans multiple media formats, focusing on a unique blend of ninja stealth and underwater exploration. The IP emphasizes character-driven narratives and innovative gameplay mechanics.',
  'Squid Ninja is progressing well with strong momentum in the entertainment vertical. Game development is in early stages with promising prototypes. Product line is in concept phase with high market interest.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  representative_image_url = EXCLUDED.representative_image_url,
  description = EXCLUDED.description,
  health_summary = EXCLUDED.health_summary;

-- Insert Trapdoor City
INSERT INTO ips (slug, name, icon_url, representative_image_url, description, health_summary)
VALUES (
  'trapdoor-city',
  'Trapdoor City',
  '/icons/trapdoor-city-icon.svg',
  '/images/trapdoor-city-hero.jpg',
  'Trapdoor City is an urban exploration IP set in a sprawling metropolis with hidden underground networks. The property combines mystery-solving, city building, and social interaction elements. The IP targets a broad audience with emphasis on discovery and community engagement.',
  'Trapdoor City shows excellent progress in product development with strong market validation. Entertainment vertical is in active production. Game mechanics are being refined based on early testing feedback.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  icon_url = EXCLUDED.icon_url,
  representative_image_url = EXCLUDED.representative_image_url,
  description = EXCLUDED.description,
  health_summary = EXCLUDED.health_summary;

-- Add verticals for Doh World
INSERT INTO ip_verticals (ip_id, vertical_name, progress_percentage)
SELECT 
  i.id,
  v.vertical_name,
  v.progress
FROM ips i,
  (VALUES 
    ('entertainment', 60),
    ('game', 75),
    ('product', 45)
  ) AS v(vertical_name, progress)
WHERE i.slug = 'doh-world'
ON CONFLICT (ip_id, vertical_name) DO UPDATE SET
  progress_percentage = EXCLUDED.progress_percentage;

-- Add verticals for Squid Ninja
INSERT INTO ip_verticals (ip_id, vertical_name, progress_percentage)
SELECT 
  i.id,
  v.vertical_name,
  v.progress
FROM ips i,
  (VALUES 
    ('entertainment', 80),
    ('game', 40),
    ('product', 25)
  ) AS v(vertical_name, progress)
WHERE i.slug = 'squid-ninja'
ON CONFLICT (ip_id, vertical_name) DO UPDATE SET
  progress_percentage = EXCLUDED.progress_percentage;

-- Add verticals for Trapdoor City
INSERT INTO ip_verticals (ip_id, vertical_name, progress_percentage)
SELECT 
  i.id,
  v.vertical_name,
  v.progress
FROM ips i,
  (VALUES 
    ('entertainment', 50),
    ('game', 55),
    ('product', 85)
  ) AS v(vertical_name, progress)
WHERE i.slug = 'trapdoor-city'
ON CONFLICT (ip_id, vertical_name) DO UPDATE SET
  progress_percentage = EXCLUDED.progress_percentage;

