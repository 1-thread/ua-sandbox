/**
 * Resize and Upload Profile Images
 * 
 * This script:
 * 1. Reads original PNG images from the contributors/ folder
 * 2. Creates small (32px) and medium (80px) versions locally
 * 3. Uploads original, small, and medium versions to Supabase Storage profile-pics bucket
 * 
 * Usage: node scripts/resize-and-upload-profile-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey = serviceRoleKey || anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('\nPlease set in .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL (required)');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (recommended for uploads)');
  console.error('    OR NEXT_PUBLIC_SUPABASE_ANON_KEY (may not have upload permissions)');
  console.error('\n💡 To get your Service Role Key:');
  console.error('   1. Go to your Supabase project dashboard');
  console.error('   2. Navigate to Settings > API');
  console.error('   3. Copy the "service_role" key (NOT the anon key)');
  console.error('   4. Add it to .env.local as: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

if (!serviceRoleKey && anonKey) {
  console.warn('⚠️  Using ANON_KEY instead of SERVICE_ROLE_KEY');
  console.warn('   Uploads may fail due to RLS policies. Consider using SERVICE_ROLE_KEY for better results.\n');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create temp directory for resized images
const tempDir = path.join(__dirname, '../temp-profile-images');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function resizeAndUploadImages() {
  try {
    // First, verify we can access the bucket
    console.log('🔍 Verifying access to profile-pics bucket...\n');
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.warn(`⚠️  Could not list buckets: ${listError.message}`);
        console.warn('   This might indicate an authentication issue.\n');
      } else if (buckets) {
        const profilePicsBucket = buckets.find(b => b.name === 'profile-pics');
        if (profilePicsBucket) {
          console.log('✅ "profile-pics" bucket found\n');
        } else {
          console.warn('⚠️  "profile-pics" bucket not found in list');
          console.warn('   Make sure the bucket exists in your Supabase project.\n');
        }
      }
    } catch (err) {
      console.warn(`⚠️  Could not verify bucket: ${err.message}\n`);
    }

    const contributorsDir = path.join(__dirname, '../contributors');
    
    // Get all PNG files from contributors folder
    const files = fs.readdirSync(contributorsDir)
      .filter(file => file.toLowerCase().endsWith('.png'));

    if (files.length === 0) {
      console.log('⚠️  No PNG files found in contributors folder.');
      return;
    }

    console.log(`📦 Found ${files.length} image files to process\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const originalPath = path.join(contributorsDir, file);
      const firstName = path.basename(file, '.png').toLowerCase();
      
      try {
        console.log(`\n📄 Processing ${file}...`);

        // Check if original file exists
        if (!fs.existsSync(originalPath)) {
          console.log(`   ⚠️  File not found, skipping...`);
          continue;
        }

        // Create small version (32px)
        const smallFilename = `${firstName}-small.png`;
        const tempSmallPath = path.join(tempDir, smallFilename);
        await sharp(originalPath)
          .resize(32, 32, {
            fit: 'cover',
            position: 'center'
          })
          .png({ quality: 90 })
          .toFile(tempSmallPath);

        // Create medium version (80px)
        const mediumFilename = `${firstName}-medium.png`;
        const tempMediumPath = path.join(tempDir, mediumFilename);
        await sharp(originalPath)
          .resize(80, 80, {
            fit: 'cover',
            position: 'center'
          })
          .png({ quality: 90 })
          .toFile(tempMediumPath);

        // Read all three versions
        const originalBuffer = fs.readFileSync(originalPath);
        const smallBuffer = fs.readFileSync(tempSmallPath);
        const mediumBuffer = fs.readFileSync(tempMediumPath);

        // Upload original version
        const originalFilename = `${firstName}.png`;
        const { data: originalData, error: originalUploadError } = await supabase.storage
          .from('profile-pics')
          .upload(originalFilename, originalBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (originalUploadError) {
          console.error(`   ❌ Original upload error:`, originalUploadError);
          throw new Error(`Failed to upload original: ${originalUploadError.message} (Status: ${originalUploadError.statusCode || 'unknown'})`);
        }
        console.log(`   ✅ Uploaded original: ${originalFilename}`);

        // Upload small version
        const { data: smallData, error: smallUploadError } = await supabase.storage
          .from('profile-pics')
          .upload(smallFilename, smallBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (smallUploadError) {
          console.error(`   ❌ Small upload error:`, smallUploadError);
          throw new Error(`Failed to upload small: ${smallUploadError.message} (Status: ${smallUploadError.statusCode || 'unknown'})`);
        }
        console.log(`   ✅ Uploaded small: ${smallFilename}`);

        // Upload medium version
        const { data: mediumData, error: mediumUploadError } = await supabase.storage
          .from('profile-pics')
          .upload(mediumFilename, mediumBuffer, {
            contentType: 'image/png',
            upsert: true
          });

        if (mediumUploadError) {
          console.error(`   ❌ Medium upload error:`, mediumUploadError);
          throw new Error(`Failed to upload medium: ${mediumUploadError.message} (Status: ${mediumUploadError.statusCode || 'unknown'})`);
        }
        console.log(`   ✅ Uploaded medium: ${mediumFilename}`);

        // Clean up temp files
        fs.unlinkSync(tempSmallPath);
        fs.unlinkSync(tempMediumPath);

        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error.message);
        errorCount++;
      }
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('\n📊 Upload Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   📁 Total files: ${files.length}\n`);

    if (errorCount === 0) {
      console.log('🎉 All images resized and uploaded successfully!\n');
      console.log('📝 Files uploaded:');
      console.log('   - Original: {name}.png');
      console.log('   - Small (32px): {name}-small.png');
      console.log('   - Medium (80px): {name}-medium.png\n');
    } else {
      console.log('⚠️  Some images failed to process. Please check the errors above.\n');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
resizeAndUploadImages()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

