/**
 * Check Storage Files
 * 
 * This script checks if files exist in Supabase Storage for a specific IP
 * 
 * Usage: node scripts/check-storage-files.js <ip-slug> [path-prefix]
 * Example: node scripts/check-storage-files.js doh-world PRODUCT
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkStorageFiles(ipSlug, pathPrefix = '') {
  try {
    console.log(`🔍 Checking storage files for IP: ${ipSlug}`);
    if (pathPrefix) {
      console.log(`   Path prefix: ${pathPrefix}\n`);
    } else {
      console.log('');
    }

    // List files in the ip-assets bucket
    const searchPath = pathPrefix ? `${ipSlug}/${pathPrefix}` : ipSlug;
    
    const { data: files, error: listError } = await supabase.storage
      .from('ip-assets')
      .list(searchPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'desc' }
      });

    if (listError) {
      if (listError.message.includes('not found')) {
        console.log(`⚠️  Path "${searchPath}" not found in storage`);
        console.log('   This could mean:');
        console.log('   1. No files have been uploaded yet');
        console.log('   2. The path structure is different');
        console.log('   3. The IP slug is incorrect\n');
      } else {
        throw listError;
      }
      return;
    }

    if (!files || files.length === 0) {
      console.log(`⚠️  No files found in path: ${searchPath}\n`);
      return;
    }

    console.log(`✅ Found ${files.length} file(s):\n`);
    
    // Filter for recent files (last 24 hours)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    files.forEach((file, index) => {
      const fileDate = new Date(file.created_at);
      const isRecent = fileDate > oneDayAgo;
      const dateStr = fileDate.toLocaleString();
      
      console.log(`${index + 1}. ${file.name}`);
      console.log(`   Path: ${searchPath}/${file.name}`);
      console.log(`   Size: ${(file.metadata?.size || 0).toLocaleString()} bytes`);
      console.log(`   Created: ${dateStr} ${isRecent ? '🆕' : ''}`);
      console.log('');
    });

    // Check for P1-T2-D5 related files specifically
    const p1T2D5Files = files.filter(f => f.name.includes('P1-T2-D5'));
    if (p1T2D5Files.length > 0) {
      console.log(`\n📦 Found ${p1T2D5Files.length} P1-T2-D5 related file(s):\n`);
      p1T2D5Files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
        console.log(`   Created: ${new Date(file.created_at).toLocaleString()}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

const ipSlug = process.argv[2];
const pathPrefix = process.argv[3] || '';

if (!ipSlug) {
  console.error('Usage: node scripts/check-storage-files.js <ip-slug> [path-prefix]');
  console.error('Example: node scripts/check-storage-files.js doh-world PRODUCT');
  process.exit(1);
}

checkStorageFiles(ipSlug, pathPrefix)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

