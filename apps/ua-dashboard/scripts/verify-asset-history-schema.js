/**
 * Verify Asset History Schema
 * 
 * This script checks if the asset_history table has the model_used column
 * 
 * Usage: node scripts/verify-asset-history-schema.js
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

async function verifySchema() {
  try {
    console.log('🔍 Verifying asset_history table schema...\n');

    // Try to insert a test record with model_used to see if the column exists
    const { data: testDeliverable } = await supabase
      .from('deliverables')
      .select('id')
      .limit(1)
      .single();

    if (!testDeliverable) {
      console.log('⚠️  No deliverables found to test with');
      return;
    }

    // Try inserting with model_used
    const { error: insertError } = await supabase
      .from('asset_history')
      .insert({
        deliverable_id: testDeliverable.id,
        filename: 'test_file.txt',
        storage_path: 'test/path/test_file.txt',
        model_used: 'Test Model'
      });

    if (insertError) {
      if (insertError.message.includes('model_used') || insertError.code === '42703') {
        console.log('❌ The model_used column does NOT exist in asset_history');
        console.log('   Please run: supabase/add-model-to-asset-history.sql\n');
      } else {
        console.log('⚠️  Error testing insert:', insertError.message);
      }
    } else {
      console.log('✅ The model_used column EXISTS in asset_history');
      
      // Clean up test record
      await supabase
        .from('asset_history')
        .delete()
        .eq('filename', 'test_file.txt');
      
      console.log('   (Test record cleaned up)\n');
    }

    // Check existing records
    const { data: existingRecords, error: selectError } = await supabase
      .from('asset_history')
      .select('*')
      .limit(5);

    if (selectError) {
      console.error('❌ Error querying asset_history:', selectError);
      return;
    }

    if (existingRecords && existingRecords.length > 0) {
      console.log(`✅ Found ${existingRecords.length} existing asset_history record(s)\n`);
      const firstRecord = existingRecords[0];
      console.log('Sample record structure:');
      console.log('   Columns:', Object.keys(firstRecord).join(', '));
      if ('model_used' in firstRecord) {
        console.log('   ✅ model_used column is present');
      } else {
        console.log('   ❌ model_used column is missing');
      }
    } else {
      console.log('⚠️  No existing records in asset_history');
      console.log('   This is normal if no assets have been uploaded yet\n');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

verifySchema()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

