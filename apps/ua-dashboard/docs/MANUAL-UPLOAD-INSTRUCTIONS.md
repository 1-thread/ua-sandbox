# Manual Upload Instructions (Easiest Method)

Since the bucket has RLS policies that prevent programmatic uploads, the easiest way is to upload manually via the Supabase Dashboard.

## Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **Storage** in the left sidebar
   - Click on the **workflows** bucket

2. **Upload Files**
   - Click the **Upload file** button (or drag and drop)
   - Select all 6 PNG files from `public/workflows/`:
     - `img2actions.png`
     - `img2lego.png`
     - `img2obj.png`
     - `img2schematic.png`
     - `img2toy.png`
     - `txt2img.png`
   - Wait for uploads to complete

3. **Verify**
   - You should see all 6 files listed in the bucket
   - Each file should show its size (~1.7-2.2 MB)

That's it! The workflows page will automatically use these images in production.

