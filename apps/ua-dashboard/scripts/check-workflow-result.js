/**
 * Check Workflow Result
 * 
 * This script checks if a workflow result exists and if the image was saved
 * 
 * Usage: node scripts/check-workflow-result.js [deliverable-id] [contributor-id]
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

async function checkWorkflowResult() {
  try {
    console.log('🔍 Checking workflow results...\n');

    // First check if the table exists
    const { data: tables, error: tablesError } = await supabase
      .from('workflow_results')
      .select('id')
      .limit(1);

    if (tablesError) {
      if (tablesError.code === 'PGRST205') {
        console.error('❌ The workflow_results table does not exist!');
        console.error('\nPlease run the migration: supabase/add-workflow-results.sql');
        console.error('Go to your Supabase dashboard → SQL Editor and run the migration.\n');
        process.exit(1);
      }
      throw tablesError;
    }

    // Get the most recent workflow result
    const { data: results, error: resultsError } = await supabase
      .from('workflow_results')
      .select(`
        *,
        deliverable:deliverables(deliverable_id, filename),
        contributor:contributors(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (resultsError) {
      throw resultsError;
    }

    if (!results || results.length === 0) {
      console.log('⚠️  No workflow results found in the database.\n');
      console.log('This could mean:');
      console.log('  1. No images have been generated yet');
      console.log('  2. The workflow_results table is empty');
      console.log('  3. The result was not saved during image generation\n');
      return;
    }

    console.log(`✅ Found ${results.length} workflow result(s):\n`);

    results.forEach((result, index) => {
      console.log(`${index + 1}. Workflow Result:`);
      console.log(`   ID: ${result.id}`);
      console.log(`   Workflow: ${result.workflow_id}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Model: ${result.model_used || 'N/A'}`);
      console.log(`   Created: ${new Date(result.created_at).toLocaleString()}`);
      
      if (result.deliverable) {
        console.log(`   Deliverable: ${result.deliverable.deliverable_id} - ${result.deliverable.filename}`);
      }
      
      if (result.contributor) {
        console.log(`   Contributor: ${result.contributor.name}`);
      }

      if (result.output_image_url) {
        console.log(`   ✅ Image URL: ${result.output_image_url.substring(0, 80)}...`);
        console.log(`      (OpenAI temporary URL - may expire)`);
      } else {
        console.log(`   ⚠️  No image URL stored`);
      }

      if (result.archived_at) {
        console.log(`   📦 Archived: ${new Date(result.archived_at).toLocaleString()}`);
        if (result.archived_prompt_path) {
          console.log(`      Prompt: ${result.archived_prompt_path}`);
        }
        if (result.archived_image_path) {
          console.log(`      Image: ${result.archived_image_path}`);
        }
      }

      if (result.user_prompt) {
        console.log(`   User Prompt: ${result.user_prompt.substring(0, 100)}...`);
      }

      console.log('');
    });

    // Check if the most recent result has an image URL
    const mostRecent = results[0];
    if (mostRecent.output_image_url) {
      console.log('🔍 Testing if image URL is accessible...\n');
      
      try {
        const testResponse = await fetch(mostRecent.output_image_url, { method: 'HEAD' });
        if (testResponse.ok) {
          console.log('✅ Image URL is accessible');
          console.log(`   Content-Type: ${testResponse.headers.get('Content-Type')}`);
          console.log(`   Content-Length: ${testResponse.headers.get('Content-Length')} bytes`);
        } else {
          console.log(`⚠️  Image URL returned status: ${testResponse.status}`);
          console.log('   The URL may have expired (OpenAI URLs are temporary)');
        }
      } catch (err) {
        console.log('⚠️  Could not test image URL:', err.message);
      }
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

checkWorkflowResult()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

