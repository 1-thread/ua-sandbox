# Manual Verification Checklist

Since the automated verification couldn't find the files, please verify manually in Supabase Dashboard:

## ✅ Checklist:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **Storage** in the left sidebar

2. **Check Bucket Name**
   - Look for a bucket named exactly: `workflows` (lowercase, no spaces)
   - If it's named differently, that's the issue

3. **Open the workflows Bucket**
   - Click on the `workflows` bucket
   - You should see a list of files

4. **Verify Files**
   Check that you see these 6 files listed:
   - [ ] `img2actions.png`
   - [ ] `img2lego.png`
   - [ ] `img2obj.png`
   - [ ] `img2schematic.png`
   - [ ] `img2toy.png`
   - [ ] `txt2img.png`

5. **Check File Location**
   - Files should be in the **root** of the bucket (not in a subfolder like `img/` or `workflows/`)
   - If files are in a subfolder, that's why they're not found

6. **Check File Names**
   - File names must match **exactly** (case-sensitive)
   - Should be: `img2actions.png` (not `Img2Actions.png` or `img2actions.PNG`)

## Common Issues:

### Issue: Files are in a subfolder
**Solution**: Move files to the root of the bucket, or update the code to look in the subfolder

### Issue: Bucket name is different
**Solution**: Either rename the bucket to `workflows` or update the code to use the correct bucket name

### Issue: Files not uploaded
**Solution**: Re-upload the files from `public/workflows/` folder

## Quick Test:

After verifying, you can test if the workflows page loads images:
1. Start your dev server: `npm run dev`
2. Go to `/ip/doh-world` (or any IP)
3. Click "Workflows" in the sidebar
4. Check if workflow cards show images

If images don't load, check the browser console for errors.

