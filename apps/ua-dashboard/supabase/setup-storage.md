# Supabase Storage Setup for IP Assets

## Step 1: Make the Bucket Public

1. Go to Supabase Dashboard → **Storage**
2. Click on the `ip-assets` bucket
3. Go to **Settings** tab
4. Under **Public bucket**, toggle it to **ON** (make it public)
5. This allows direct access to images without signed URLs

## Step 2: Get Public URLs

Once the bucket is public, use this URL format:

```
https://[project-ref].supabase.co/storage/v1/object/public/[bucket-name]/[file-path]
```

For your project:
- Project ref: `rjvznsbycxnjwkjgjprt`
- Bucket: `ip-assets`

**Public URLs:**
- Hero: `https://rjvznsbycxnjwkjgjprt.supabase.co/storage/v1/object/public/ip-assets/doh-world-hero.png`
- Icon: `https://rjvznsbycxnjwkjgjprt.supabase.co/storage/v1/object/public/ip-assets/doh-world-icon.png`

## Step 3: Update Database

Run this SQL in Supabase SQL Editor:

```sql
UPDATE ips 
SET 
  representative_image_url = 'https://rjvznsbycxnjwkjgjprt.supabase.co/storage/v1/object/public/ip-assets/doh-world-hero.png',
  icon_url = 'https://rjvznsbycxnjwkjgjprt.supabase.co/storage/v1/object/public/ip-assets/doh-world-icon.png'
WHERE slug = 'doh-world';
```

## Step 4: Verify

After updating, the images should load on the IP detail page at `/ip/doh-world`.

