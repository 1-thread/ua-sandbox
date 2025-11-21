/**
 * Verify Workflow Results Schema
 * 
 * This script verifies that the workflow_results table has all required columns
 * 
 * Usage: node scripts/verify-workflow-results-schema.js
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
    console.log('🔍 Verifying workflow_results table schema...\n');

    // Try to insert a test record with all fields
    const { data: testDeliverable } = await supabase
      .from('deliverables')
      .select('id')
      .limit(1)
      .single();

    const { data: testContributor } = await supabase
      .from('contributors')
      .select('id')
      .limit(1)
      .single();

    if (!testDeliverable || !testContributor) {
      console.log('⚠️  Need at least one deliverable and contributor to test');
      return;
    }

    // Try inserting with all fields
    const testData = {
      workflow_id: 'txt2img',
      deliverable_id: testDeliverable.id,
      contributor_id: testContributor.id,
      context_prompt: 'Test context prompt',
      user_prompt: 'Test user prompt',
      output_text: null,
      output_image_url: 'https://example.com/test.jpg',
      model_used: 'OpenAI DALL-E',
      status: 'completed',
      archived_at: null,
      archived_prompt_path: null,
      archived_image_path: null
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('workflow_results')
      .insert(testData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test record:', insertError);
      if (insertError.message.includes('column') || insertError.code === '42703') {
        console.error('   This suggests a column is missing from the table');
      }
      return;
    }

    console.log('✅ Successfully inserted test record');
    console.log('   Record ID:', insertedData.id);
    console.log('   All columns present and working\n');

    // Check the structure
    console.log('📋 Table structure verified:');
    console.log('   Columns:', Object.keys(insertedData).join(', '));
    console.log('');

    // Clean up test record
    const { error: deleteError } = await supabase
      .from('workflow_results')
      .delete()
      .eq('id', insertedData.id);

    if (deleteError) {
      console.warn('⚠️  Could not delete test record:', deleteError.message);
    } else {
      console.log('✅ Test record cleaned up\n');
    }

    // Check indexes
    console.log('📊 Checking indexes...');
    const { data: indexes, error: indexError } = await supabase
      .rpc('pg_indexes', { tablename: 'workflow_results' })
      .catch(() => ({ data: null, error: { message: 'Could not check indexes' } }));

    if (!indexError && indexes) {
      console.log('   Indexes found:', indexes.length);
    } else {
      console.log('   (Index check not available, but table is working)');
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

