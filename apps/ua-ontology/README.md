# UA Ontology - Core Functions Viewer

A Next.js application that displays core function definitions from a Supabase database, deployed on Vercel.

## Features

- Dynamic loading of function data from Supabase
- Search and filter functions by code, title, task, deliverable, phase, or category
- Collapsible hierarchy: Functions → Tasks → Deliverables → Acceptance Criteria
- Organized by phase (R&D, Development, Production, etc.)
- Modern dark theme UI
- Password protection for secure access

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
3. Fill in your Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### 3. Create Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Run the SQL script from `supabase/schema.sql`
   - This creates all necessary tables, indexes, and security policies

### 4. Migrate JSON Data to Supabase

1. Add your Supabase Service Role Key to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```
   > ⚠️ **Note**: The Service Role Key bypasses Row Level Security. Keep it secret and only use it for migrations.

2. Run the migration script:
   ```bash
   npm run migrate
   ```
   
   This will read all JSON files from the `functions/` directory and load them into Supabase.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Deployment to Vercel

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project" and import your GitHub repository
3. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
4. Click "Deploy"

Vercel will automatically detect Next.js and deploy your application.

### Step 3: Verify Deployment

After deployment, visit your Vercel URL to verify the application is working.

## Project Structure

```
ua-ontology/
├── app/                    # Next.js app directory
│   ├── page.tsx           # Main page component
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   └── supabaseClient.ts  # Supabase client configuration
├── functions/             # Original JSON function definitions
├── scripts/
│   └── migrate-to-supabase.ts  # Migration script
├── supabase/
│   └── schema.sql         # Database schema SQL script
└── package.json
```

## Environment Variables

| Variable | Description | Required For |
|----------|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | App runtime, Migration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | App runtime, Migration |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Migration only |
| `NEXT_PUBLIC_APP_PASSWORD` | Password to access the application | App runtime (optional, defaults to "demo123") |

## Updating Data

To update function data:

1. Edit the JSON files in `functions/` directory
2. Run the migration script again:
   ```bash
   npm run migrate
   ```
   
   The script uses `upsert` operations, so existing records will be updated.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Troubleshooting

### "No functions found" error

- Ensure you've run the migration script: `npm run migrate`
- Check that your Supabase credentials are correct in `.env.local`
- Verify the database schema was created successfully

### Migration errors

- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- Check that the database schema exists (run `supabase/schema.sql`)
- Verify JSON files in `functions/` are valid

### Deployment issues

- Ensure environment variables are set in Vercel dashboard
- Check Vercel build logs for errors
- Verify Supabase Row Level Security policies allow public read access

