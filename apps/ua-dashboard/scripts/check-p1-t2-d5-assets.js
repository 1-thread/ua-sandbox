/**
 * Check P1-T2-D5 Assets
 * 
 * This script checks asset_history entries for P1-T2-D5 deliverable
 * 
 * Usage: node scripts/check-p1-t2-d5-assets.js
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

async function checkAssets() {
  try {
    console.log('🔍 Checking P1-T2-D5 assets...\n');

    // Find the deliverable
    const { data: deliverables, error: deliverableError } = await supabase
      .from('deliverables')
      .select('id, deliverable_id, filename')
      .eq('deliverable_id', 'P1-T2-D5');

    if (deliverableError) throw deliverableError;

    if (!deliverables || deliverables.length === 0) {
      console.log('❌ No deliverable found with code P1-T2-D5');
      return;
    }

    console.log(`✅ Found ${deliverables.length} deliverable(s) with code P1-T2-D5:\n`);
    deliverables.forEach(d => {
      console.log(`   - ${d.deliverable_id}: ${d.filename} (ID: ${d.id})`);
    });

    // Check asset_history for each deliverable
    for (const deliverable of deliverables) {
      console.log(`\n📦 Checking asset_history for deliverable ${deliverable.deliverable_id} (${deliverable.id}):\n`);

      const { data: history, error: historyError } = await supabase
        .from('asset_history')
        .select(`
          *,
          contributor:contributors(name)
        `)
        .eq('deliverable_id', deliverable.id)
        .order('uploaded_at', { ascending: false });

      if (historyError) throw historyError;

      if (!history || history.length === 0) {
        console.log('   ⚠️  No asset history found');
        continue;
      }

      console.log(`   ✅ Found ${history.length} asset history entry/entries:\n`);

      history.forEach((item, index) => {
        console.log(`   Entry ${index + 1}:`);
        console.log(`     ID: ${item.id}`);
        console.log(`     Filename: ${item.filename}`);
        console.log(`     Storage Path: ${item.storage_path}`);
        console.log(`     Thumbnail Path: ${item.thumbnail_path || '❌ NOT SET'}`);
        console.log(`     Model Used: ${item.model_used || 'N/A'}`);
        console.log(`     Contributor: ${item.contributor?.name || 'Unknown'}`);
        console.log(`     Uploaded At: ${new Date(item.uploaded_at).toLocaleString()}`);
        console.log('');

        // Check if file exists in storage
        const pathParts = item.storage_path.split('/');
        const directory = pathParts.slice(0, -1).join('/');
        const fileName = pathParts[pathParts.length - 1];

        supabase.storage
          .from('ip-assets')
          .list(directory || '', {
            limit: 100,
            offset: 0
          })
          .then(({ data: files, error: listError }) => {
            if (listError) {
              console.log(`     ⚠️  Error checking storage: ${listError.message}`);
            } else {
              const fileExists = files?.some(f => f.name === fileName);
              console.log(`     Storage: ${fileExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
              
              // Check thumbnail if it exists
              if (item.thumbnail_path) {
                const thumbParts = item.thumbnail_path.split('/');
                const thumbDir = thumbParts.slice(0, -1).join('/');
                const thumbName = thumbParts[thumbParts.length - 1];
                const thumbExists = files?.some(f => f.name === thumbName);
                console.log(`     Thumbnail: ${thumbExists ? '✅ EXISTS' : '❌ NOT FOUND'} (${item.thumbnail_path})`);
              }
            }
          });
      });
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

checkAssets()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

