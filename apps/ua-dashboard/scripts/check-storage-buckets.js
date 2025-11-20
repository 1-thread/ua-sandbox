/**
 * Check Storage Buckets Script
 * 
 * This script lists all storage buckets and verifies they exist
 * 
 * Usage: node scripts/check-storage-buckets.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set in .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkBuckets() {
  try {
    console.log(`\n🔍 Checking Supabase Storage buckets...\n`);

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.error('❌ Error listing buckets:', error);
      process.exit(1);
    }

    console.log(`✅ Found ${buckets.length} bucket(s):\n`);

    const requiredBuckets = ['ip-assets', 'profile-pics', 'workflows'];
    const foundBuckets = buckets.map(b => b.name);

    buckets.forEach(bucket => {
      const isRequired = requiredBuckets.includes(bucket.name);
      const status = isRequired ? '✅' : 'ℹ️';
      console.log(`${status} ${bucket.name}`);
      console.log(`   ID: ${bucket.id}`);
      console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`);
      console.log(`   Created: ${bucket.created_at}`);
      console.log(`   Updated: ${bucket.updated_at}`);
      console.log('');
    });

    console.log(`\n📋 Required buckets:`);
    requiredBuckets.forEach(bucketName => {
      if (foundBuckets.includes(bucketName)) {
        console.log(`   ✅ ${bucketName} - EXISTS`);
      } else {
        console.log(`   ❌ ${bucketName} - MISSING (needs to be created)`);
      }
    });

    // Check if ip-assets bucket exists and has files
    if (foundBuckets.includes('ip-assets')) {
      console.log(`\n📦 Checking ip-assets bucket contents...`);
      const { data: files, error: listError } = await supabase.storage
        .from('ip-assets')
        .list('', {
          limit: 10,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error(`   ❌ Error listing files: ${listError.message}`);
      } else {
        console.log(`   ✅ Found ${files?.length || 0} top-level items`);
        if (files && files.length > 0) {
          console.log(`   Sample files/directories:`);
          files.slice(0, 5).forEach(f => {
            console.log(`      - ${f.name} (${f.id})`);
          });
        }
      }
    }

    console.log(`\n✨ Done!\n`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

checkBuckets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

