# Environment Variables Setup Guide

This guide will help you set up all the required environment variables for the UA 360 IP Generator.

## Step 1: Create .env.local file

Create a file named `.env.local` in the root of the project (same directory as `package.json`).

## Step 2: Get Your API Keys

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Give it a name (e.g., "UA 360 IP Generator")
5. Copy the key immediately (you won't be able to see it again)

**Add to .env.local:**
```
OPENAI_API_KEY=sk-...
```

### Meshy.ai API Key

1. Go to https://www.meshy.ai/
2. Sign up or sign in
3. Navigate to your API settings/dashboard
4. Generate an API key
5. Copy the key

**Note:** The Meshy API implementation may need adjustment based on their actual API structure. Check their documentation at https://docs.meshy.ai/

**Add to .env.local:**
```
MESHY_API_KEY=your_meshy_api_key_here
```

### Supabase Credentials

1. Go to https://supabase.com/
2. Sign in or create an account
3. Create a new project (or use an existing one)
4. Wait for the project to finish setting up
5. Go to Project Settings → API
6. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **service_role key** (in the "Project API keys" section, use the `service_role` key - keep this secret!)
   - **anon key** (the `anon` `public` key)

**Add to .env.local:**
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 3: Complete .env.local Example

Your `.env.local` file should look like this:

```env
# OpenAI API
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Meshy.ai API
MESHY_API_KEY=mk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Supabase
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjQwMDAwMDAwLCJleHAiOjE2NDAwMDY0MDB9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0MDAwMDAwMCwiZXhwIjoxNjQwMDA2NDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 4: Set Up Supabase Database

After setting up your Supabase credentials, you need to create the database table:

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the contents of `supabase/migrations/001_create_ip_sessions.sql`
5. Click "Run" (or press Cmd/Ctrl + Enter)
6. You should see a success message

## Step 5: Verify Setup

1. Make sure `.env.local` is in the project root
2. Restart your development server if it's running:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

## Troubleshooting

### "OPENAI_API_KEY is not set"
- Make sure the file is named exactly `.env.local` (not `.env.local.txt` or similar)
- Make sure the file is in the project root directory
- Restart your development server after creating/editing the file

### "SUPABASE_URL is not set"
- Verify you copied the complete URL (should start with `https://`)
- Check for any extra spaces or quotes around the values

### "Meshy API error"
- Verify your Meshy API key is correct
- Check Meshy's API documentation for any changes to their API structure
- You may need to adjust the API endpoints in `lib/meshy.ts`

## For Vercel Deployment

When deploying to Vercel:

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add all the variables from your `.env.local`:
   - `OPENAI_API_KEY`
   - `MESHY_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
4. Set them for "Production", "Preview", and "Development" as needed
5. Redeploy your application

