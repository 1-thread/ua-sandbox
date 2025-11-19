/**
 * Test Profile Images Access
 * 
 * This script tests if profile images can be accessed from Supabase Storage
 * 
 * Usage: node scripts/test-profile-images.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test contributors from the database
const testNames = ['nick', 'alex', 'devon', 'gary', 'jerod', 'leah', 'maya', 'riley', 'sana', 'tom'];

async function testProfileImages() {
  console.log('\n🧪 Testing Profile Image Access\n');
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`Bucket: profile-pics\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const firstName of testNames) {
    const filename = `${firstName}.png`;
    console.log(`Testing: ${filename}...`);

    try {
      // Try to generate signed URL
      const { data: signedUrl, error } = await supabase.storage
        .from('profile-pics')
        .createSignedUrl(filename, 3600);

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
        console.error(`     Status: ${error.statusCode || 'N/A'}`);
        errorCount++;
      } else if (signedUrl && signedUrl.signedUrl) {
        console.log(`  ✅ Success! URL: ${signedUrl.signedUrl.substring(0, 60)}...`);
        successCount++;
      } else {
        console.error(`  ❌ No signed URL returned`);
        errorCount++;
      }
    } catch (err) {
      console.error(`  ❌ Exception: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total: ${testNames.length}\n`);

  if (errorCount > 0) {
    console.log('⚠️  Troubleshooting:');
    console.log('   1. Make sure the "profile-pics" bucket exists in Supabase Storage');
    console.log('   2. Run supabase/profile-pics-storage-policies.sql to set up RLS policies');
    console.log('   3. Verify the bucket is set to "private" (not public)');
    console.log('   4. Check that files are named correctly (e.g., nick.png, alex.png)');
    console.log('   5. Verify files are actually uploaded to the bucket\n');
  } else {
    console.log('🎉 All profile images are accessible!\n');
  }
}

// Run the test
testProfileImages()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

