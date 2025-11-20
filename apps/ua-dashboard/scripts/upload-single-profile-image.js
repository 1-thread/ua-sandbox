/**
 * Upload Single Profile Image
 * 
 * This script processes a single profile image:
 * 1. Creates small (32px) and medium (80px) versions
 * 2. Uploads original, small, and medium versions to Supabase Storage
 * 
 * Usage: 
 *   node scripts/upload-single-profile-image.js <image-path> [first-name]
 * 
 * Examples:
 *   node scripts/upload-single-profile-image.js contributors/captain.png captain
 *   node scripts/upload-single-profile-image.js ~/Downloads/captain-kangaroo.jpg captain
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
  process.exit(1);
}

if (!serviceRoleKey && anonKey) {
  console.warn('⚠️  Using ANON_KEY instead of SERVICE_ROLE_KEY');
  console.warn('   Uploads may fail due to RLS policies. Consider using SERVICE_ROLE_KEY for better results.\n');
}

// Get command line arguments
const imagePath = process.argv[2];
const firstNameArg = process.argv[3];

if (!imagePath) {
  console.error('❌ Please provide an image path!');
  console.error('\nUsage:');
  console.error('  node scripts/upload-single-profile-image.js <image-path> [first-name]');
  console.error('\nExamples:');
  console.error('  node scripts/upload-single-profile-image.js contributors/captain.png captain');
  console.error('  node scripts/upload-single-profile-image.js ~/Downloads/captain-kangaroo.jpg captain');
  process.exit(1);
}

// Resolve the image path
const resolvedImagePath = path.isAbsolute(imagePath) 
  ? imagePath 
  : path.join(__dirname, '..', imagePath);

if (!fs.existsSync(resolvedImagePath)) {
  console.error(`❌ Image file not found: ${resolvedImagePath}`);
  process.exit(1);
}

// Determine first name
let firstName;
if (firstNameArg) {
  firstName = firstNameArg.toLowerCase();
} else {
  // Extract from filename (e.g., "captain.png" -> "captain")
  const basename = path.basename(resolvedImagePath, path.extname(resolvedImagePath));
  firstName = basename.toLowerCase();
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Create temp directory for resized images
const tempDir = path.join(__dirname, '../temp-profile-images');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function uploadSingleImage() {
  try {
    console.log(`\n📄 Processing: ${resolvedImagePath}`);
    console.log(`   First name: ${firstName}\n`);

    // Verify bucket access
    console.log('🔍 Verifying access to profile-pics bucket...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error(`❌ Failed to list buckets: ${listError.message}`);
      process.exit(1);
    }
    const profilePicsBucket = buckets.find(b => b.name === 'profile-pics');
    if (!profilePicsBucket) {
      console.error('❌ "profile-pics" bucket not found in Supabase Storage.');
      console.error('   Please create this bucket in your Supabase project.');
      process.exit(1);
    }
    console.log('✅ "profile-pics" bucket found.\n');

    // Create small version (32px)
    const smallFilename = `${firstName}-small.png`;
    const tempSmallPath = path.join(tempDir, smallFilename);
    await sharp(resolvedImagePath)
      .resize(32, 32, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 90 })
      .toFile(tempSmallPath);
    console.log(`   ✅ Created small version: ${smallFilename}`);

    // Create medium version (80px)
    const mediumFilename = `${firstName}-medium.png`;
    const tempMediumPath = path.join(tempDir, mediumFilename);
    await sharp(resolvedImagePath)
      .resize(80, 80, {
        fit: 'cover',
        position: 'center'
      })
      .png({ quality: 90 })
      .toFile(tempMediumPath);
    console.log(`   ✅ Created medium version: ${mediumFilename}`);

    // Read all three versions
    const originalBuffer = fs.readFileSync(resolvedImagePath);
    const smallBuffer = fs.readFileSync(tempSmallPath);
    const mediumBuffer = fs.readFileSync(tempMediumPath);

    // Upload original version
    const originalFilename = `${firstName}.png`;
    const { error: originalUploadError } = await supabase.storage
      .from('profile-pics')
      .upload(originalFilename, originalBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (originalUploadError) {
      throw new Error(`Failed to upload original: ${originalUploadError.message}`);
    }
    console.log(`   ✅ Uploaded original: ${originalFilename}`);

    // Upload small version
    const { error: smallUploadError } = await supabase.storage
      .from('profile-pics')
      .upload(smallFilename, smallBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (smallUploadError) {
      throw new Error(`Failed to upload small: ${smallUploadError.message}`);
    }
    console.log(`   ✅ Uploaded small: ${smallFilename}`);

    // Upload medium version
    const { error: mediumUploadError } = await supabase.storage
      .from('profile-pics')
      .upload(mediumFilename, mediumBuffer, {
        contentType: 'image/png',
        upsert: true
      });

    if (mediumUploadError) {
      throw new Error(`Failed to upload medium: ${mediumUploadError.message}`);
    }
    console.log(`   ✅ Uploaded medium: ${mediumFilename}`);

    // Clean up temp files
    fs.unlinkSync(tempSmallPath);
    fs.unlinkSync(tempMediumPath);

    console.log('\n🎉 Image processed and uploaded successfully!');
    console.log(`\n📝 Files uploaded to Supabase Storage:`);
    console.log(`   - ${originalFilename}`);
    console.log(`   - ${smallFilename}`);
    console.log(`   - ${mediumFilename}\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

// Run the script
uploadSingleImage()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

