# Quick Start - Environment Variables

## Quick Setup Steps

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` and fill in your actual API keys:**

   Open `.env.local` in your editor and replace the placeholder values:

   ```env
   # OpenAI API
   OPENAI_API_KEY=sk-proj-your-actual-key-here

   # Meshy.ai API
   MESHY_API_KEY=your-actual-meshy-key-here

   # Supabase
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
   SUPABASE_ANON_KEY=your-actual-anon-key
   ```

## Where to Get Your Keys

### OpenAI API Key
- Visit: https://platform.openai.com/api-keys
- Create a new secret key
- Copy it to `OPENAI_API_KEY=`

### Meshy API Key
- Visit: https://www.meshy.ai/
- Sign in and find API settings
- Generate and copy the key

### Supabase Keys
- Visit: https://supabase.com/
- Go to your project → Settings → API
- Copy:
  - Project URL → `SUPABASE_URL=`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY=`
  - `anon` `public` key → `SUPABASE_ANON_KEY=`

## After Setup

1. **Set up the database:**
   - Go to Supabase SQL Editor
   - Run the SQL from `supabase/migrations/001_create_ip_sessions.sql`

2. **Start the dev server:**
   ```bash
   npm install
   npm run dev
   ```

3. **Open http://localhost:3000** in your browser

For detailed instructions, see `ENV_SETUP.md`.

