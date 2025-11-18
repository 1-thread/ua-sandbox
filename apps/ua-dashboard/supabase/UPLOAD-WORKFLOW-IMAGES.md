# Upload Workflow Images to Supabase Storage

## Option 1: Automated Script (Recommended)

Run the automated upload script:

```bash
node scripts/upload-workflow-images.js
```

This script will:
- ✅ Check if the `workflows` bucket exists (creates it if not)
- ✅ Upload all PNG files from `public/workflows/` to Supabase Storage
- ✅ Use the correct filenames (matching database `image_path` values)

## Option 2: Manual Upload via Supabase Dashboard

### Step 1: Create the Bucket

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Name it: `workflows`
6. Set to **Private** (we'll use signed URLs)
7. Click **Create bucket**

### Step 2: Upload Images

1. Click on the `workflows` bucket
2. Click **Upload file** or drag and drop
3. Upload these 6 images from `public/workflows/`:
   - `img2actions.png`
   - `img2lego.png`
   - `img2obj.png`
   - `img2schematic.png`
   - `img2toy.png`
   - `txt2img.png`

**Important**: Upload them directly to the root of the bucket (not in a subfolder), so the path is just the filename (e.g., `img2actions.png`).

### Step 3: Verify Database Paths

The database stores image paths like `img/img2actions.png`, but the code strips the `img/` prefix when generating URLs. Make sure your storage paths match:

- Database `image_path`: `img/img2actions.png`
- Storage file: `img2actions.png` (in `workflows` bucket)
- Code strips `img/` → looks for `img2actions.png` ✅

## Verify Upload

After uploading, you can verify in Supabase:

1. Go to **Storage** → `workflows` bucket
2. You should see all 6 PNG files listed
3. Click on a file to see its details

## Testing

After uploading:

1. The workflows page will automatically use Supabase Storage in production
2. Signed URLs are generated with 1-hour expiry
3. Images will load from Supabase Storage instead of the local `public/` folder

## Troubleshooting

### Error: "Bucket not found"
- Make sure you created the `workflows` bucket first
- Check the bucket name is exactly `workflows` (lowercase)

### Error: "Permission denied"
- Check your RLS policies for the storage bucket
- Make sure the bucket allows public read access OR your app has proper authentication

### Images not loading in production
- Verify the filenames in storage match what the code expects (without `img/` prefix)
- Check browser console for signed URL errors
- Verify your Supabase Storage bucket is accessible

### Script fails with "Cannot find module"
- Run `npm install` to ensure dependencies are installed
- Make sure you're in the `apps/ua-dashboard` directory

