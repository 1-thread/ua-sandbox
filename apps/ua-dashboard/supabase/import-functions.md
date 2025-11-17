# Import Functions from JSON Files

This document describes how to import function JSON files from the `functions/` folder into the Supabase database.

## Overview

The `functions/` folder contains JSON files for each core function (E1, E2, G1, G2, P1, etc.). Each file contains:
- Function metadata (code, title, category, phase, purpose, dependencies, guardrails)
- Tasks (with task_id, title, description)
- Deliverables (with deliverable_id, filename, aliases, filetype, path_hint, description)
- Acceptance criteria (for each deliverable)

## Manual Import Process

Since we need to parse JSON files and insert into multiple related tables, you can:

1. **Use a migration script** (recommended - see below)
2. **Import manually via Supabase SQL Editor** (for small datasets)

## Automated Import Script

A TypeScript script can be created to:
1. Read all JSON files from `functions/` folder
2. Parse each function JSON
3. Insert into database tables in the correct order:
   - `functions` table
   - `function_guardrails` table
   - `function_dependencies` table
   - `tasks` table
   - `deliverables` table
   - `deliverable_aliases` table
   - `acceptance_criteria` table

## Example SQL for Single Function

Here's an example of how to insert E1 manually:

```sql
-- Insert function
INSERT INTO functions (code, title, category, phase, purpose, source_md)
VALUES (
  'E1',
  'Create and Build Pitch Package',
  'entertainment',
  'R&D',
  'Establish the IP''s foundational creative vision...',
  'ua/function_core/CO-entertainment-E1-create-and-build-pitch-package.md'
)
ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  phase = EXCLUDED.phase,
  purpose = EXCLUDED.purpose,
  source_md = EXCLUDED.source_md;

-- Insert guardrails
INSERT INTO function_guardrails (function_code, guardrail_text, display_order)
VALUES
  ('E1', 'Do not change approved variables without recording a revision...', 0),
  ('E1', 'Avoid ambiguous or placeholder language for core variables.', 1),
  ('E1', 'Ensure all visual references are licensed or original.', 2)
ON CONFLICT DO NOTHING;

-- Insert dependencies (E1 has none, but G1 depends on E1)
-- This would be: INSERT INTO function_dependencies (from_function_code, to_function_code) VALUES ('G1', 'E1');

-- Then insert tasks, deliverables, aliases, and acceptance criteria...
```

## Next Steps

1. Create an automated import script (TypeScript/Node.js)
2. Run it to populate all functions from the JSON files
3. Link functions to IPs via `ip_functions` table

