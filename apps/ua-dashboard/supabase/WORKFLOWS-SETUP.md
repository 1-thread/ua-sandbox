# Workflows Setup Guide

This guide explains how to set up the workflows system in the UA Dashboard.

## Step 1: Create Database Schema

Run the SQL script in Supabase SQL Editor:

```sql
-- Run: supabase/workflows-schema.sql
```

This creates:
- `workflows` table - Main workflow definitions
- `workflow_steps` table - Step-by-step directions for each workflow
- `workflow_deliverables` table - Links workflows to relevant deliverable codes

## Step 2: Import Workflows from JSON

Run the import script to migrate workflows from `workflows/workflows.json`:

```bash
node scripts/import-workflows.js
```

This will:
- Import all workflows from the JSON file
- Create workflow records with default hidden prompts
- Import steps/directions for each workflow
- Link workflows to their relevant deliverables

## Step 3: Upload Workflow Images

Upload workflow thumbnail images to Supabase Storage:

1. Go to Supabase Dashboard → Storage
2. Create a bucket called `workflows` (if it doesn't exist)
3. Upload images from `workflows/img/` folder
4. Make sure the image paths match what's in the database (`image_path` field)

Alternatively, for local development:
- Place images in `public/workflows/` folder
- The app will automatically use local images when running on localhost

## Step 4: Configure OpenAI API Key

Add your OpenAI API key to `.env.local`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

The API route at `/api/workflow-execute` uses this key to call ChatGPT.

## Step 5: Test the Workflows Page

1. Navigate to an IP (e.g., `/ip/doh-world`)
2. Click "Workflows" in the sidebar
3. You should see all imported workflows displayed as cards
4. Click a workflow card to open the detail modal
5. Enter a prompt and click "Submit" to test the ChatGPT integration

## Database Structure

### Workflows Table
- `id` - UUID primary key
- `workflow_id` - Unique identifier (e.g., 'img2actions', 'txt2img')
- `name` - Display name
- `description` - Workflow description
- `image_path` - Path to thumbnail image
- `supports_upload` - Boolean for file upload support
- `hidden_prompt` - System prompt for ChatGPT API
- `created_at`, `updated_at` - Timestamps

### Workflow Steps Table
- `id` - UUID primary key
- `workflow_id` - Foreign key to workflows
- `step_text` - Step instruction text
- `display_order` - Order for display

### Workflow Deliverables Table
- `id` - UUID primary key
- `workflow_id` - Foreign key to workflows
- `deliverable_code` - Deliverable code (e.g., 'E1-T1-D1')

## Filtering Logic

Workflows are filtered based on their `relevant_deliverables`:
- Category filter: Matches workflows whose relevant deliverables match the selected category
- Function filter: Matches workflows whose relevant deliverables match the selected function code
- Task filter: Matches workflows whose relevant deliverables match the selected task code
- Deliverable filter: Matches workflows whose relevant deliverables match the selected deliverable code

## Customizing Hidden Prompts

You can customize the system prompt for each workflow by updating the `hidden_prompt` field in the `workflows` table. This prompt is sent to ChatGPT along with the user's input to provide context-specific responses.

