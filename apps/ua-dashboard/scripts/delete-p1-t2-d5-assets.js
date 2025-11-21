/**
 * Delete P1-T2-D5 Assets
 * 
 * This script deletes all asset_history entries and files for P1-T2-D5 deliverable
 * 
 * Usage: node scripts/delete-p1-t2-d5-assets.js
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

async function deleteAssets() {
  try {
    console.log('🗑️  Deleting P1-T2-D5 assets...\n');

    // Find all deliverables with code P1-T2-D5
    const { data: deliverables, error: deliverableError } = await supabase
      .from('deliverables')
      .select('id, deliverable_id, filename')
      .eq('deliverable_id', 'P1-T2-D5');

    if (deliverableError) throw deliverableError;

    if (!deliverables || deliverables.length === 0) {
      console.log('⚠️  No deliverables found with code P1-T2-D5');
      return;
    }

    console.log(`📦 Found ${deliverables.length} deliverable(s) with code P1-T2-D5\n`);

    let totalDeleted = 0;
    let totalFilesDeleted = 0;
    let totalErrors = 0;

    // Process each deliverable
    for (const deliverable of deliverables) {
      console.log(`\n📄 Processing deliverable: ${deliverable.deliverable_id} (${deliverable.id})`);

      // Get all asset_history entries for this deliverable
      const { data: history, error: historyError } = await supabase
        .from('asset_history')
        .select('*')
        .eq('deliverable_id', deliverable.id);

      if (historyError) {
        console.error(`   ❌ Error fetching history: ${historyError.message}`);
        totalErrors++;
        continue;
      }

      if (!history || history.length === 0) {
        console.log(`   ⚠️  No asset history found for this deliverable`);
        continue;
      }

      console.log(`   📋 Found ${history.length} asset history entry/entries`);

      // Delete files from storage and database
      for (const item of history) {
        try {
          // Delete main file from storage
          if (item.storage_path) {
            const { error: fileError } = await supabase.storage
              .from('ip-assets')
              .remove([item.storage_path]);

            if (fileError) {
              console.error(`   ⚠️  Error deleting file ${item.storage_path}: ${fileError.message}`);
            } else {
              console.log(`   ✅ Deleted file: ${item.storage_path}`);
              totalFilesDeleted++;
            }
          }

          // Delete thumbnail from storage
          if (item.thumbnail_path) {
            const { error: thumbError } = await supabase.storage
              .from('ip-assets')
              .remove([item.thumbnail_path]);

            if (thumbError) {
              console.error(`   ⚠️  Error deleting thumbnail ${item.thumbnail_path}: ${thumbError.message}`);
            } else {
              console.log(`   ✅ Deleted thumbnail: ${item.thumbnail_path}`);
              totalFilesDeleted++;
            }
          }

          // Delete from database
          const { error: deleteError } = await supabase
            .from('asset_history')
            .delete()
            .eq('id', item.id);

          if (deleteError) {
            console.error(`   ❌ Error deleting database entry ${item.id}: ${deleteError.message}`);
            totalErrors++;
          } else {
            console.log(`   ✅ Deleted database entry: ${item.filename}`);
            totalDeleted++;
          }
        } catch (err) {
          console.error(`   ❌ Error processing ${item.filename}:`, err.message);
          totalErrors++;
        }
      }
    }

    // Also delete workflow_results for P1-T2-D5
    console.log(`\n🗑️  Deleting workflow_results for P1-T2-D5...`);
    
    // Get all deliverables with P1-T2-D5 code
    const deliverableIds = deliverables.map(d => d.id);
    
    const { data: workflowResults, error: workflowError } = await supabase
      .from('workflow_results')
      .select('id')
      .in('deliverable_id', deliverableIds);

    if (workflowError) {
      console.error(`   ⚠️  Error fetching workflow_results: ${workflowError.message}`);
    } else if (workflowResults && workflowResults.length > 0) {
      const { error: deleteWorkflowError } = await supabase
        .from('workflow_results')
        .delete()
        .in('deliverable_id', deliverableIds);

      if (deleteWorkflowError) {
        console.error(`   ❌ Error deleting workflow_results: ${deleteWorkflowError.message}`);
      } else {
        console.log(`   ✅ Deleted ${workflowResults.length} workflow_result(s)`);
      }
    } else {
      console.log(`   ⚠️  No workflow_results found`);
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Database entries deleted: ${totalDeleted}`);
    console.log(`   ✅ Files deleted from storage: ${totalFilesDeleted}`);
    console.log(`   ❌ Errors: ${totalErrors}\n`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Confirm before deleting
console.log('⚠️  WARNING: This will delete ALL assets and files for P1-T2-D5!');
console.log('   This includes:');
console.log('   - All asset_history entries');
console.log('   - All files in Supabase Storage');
console.log('   - All thumbnails');
console.log('   - All workflow_results');
console.log('\n   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  deleteAssets()
    .then(() => {
      console.log('✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    });
}, 3000);

