# Upload Workflow Images to Supabase Storage - Step by Step

## Quick Start: Two Options

### Option 1: Automated Script (After creating bucket)

1. **First, create the bucket manually** (see below)
2. Then run: `node scripts/upload-workflow-images.js`

### Option 2: Manual Upload via Dashboard

Follow the manual steps below.

---

## Step-by-Step Instructions

### Step 1: Create the Storage Bucket

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket** button (top right)
5. Fill in:
   - **Name**: `workflows` (must be exactly this, lowercase)
   - **Public bucket**: Leave **unchecked** (we'll use signed URLs for security)
6. Click **Create bucket**

✅ You should now see the `workflows` bucket in your storage list.

### Step 2: Upload Images

You have two options:

#### Option A: Use the Automated Script

```bash
node scripts/upload-workflow-images.js
```

This will upload all 6 images automatically.

#### Option B: Manual Upload via Dashboard

1. Click on the `workflows` bucket
2. Click **Upload file** button (or drag and drop)
3. Upload these 6 files from `public/workflows/`:
   - `img2actions.png` (2.0 MB)
   - `img2lego.png` (2.1 MB)
   - `img2obj.png` (1.7 MB)
   - `img2schematic.png` (1.9 MB)
   - `img2toy.png` (2.0 MB)
   - `txt2img.png` (2.2 MB)

**Important**: Upload them directly to the root of the bucket (not in a subfolder).

### Step 3: Verify Upload

1. In Supabase Dashboard → Storage → `workflows` bucket
2. You should see all 6 PNG files listed
3. Each file should show its size (~1.7-2.2 MB)

### Step 4: Verify Path Matching

The code expects:
- **Database `image_path`**: `img/img2actions.png`
- **Storage file**: `img2actions.png` (in `workflows` bucket root)
- **Code strips `img/` prefix** → looks for `img2actions.png` ✅

This should already match if you uploaded to the bucket root.

---

## Testing

After uploading:

1. **In production** (Vercel/deployed site):
   - Images will load from Supabase Storage
   - Signed URLs are generated with 1-hour expiry
   - Images are private and secure

2. **In local development**:
   - Images still load from `public/workflows/` folder
   - No changes needed for local dev

---

## Troubleshooting

### Script Error: "Bucket does not exist"
- ✅ Create the bucket manually first (Step 1 above)
- Then run the script again

### Script Error: "Permission denied"
- Check that your `.env.local` has correct Supabase credentials
- Make sure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### Images not loading in production
- Verify filenames in storage match database paths (without `img/` prefix)
- Check browser console for errors
- Verify bucket is set to **Private** (not Public)

### Upload fails with "File too large"
- Supabase free tier has limits
- Each image is ~2MB, total ~12MB - should be fine
- If issues persist, check your Supabase plan limits

---

## File Locations Summary

| Location | Path | Purpose |
|----------|------|---------|
| **Source** | `public/workflows/*.png` | Images served by Next.js in development |
| **Production** | Supabase Storage `workflows` bucket | Images served via signed URLs |
| **Database** | `workflows.image_path` = `img/img2actions.png` | Reference path |

---

## Next Steps

After uploading:
1. ✅ Images are in Supabase Storage
2. ✅ Production will use signed URLs automatically
3. ✅ Local dev still uses `public/workflows/` folder
4. ✅ No code changes needed - it's all automatic!

Your workflows page should now display images correctly in both development and production! 🎉

