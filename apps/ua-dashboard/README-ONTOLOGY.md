# Ontology Initializer Documentation

## Overview

The ontology initializer system distinguishes between **generic templates** and **IP-specific** data:

- **Generic Templates**: Functions, tasks, and deliverables that serve as blueprints
- **IP-Specific**: Copies of templates that can be edited, assigned, and updated per IP

## Current State

### Generic/Template Data (ip_id = NULL)
- `functions` - Core functions (E1, G1, P1, etc.)
- `tasks` - Tasks linked to functions
- `deliverables` - Deliverables linked to tasks (where `ip_id IS NULL`)
- `function_guardrails` - Guardrails for functions
- `deliverable_aliases` - Aliases for deliverables
- `acceptance_criteria` - Criteria for deliverables

### IP-Specific Data
- `ips` - IP records
- `ip_verticals` - Verticals for each IP
- `ip_functions` - Links IPs to functions (many-to-many)
- `deliverables` - IP-specific deliverables (where `ip_id = <ip_id>`)

## Database Schema Changes

### 1. Add `ip_id` to Deliverables

Run `supabase/add-ip-id-to-deliverables.sql` to:
- Add `ip_id` column (nullable - NULL means template)
- Create index for IP-specific queries
- Update unique constraint to allow same deliverable_id for different IPs

### 2. Check Current State

Run `supabase/check-current-state.sql` to see:
- How many generic functions/tasks/deliverables exist
- Which IPs are linked to which functions
- Current state of IP-specific vs template deliverables

## Initialization Process

### Option 1: Database Function (Recommended)

1. Run `supabase/ontology-initializer.sql` to create the initialization functions
2. Call the function:

```sql
-- By slug
SELECT * FROM initialize_ip_ontology('doh-world');

-- By ID
SELECT * FROM initialize_ip_ontology_by_id('uuid-of-ip');
```

### Option 2: Node.js Script

```bash
node scripts/initialize-ip-ontology.js <ip-slug>
```

Example:
```bash
node scripts/initialize-ip-ontology.js doh-world
```

## What Gets Initialized

When you initialize an IP's ontology:

1. **Functions**: Links functions to IP based on IP's verticals
   - If IP has "entertainment" vertical, links all E* functions
   - If IP has "game" vertical, links all G* functions
   - If IP has "product" vertical, links all P* functions

2. **Tasks**: Tasks remain generic (shared across IPs)

3. **Deliverables**: Creates IP-specific copies
   - Copies all generic deliverables for linked functions
   - Sets `ip_id` to the IP's ID
   - Copies aliases and acceptance criteria

4. **Aliases**: Copies deliverable aliases to IP-specific deliverables

5. **Criteria**: Copies acceptance criteria to IP-specific deliverables

## Usage Workflow

### Creating a New IP

1. **Create IP record**:
```sql
INSERT INTO ips (slug, name, ...) VALUES ('new-ip', 'New IP', ...);
```

2. **Add verticals**:
```sql
INSERT INTO ip_verticals (ip_id, vertical_name, progress_percentage)
SELECT id, 'entertainment', 0 FROM ips WHERE slug = 'new-ip';
```

3. **Initialize ontology**:
```sql
SELECT * FROM initialize_ip_ontology('new-ip');
```

Or use the Node.js script:
```bash
node scripts/initialize-ip-ontology.js new-ip
```

### Viewing Assets

The assets page (`/ip/[slug]/assets`) automatically filters to show only IP-specific deliverables (where `ip_id` matches the current IP).

## Important Notes

- **Templates are read-only**: Generic deliverables (where `ip_id IS NULL`) should not be edited
- **IP-specific deliverables are editable**: Each IP has its own copies that can be updated
- **Re-initialization is safe**: Running the initializer multiple times won't create duplicates (uses `ON CONFLICT`)
- **Tasks stay generic**: Tasks are shared across IPs, only deliverables become IP-specific

## Troubleshooting

### Check if IP has been initialized:
```sql
SELECT COUNT(*) 
FROM deliverables 
WHERE ip_id = (SELECT id FROM ips WHERE slug = 'doh-world');
```

### Check which functions are linked:
```sql
SELECT f.code, f.title
FROM ip_functions if
JOIN functions f ON f.code = if.function_code
WHERE if.ip_id = (SELECT id FROM ips WHERE slug = 'doh-world');
```

### Re-initialize an IP:
```sql
-- Safe to run multiple times
SELECT * FROM initialize_ip_ontology('doh-world');
```

