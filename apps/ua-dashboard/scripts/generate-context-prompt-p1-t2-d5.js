/**
 * Generate and save context prompt for P1-T2-D5: concept-art.pdf
 * 
 * This script:
 * 1. Generates a context prompt based on IP, function, task, deliverable, and acceptance criteria
 * 2. Updates the deliverables table with the context prompt
 * 
 * Usage: node scripts/generate-context-prompt-p1-t2-d5.js
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

async function generateAndSaveContextPrompt() {
  try {
    console.log('🔍 Finding deliverable P1-T2-D5...\n');

    // Find the deliverable(s) - there might be multiple for different IPs
    const { data: deliverablesData, error: deliverableError } = await supabase
      .from('deliverables')
      .select(`
        *,
        tasks!inner(
          *,
          functions!inner(*)
        )
      `)
      .eq('deliverable_id', 'P1-T2-D5');

    if (deliverableError || !deliverablesData || deliverablesData.length === 0) {
      console.error('❌ Deliverable P1-T2-D5 not found:', deliverableError);
      process.exit(1);
    }

    console.log(`✅ Found ${deliverablesData.length} deliverable(s) with code P1-T2-D5\n`);

    // Process each deliverable (they might be for different IPs)
    for (const deliverableData of deliverablesData) {

      console.log(`\n📦 Processing deliverable: ${deliverableData.deliverable_id} - ${deliverableData.filename}`);
      if (deliverableData.ip_id) {
        console.log(`   IP ID: ${deliverableData.ip_id}`);
      }
      console.log('   Task:', deliverableData.tasks.title);
      console.log('   Function:', deliverableData.tasks.functions.code, '-', deliverableData.tasks.functions.title);

      // Get IP information if ip_id is set
      let ipData = null;
      if (deliverableData.ip_id) {
        const { data: ip } = await supabase
          .from('ips')
          .select('*')
          .eq('id', deliverableData.ip_id)
          .single();
        ipData = ip;
      } else {
        // Try to get "Doh World" as default
        const { data: ip } = await supabase
          .from('ips')
          .select('*')
          .eq('slug', 'doh-world')
          .single();
        ipData = ip;
      }

      if (!ipData) {
        console.warn('   ⚠️  IP not found, using generic description');
      }

      // Get acceptance criteria
      const { data: criteriaData } = await supabase
        .from('acceptance_criteria')
        .select('*')
        .eq('deliverable_id', deliverableData.id)
        .order('display_order');

      // Build context prompt
      let contextParts = [];

      // IP Description
      if (ipData && ipData.description) {
        contextParts.push(`IP Description: ${ipData.description}`);
      }

      // Deliverable Description
      if (deliverableData.description) {
        contextParts.push(`Deliverable Description: ${deliverableData.description}`);
      }

      // Deliverable code and filename
      contextParts.push(`Deliverable: ${deliverableData.deliverable_id} - ${deliverableData.filename}`);

      // Task and Function context
      contextParts.push(`Task: ${deliverableData.tasks.title}`);
      contextParts.push(`Core Function: ${deliverableData.tasks.functions.code} - ${deliverableData.tasks.functions.title}`);

      // Function purpose and guardrails
      if (deliverableData.tasks.functions.purpose) {
        contextParts.push(`\nFunction Purpose: ${deliverableData.tasks.functions.purpose}`);
      }

      // Acceptance Criteria
      if (criteriaData && criteriaData.length > 0) {
        contextParts.push(`\nAcceptance Criteria:`);
        criteriaData.forEach((criterion, index) => {
          contextParts.push(`${index + 1}. ${criterion.criteria_text}`);
        });
      }

      // Workflow context (for txt2img)
      contextParts.push(`\nWorkflow: Text → Image Generator`);
      contextParts.push(`Workflow Description: Creates high-quality concept art directly from prompts (optionally with style tokens or references). Great for fast visual exploration before locking designs.`);

      // Workflow validation note
      contextParts.push(`\nIMPORTANT: This workflow (Text → Image Generator) is designed for text-to-image generation.`);
      contextParts.push(`Generate a high-quality concept art image that meets the deliverable requirements and acceptance criteria. The concept art should translate E1 Variables into Product Guardrails, ensuring product concepts align with the approved IP premise, tone, and key visual cues.`);

      const fullContextPrompt = contextParts.join('\n\n');

      console.log('\n📝 Generated Context Prompt:');
      console.log('─'.repeat(80));
      console.log(fullContextPrompt);
      console.log('─'.repeat(80));

      // Update the deliverable with the context prompt
      const { error: updateError } = await supabase
        .from('deliverables')
        .update({ context_prompt: fullContextPrompt })
        .eq('id', deliverableData.id);

      if (updateError) {
        console.error(`❌ Error updating deliverable ${deliverableData.id}:`, updateError);
        continue;
      }

      console.log(`\n✅ Context prompt saved for deliverable ${deliverableData.id}!`);
    }

    console.log('\n✅ All context prompts saved successfully!');

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
generateAndSaveContextPrompt()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

