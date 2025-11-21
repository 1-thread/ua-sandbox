/**
 * List All Asset History
 * 
 * This script lists all asset history entries
 * 
 * Usage: node scripts/list-all-asset-history.js
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

async function listAllAssetHistory() {
  try {
    console.log('🔍 Listing all asset history entries...\n');

    const { data: history, error } = await supabase
      .from('asset_history')
      .select(`
        *,
        deliverable:deliverables(deliverable_id, filename),
        contributor:contributors(name)
      `)
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    if (!history || history.length === 0) {
      console.log('⚠️  No asset history entries found\n');
      return;
    }

    console.log(`✅ Found ${history.length} asset history entry/entries:\n`);

    history.forEach((item, index) => {
      const uploadedAt = new Date(item.uploaded_at).toLocaleString();
      const deliverableCode = item.deliverable?.deliverable_id || 'Unknown';
      const deliverableFilename = item.deliverable?.filename || 'Unknown';
      const contributorName = item.contributor?.name || 'Unknown';
      
      console.log(`${index + 1}. ${item.filename}`);
      console.log(`   Deliverable: ${deliverableCode} - ${deliverableFilename}`);
      console.log(`   Storage Path: ${item.storage_path}`);
      console.log(`   Uploaded: ${uploadedAt}`);
      console.log(`   Contributor: ${contributorName}`);
      if (item.model_used) {
        console.log(`   Model: ${item.model_used}`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

listAllAssetHistory()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

