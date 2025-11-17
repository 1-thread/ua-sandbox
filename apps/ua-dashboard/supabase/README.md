# Supabase Database Setup

This directory contains SQL scripts to set up the database schema for the UA Dashboard.

## Setup Instructions

### 1. Create the Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `schema.sql` from this directory
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute

This will create:
- `ips` table (main IP data)
- `ip_verticals` table (verticals with progress percentages)
- `functions` table (core functions from functions folder)
- `function_dependencies` table (dependencies between functions)
- `ip_functions` table (maps IPs to functions)
- `function_guardrails` table (guardrails for functions)
- `tasks` table (tasks for each function)
- `deliverables` table (deliverables for each task)
- `deliverable_aliases` table (aliases for deliverables)
- `acceptance_criteria` table (acceptance criteria for deliverables)
- Indexes for performance
- Row Level Security (RLS) policies for public read access

### 2. Seed IP Data

1. In the SQL Editor, open `seed-ips.sql`
2. Copy and paste the contents
3. Click **Run** to execute

This will insert sample data for:
- **Doh World** (entertainment: 60%, game: 75%, product: 45%)
- **Squid Ninja** (entertainment: 80%, game: 40%, product: 25%)
- **Trapdoor City** (entertainment: 50%, game: 55%, product: 85%)

### 3. Verify Setup

Run this query in SQL Editor to verify:

```sql
SELECT 
  i.name,
  i.slug,
  COUNT(DISTINCT v.id) as vertical_count,
  COUNT(DISTINCT f.code) as function_count
FROM ips i
LEFT JOIN ip_verticals v ON v.ip_id = i.id
LEFT JOIN ip_functions if_map ON if_map.ip_id = i.id
LEFT JOIN functions f ON f.code = if_map.function_code
GROUP BY i.id, i.name, i.slug
ORDER BY i.name;
```

You should see all three IPs with their vertical counts.

## Schema Overview

### `ips` Table
Main table storing IP information:
- `slug`: URL-friendly identifier (e.g., 'doh-world')
- `name`: Display name
- `icon_url`: Icon image URL
- `representative_image_url`: Hero image URL
- `description`: Full text description
- `health_summary`: Health status summary

### `ip_verticals` Table
Stores verticals (game, entertainment, product) for each IP:
- `vertical_name`: Name of the vertical
- `progress_percentage`: 0-100 progress value

### `functions` Table
Stores core functions from the `functions/` folder (E1, G1, P1, etc.):
- `code`: Function code (e.g., 'E1', 'G1', 'P1')
- `title`: Function title
- `category`: 'entertainment', 'game', or 'product'
- `phase`: Development phase (e.g., 'R&D')
- `purpose`: Function purpose description
- `source_md`: Path to source markdown file
- `position_x`, `position_y`: Optional graph layout positions

### `function_dependencies` Table
Stores dependencies between functions (edges in the graph):
- `from_function_code`: Source function code
- `to_function_code`: Target function code (dependency)

### `ip_functions` Table
Maps IPs to functions (many-to-many relationship):
- `ip_id`: Reference to IP
- `function_code`: Reference to function code

### `function_guardrails` Table
Stores guardrails/rules for each function:
- `function_code`: Reference to function
- `guardrail_text`: Text of the guardrail rule
- `display_order`: Order for display

### `tasks` Table
Stores tasks for each function:
- `function_code`: Reference to function
- `task_id`: Task identifier (e.g., 'E1-T1', 'G1-T2')
- `title`: Task title
- `description`: Task description
- `display_order`: Order for display

### `deliverables` Table
Stores deliverables for each task:
- `task_id`: Reference to task
- `deliverable_id`: Deliverable identifier (e.g., 'E1-T1-D1')
- `filename`: Deliverable filename
- `filetype`: File type (pdf, docx, pptx, etc.)
- `path_hint`: Path hint for file location
- `description`: Deliverable description
- `display_order`: Order for display

### `deliverable_aliases` Table
Stores aliases for deliverables (multiple aliases per deliverable):
- `deliverable_id`: Reference to deliverable
- `alias`: Alias name

### `acceptance_criteria` Table
Stores acceptance criteria for deliverables:
- `deliverable_id`: Reference to deliverable
- `criteria_id`: Criteria identifier (e.g., 'AC-1', 'AC-2')
- `criteria_text`: Text of the acceptance criterion
- `display_order`: Order for display

## Security

All tables have Row Level Security (RLS) enabled with public read access policies. This means:
- ✅ Anyone can read IP data
- ❌ Only authenticated users can write (if you add write policies later)

## Next Steps

After setting up the database:
1. Update your `.env.local` with Supabase credentials
2. Test the connection by running the app
3. Proceed to build the IP detail page components
