/**
 * Backfill Thumbnails
 * 
 * This script generates thumbnails for existing images in asset_history that don't have thumbnails
 * 
 * Usage: node scripts/backfill-thumbnails.js [deliverable-id]
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function backfillThumbnails(deliverableId = null) {
  try {
    console.log('🔍 Finding images without thumbnails...\n');

    // Query asset_history for images without thumbnails
    let query = supabase
      .from('asset_history')
      .select('*')
      .is('thumbnail_path', null)
      .order('uploaded_at', { ascending: false });

    if (deliverableId) {
      query = query.eq('deliverable_id', deliverableId);
    }

    const { data: history, error: historyError } = await query;

    if (historyError) throw historyError;

    if (!history || history.length === 0) {
      console.log('✅ No images found without thumbnails');
      return;
    }

    // Filter to only image files
    const imageFiles = history.filter(item => {
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => 
        item.filename.toLowerCase().endsWith(`.${ext}`) ||
        item.storage_path.toLowerCase().endsWith(`.${ext}`)
      );
      return isImage;
    });

    if (imageFiles.length === 0) {
      console.log('✅ No image files found without thumbnails');
      return;
    }

    console.log(`📦 Found ${imageFiles.length} image(s) without thumbnails\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const item of imageFiles) {
      try {
        console.log(`\n📄 Processing: ${item.filename}`);
        console.log(`   Storage path: ${item.storage_path}`);

        // Download the image from storage
        const { data: imageData, error: downloadError } = await supabase.storage
          .from('ip-assets')
          .download(item.storage_path);

        if (downloadError) {
          console.error(`   ❌ Error downloading image: ${downloadError.message}`);
          errorCount++;
          continue;
        }

        // Convert to buffer
        const imageBuffer = Buffer.from(await imageData.arrayBuffer());

        // Generate thumbnail
        const thumbnailBuffer = await sharp(imageBuffer)
          .resize(200, 200, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Create thumbnail path
        const pathParts = item.storage_path.split('/');
        const directory = pathParts.slice(0, -1).join('/');
        const fileName = pathParts[pathParts.length - 1];
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
        const thumbnailFilename = `${nameWithoutExt}_thumb.jpg`;
        const thumbnailStoragePath = directory ? `${directory}/${thumbnailFilename}` : thumbnailFilename;

        console.log(`   📤 Uploading thumbnail to: ${thumbnailStoragePath}`);

        // Upload thumbnail
        const { error: uploadError } = await supabase.storage
          .from('ip-assets')
          .upload(thumbnailStoragePath, thumbnailBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error(`   ❌ Error uploading thumbnail: ${uploadError.message}`);
          errorCount++;
          continue;
        }

        // Update asset_history with thumbnail_path
        const { error: updateError } = await supabase
          .from('asset_history')
          .update({ thumbnail_path: thumbnailStoragePath })
          .eq('id', item.id);

        if (updateError) {
          console.error(`   ❌ Error updating database: ${updateError.message}`);
          errorCount++;
          continue;
        }

        console.log(`   ✅ Thumbnail generated and saved`);
        successCount++;

      } catch (err) {
        console.error(`   ❌ Error processing ${item.filename}:`, err.message);
        errorCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total processed: ${imageFiles.length}\n`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

const deliverableId = process.argv[2] || null;
backfillThumbnails(deliverableId)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

