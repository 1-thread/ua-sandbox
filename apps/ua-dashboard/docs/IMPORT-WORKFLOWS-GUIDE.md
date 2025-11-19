# Step 2: Import Workflows from JSON - Detailed Guide

## Prerequisites Checklist

Before running the import script, make sure you have:

1. ✅ **Completed Step 1**: Run `supabase/workflows-schema.sql` in Supabase SQL Editor
   - This creates the `workflows`, `workflow_steps`, and `workflow_deliverables` tables
   - Without this, the import will fail

2. ✅ **Node.js installed**: Check with `node --version`
   - Should be Node.js 14+ (the project uses `@supabase/supabase-js`)

3. ✅ **Supabase credentials in `.env.local`**:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. ✅ **`workflows/workflows.json` file exists**

## Running the Import

### Option 1: Run directly with Node.js

From the project root directory (`apps/ua-dashboard`):

```bash
node scripts/import-workflows.js
```

### Option 2: If you get "module not found" errors

Make sure dependencies are installed:

```bash
npm install
```

Then run:

```bash
node scripts/import-workflows.js
```

## What to Expect

The script will:

1. **Load environment variables** from `.env.local`
2. **Read** `workflows/workflows.json`
3. **Import each workflow** with progress output:
   ```
   Starting workflow import...
   
   Found 6 workflows to import
   
   Importing img2actions: Action / Pose Extractor...
     ✓ Workflow inserted/updated
     ✓ Inserted 4 steps
     ✓ Linked 12 deliverables
   
   Importing img2lego: Blockout Builder...
     ✓ Workflow inserted/updated
     ...
   ```

4. **Complete** with a success message:
   ```
   ✅ Workflow import complete!
   ```

## Troubleshooting

### Error: "Workflows file not found"
- Make sure you're in the `apps/ua-dashboard` directory
- Verify `workflows/workflows.json` exists

### Error: "relation 'workflows' does not exist"
- You haven't run Step 1 yet
- Go to Supabase SQL Editor and run `supabase/workflows-schema.sql`

### Error: "new row violates row-level security policy"
- The RLS policies might not be set up correctly
- Re-run `supabase/workflows-schema.sql` to ensure policies are created

### Error: "Cannot find module '@supabase/supabase-js'"
- Run `npm install` to install dependencies

### Error: "NEXT_PUBLIC_SUPABASE_URL is not defined"
- Check that `.env.local` exists and has the correct Supabase credentials
- Make sure there are no extra spaces or quotes around the values

## Verifying the Import

After running the script, you can verify in Supabase:

1. Go to Supabase Dashboard → Table Editor
2. Check the `workflows` table - should have 6 workflows
3. Check the `workflow_steps` table - should have multiple steps
4. Check the `workflow_deliverables` table - should have deliverable codes linked

## Re-running the Import

The script uses `upsert` with `onConflict: 'workflow_id'`, so:
- ✅ Safe to run multiple times
- ✅ Will update existing workflows if they already exist
- ✅ Will create new workflows if they don't exist

