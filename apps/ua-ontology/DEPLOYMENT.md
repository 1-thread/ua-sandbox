# Deployment Checklist

## Pre-Deployment Steps

### 1. Set Up Supabase Database

- [ ] Create a new Supabase project at [supabase.com](https://supabase.com)
- [ ] Open SQL Editor in Supabase dashboard
- [ ] Run the SQL script from `supabase/schema.sql` to create tables
- [ ] Verify tables are created (functions, tasks, deliverables, acceptance_criteria)

### 2. Configure Environment Variables Locally

- [ ] Copy `env.example` to `.env.local`
- [ ] Fill in `NEXT_PUBLIC_SUPABASE_URL` (from Supabase project settings > API)
- [ ] Fill in `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase project settings > API)
- [ ] Fill in `SUPABASE_SERVICE_ROLE_KEY` (for migration, from Supabase project settings > API)

### 3. Migrate Data to Supabase

- [ ] Run migration script: `npm run migrate`
- [ ] Verify data is loaded (check Supabase dashboard > Table Editor)
- [ ] Confirm all functions, tasks, deliverables are present

### 4. Test Locally

- [ ] Install dependencies: `npm install`
- [ ] Run dev server: `npm run dev`
- [ ] Visit http://localhost:3000
- [ ] Verify functions are loading from Supabase
- [ ] Test search functionality
- [ ] Test collapsible sections

### 5. Prepare for Vercel Deployment

- [ ] Initialize git repository (if not already): `git init`
- [ ] Add all files: `git add .`
- [ ] Commit changes: `git commit -m "Initial commit"`
- [ ] Create GitHub repository (if needed)
- [ ] Push to GitHub: `git push -u origin main`

### 6. Deploy on Vercel

- [ ] Go to [vercel.com](https://vercel.com) and sign in
- [ ] Click "New Project" or "Add New" > "Project"
- [ ] Import your GitHub repository
- [ ] Vercel should auto-detect Next.js framework
- [ ] Add Environment Variables:
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = (your Supabase URL)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (your Supabase anon key)
- [ ] Click "Deploy"
- [ ] Wait for deployment to complete

### 7. Verify Deployment

- [ ] Visit your Vercel deployment URL
- [ ] Verify functions are loading correctly
- [ ] Test search and filtering
- [ ] Test on different devices/browsers (optional)
- [ ] Set up custom domain (optional)

## Post-Deployment

### Updating Data

To update function data after deployment:

1. Edit JSON files in `functions/` directory
2. Run migration locally: `npm run migrate`
3. Changes will be reflected immediately (data is in Supabase, not in code)

### Monitoring

- Monitor Vercel deployment logs for errors
- Check Supabase dashboard for database usage
- Set up Vercel analytics (optional)

## Troubleshooting

### Functions not loading on Vercel

- Check Vercel environment variables are set correctly
- Verify Supabase Row Level Security policies allow public read
- Check browser console for errors
- Review Vercel build logs

### Migration errors

- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that database schema exists
- Ensure JSON files are valid JSON format
- Check migration script logs for specific errors

### Build errors on Vercel

- Verify all dependencies are in `package.json`
- Check `next.config.ts` is valid
- Review build logs for TypeScript errors

