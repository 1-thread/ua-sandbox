/**
 * Check Asset History for a Deliverable
 * 
 * This script checks if asset history entries exist for a specific deliverable
 * 
 * Usage: node scripts/check-asset-history.js <deliverable-id>
 * Example: node scripts/check-asset-history.js P1-T2-D5
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('\nPlease set in .env.local:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAssetHistory(deliverableCode) {
  try {
    console.log(`🔍 Checking asset history for deliverable: ${deliverableCode}\n`);

    // Find the deliverable(s)
    const { data: deliverables, error: delError } = await supabase
      .from('deliverables')
      .select('id, deliverable_id, filename, ip_id')
      .eq('deliverable_id', deliverableCode);

    if (delError) {
      console.error('❌ Error finding deliverable:', delError);
      process.exit(1);
    }

    if (!deliverables || deliverables.length === 0) {
      console.error(`❌ No deliverables found with code: ${deliverableCode}`);
      process.exit(1);
    }

    console.log(`✅ Found ${deliverables.length} deliverable(s)\n`);

    for (const deliverable of deliverables) {
      console.log(`📦 Deliverable: ${deliverable.deliverable_id} - ${deliverable.filename}`);
      console.log(`   ID: ${deliverable.id}`);
      if (deliverable.ip_id) {
        console.log(`   IP ID: ${deliverable.ip_id}`);
      }
      console.log('');

      // Get asset history
      const { data: history, error: historyError } = await supabase
        .from('asset_history')
        .select(`
          *,
          contributor:contributors(name)
        `)
        .eq('deliverable_id', deliverable.id)
        .order('uploaded_at', { ascending: false });

      if (historyError) {
        console.error('❌ Error loading asset history:', historyError);
        continue;
      }

      if (!history || history.length === 0) {
        console.log('   ⚠️  No asset history found for this deliverable\n');
        continue;
      }

      console.log(`   ✅ Found ${history.length} asset history entry/entries:\n`);
      history.forEach((item, index) => {
        const uploadedAt = new Date(item.uploaded_at).toLocaleString();
        const contributorName = item.contributor?.name || 'Unknown';
        console.log(`   ${index + 1}. ${item.filename}`);
        console.log(`      Storage Path: ${item.storage_path}`);
        console.log(`      Uploaded: ${uploadedAt}`);
        console.log(`      Contributor: ${contributorName}`);
        if (item.model_used) {
          console.log(`      Model: ${item.model_used}`);
        }
        console.log('');
      });
    }

    // Also check workflow_results for archived items
    console.log('\n🔍 Checking workflow_results for archived items...\n');
    
    for (const deliverable of deliverables) {
      const { data: workflowResults, error: wrError } = await supabase
        .from('workflow_results')
        .select('*')
        .eq('deliverable_id', deliverable.id)
        .eq('status', 'archived')
        .order('archived_at', { ascending: false });

      if (wrError) {
        console.error('❌ Error loading workflow results:', wrError);
        continue;
      }

      if (!workflowResults || workflowResults.length === 0) {
        console.log(`   ⚠️  No archived workflow results for ${deliverable.deliverable_id}\n`);
        continue;
      }

      console.log(`   ✅ Found ${workflowResults.length} archived workflow result(s) for ${deliverable.deliverable_id}:\n`);
      workflowResults.forEach((result, index) => {
        const archivedAt = result.archived_at ? new Date(result.archived_at).toLocaleString() : 'N/A';
        console.log(`   ${index + 1}. Workflow: ${result.workflow_id}`);
        console.log(`      Model: ${result.model_used || 'N/A'}`);
        console.log(`      Archived: ${archivedAt}`);
        console.log(`      Prompt Path: ${result.archived_prompt_path || 'N/A'}`);
        console.log(`      Image Path: ${result.archived_image_path || 'N/A'}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

const deliverableCode = process.argv[2];
if (!deliverableCode) {
  console.error('Usage: node scripts/check-asset-history.js <deliverable-id>');
  console.error('Example: node scripts/check-asset-history.js P1-T2-D5');
  process.exit(1);
}

checkAssetHistory(deliverableCode)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

