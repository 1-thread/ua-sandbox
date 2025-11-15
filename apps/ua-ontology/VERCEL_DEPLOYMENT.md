# Vercel Deployment Guide for UA Ontology

## ✅ Pre-Deployment Checklist

- [x] Code pushed to GitHub
- [x] Database schema created in Supabase
- [x] Data migrated to Supabase
- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Deployment successful

## Step-by-Step Vercel Deployment

### Step 1: Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account)
2. Click **"Add New..."** → **"Project"** (or "Import Project")
3. Import your GitHub repository:
   - Find `1-thread/ua-sandbox` in the list
   - Click **"Import"**
4. Vercel will detect it's a monorepo (multiple apps)

### Step 2: Configure Project Settings

Since this is in a monorepo, you need to configure Vercel:

1. **Root Directory**: Set to `apps/ua-ontology`
   - In project settings, go to **Settings** → **General**
   - Under "Root Directory", click **"Edit"**
   - Set to: `apps/ua-ontology`
   - Click **"Save"**

2. **Framework Preset**: Should auto-detect as Next.js

3. **Build Command**: Should auto-detect as `npm run build`

4. **Output Directory**: Should auto-detect as `.next`

### Step 3: Add Environment Variables

**⚠️ IMPORTANT**: Add these environment variables before deploying!

1. Go to **Settings** → **Environment Variables**

2. Add the following variables (one at a time):

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Production, Preview, Development |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
   | `NEXT_PUBLIC_APP_PASSWORD` | Your app password (optional, defaults to "demo123") | Production, Preview, Development |

   **Important Notes:**
   - Get Supabase values from: Supabase Dashboard → Settings → API
   - Use the **anon public** key (NOT the service role key)
   - Check all three environments (Production, Preview, Development)
   - The service role key should NEVER be added to Vercel
   - If `NEXT_PUBLIC_APP_PASSWORD` is not set, it defaults to "demo123"

3. Click **"Save"** after adding each variable

### Step 4: Deploy

1. Go back to the **Deployments** tab
2. Click **"Deploy"** (or push a new commit to trigger deployment)
3. Wait for the build to complete (usually 1-2 minutes)
4. You'll see the deployment URL when it's done

### Step 5: Verify Deployment

1. Visit your deployment URL (e.g., `https://ua-ontology-xyz.vercel.app`)
2. Verify the website loads
3. Check that functions are displayed (loaded from Supabase)
4. Test search functionality
5. Check browser console for any errors

## Environment Variables Reference

### Required for Deployment:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - Format: `https://xxxxxxxxxxxxx.supabase.co`
  - Get from: Supabase Dashboard → Settings → API → Project URL

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
  - Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
  - Get from: Supabase Dashboard → Settings → API → anon public

- `NEXT_PUBLIC_APP_PASSWORD` - Password to access the application (optional)
  - If not set, defaults to "demo123"
  - Should be set to a secure password for production use

### NOT Needed for Deployment:
- `SUPABASE_SERVICE_ROLE_KEY` - Only used for local migrations
- `SUPABASE_URL` - Only needed if different from NEXT_PUBLIC_SUPABASE_URL

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Ensure `package.json` has all dependencies
- Check that Root Directory is set to `apps/ua-ontology`

**Error: "Environment variable not found"**
- Verify environment variables are added in Vercel dashboard
- Check that variables are enabled for Production/Preview/Development

### Website Shows "Error" or "No functions found"

**Check:**
1. Environment variables are correctly set in Vercel
2. Supabase database has data (check Supabase Table Editor)
3. Row Level Security policies allow public read access
4. Browser console for specific error messages

### Functions Not Loading

**Verify:**
1. Go to Supabase Dashboard → Table Editor → `functions` table
2. Confirm data exists
3. Check Supabase Dashboard → Logs → API Logs for errors
4. Verify `NEXT_PUBLIC_SUPABASE_URL` matches your Supabase project URL

## Post-Deployment

### Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions

### Monitoring

- Check **Deployments** tab for build status
- Monitor **Analytics** for traffic
- Review **Functions** tab for serverless function logs

## Quick Deploy Checklist

- [ ] Import repository to Vercel
- [ ] Set Root Directory to `apps/ua-ontology`
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` environment variable
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variable
- [ ] Deploy
- [ ] Verify website loads correctly
- [ ] Test search functionality

## Need Help?

If deployment fails:
1. Check Vercel build logs
2. Verify environment variables are set
3. Ensure database schema exists in Supabase
4. Confirm data was migrated successfully

