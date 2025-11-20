/**
 * Check Asset Files Script
 * 
 * This script checks:
 * 1. What storage_path values are in the database
 * 2. What files actually exist in Supabase Storage
 * 3. Compares them to find mismatches
 * 
 * Usage: node scripts/check-asset-files.js [ip-slug]
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
const ipSlug = process.argv[2] || 'doh-world';

async function checkAssetFiles() {
  try {
    console.log(`\n🔍 Checking asset files for IP: ${ipSlug}\n`);

    // Get IP ID
    const { data: ipData, error: ipError } = await supabase
      .from('ips')
      .select('id, name, slug')
      .eq('slug', ipSlug)
      .single();

    if (ipError || !ipData) {
      console.error(`❌ IP not found: ${ipSlug}`);
      process.exit(1);
    }

    console.log(`✅ Found IP: ${ipData.name} (${ipData.id})\n`);

    // Get all deliverables for this IP
    const { data: deliverables, error: deliverablesError } = await supabase
      .from('deliverables')
      .select('id, deliverable_id, filename, storage_path, ip_id')
      .eq('ip_id', ipData.id)
      .not('storage_path', 'is', null);

    if (deliverablesError) {
      console.error('❌ Error fetching deliverables:', deliverablesError);
      process.exit(1);
    }

    console.log(`📦 Found ${deliverables.length} deliverables with storage_path in database\n`);

    // Group by directory
    const byDirectory = {};
    deliverables.forEach(d => {
      if (d.storage_path) {
        const pathParts = d.storage_path.split('/');
        const directory = pathParts.slice(0, -1).join('/');
        const fileName = pathParts[pathParts.length - 1];
        
        if (!byDirectory[directory]) {
          byDirectory[directory] = [];
        }
        byDirectory[directory].push({
          deliverable_id: d.deliverable_id,
          filename: d.filename,
          storage_path: d.storage_path,
          fileName: fileName
        });
      }
    });

    // Check each directory
    for (const [directory, files] of Object.entries(byDirectory)) {
      console.log(`\n📁 Checking directory: ${directory}`);
      console.log(`   Database expects ${files.length} file(s):`);
      files.forEach(f => {
        console.log(`   - ${f.fileName} (${f.deliverable_id}: ${f.filename})`);
      });

      // List actual files in storage
      const { data: storageFiles, error: listError } = await supabase.storage
        .from('ip-assets')
        .list(directory, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error(`   ❌ Error listing directory: ${listError.message}`);
        continue;
      }

      if (!storageFiles || storageFiles.length === 0) {
        console.log(`   ⚠️  Directory is empty or doesn't exist in storage`);
        continue;
      }

      console.log(`   ✅ Found ${storageFiles.length} file(s) in storage:`);
      storageFiles.forEach(f => {
        console.log(`   - ${f.name}`);
      });

      // Check for matches
      console.log(`\n   🔍 Matching files:`);
      files.forEach(dbFile => {
        const found = storageFiles.find(sf => sf.name === dbFile.fileName);
        if (found) {
          console.log(`   ✅ ${dbFile.fileName} - EXISTS`);
        } else {
          console.log(`   ❌ ${dbFile.fileName} - NOT FOUND`);
          // Try to find similar files
          const similar = storageFiles.filter(sf => 
            sf.name.includes(dbFile.fileName.split('_')[0]) ||
            sf.name.startsWith(dbFile.fileName.split('.')[0])
          );
          if (similar.length > 0) {
            console.log(`      💡 Similar files found:`);
            similar.forEach(s => console.log(`         - ${s.name}`));
          }
        }
      });
    }

    // Also check asset_history
    console.log(`\n\n📜 Checking asset_history table...`);
    const { data: history, error: historyError } = await supabase
      .from('asset_history')
      .select('id, deliverable_id, filename, storage_path, uploaded_at')
      .in('deliverable_id', deliverables.map(d => d.id));

    if (historyError) {
      console.error('❌ Error fetching asset_history:', historyError);
    } else {
      console.log(`✅ Found ${history?.length || 0} entries in asset_history`);
      if (history && history.length > 0) {
        console.log(`\n   Recent uploads:`);
        history.slice(0, 10).forEach(h => {
          console.log(`   - ${h.filename} (${h.storage_path}) - ${new Date(h.uploaded_at).toLocaleString()}`);
        });
      }
    }

    console.log(`\n✨ Done!\n`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

checkAssetFiles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

