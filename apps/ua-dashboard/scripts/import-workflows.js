/**
 * Import Workflows from JSON file to Supabase
 * Run with: node scripts/import-workflows.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const workflowsPath = path.join(__dirname, '../workflows/workflows.json');

async function importWorkflows() {
  try {
    console.log('Starting workflow import...\n');

    if (!fs.existsSync(workflowsPath)) {
      throw new Error(`Workflows file not found: ${workflowsPath}`);
    }

    const workflowsData = JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));
    const workflows = workflowsData.assistants || [];

    console.log(`Found ${workflows.length} workflows to import\n`);

    for (const workflow of workflows) {
      console.log(`Importing ${workflow.id}: ${workflow.name}...`);

      // Default hidden prompt (can be customized per workflow later)
      const defaultHiddenPrompt = `You are a specialized assistant for Universal Asset workflows. 
You help users complete specific tasks related to ${workflow.name}.
Provide clear, actionable responses. Do not reference previous conversations or maintain context between requests.
Focus only on the current user request and provide the best possible output for this workflow.`;

      // Insert or update workflow
      const { data: workflowRecord, error: workflowError } = await supabase
        .from('workflows')
        .upsert({
          workflow_id: workflow.id,
          name: workflow.name,
          description: workflow.description || null,
          image_path: workflow.image || null,
          supports_upload: workflow.supports_upload || false,
          hidden_prompt: defaultHiddenPrompt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'workflow_id' })
        .select()
        .single();

      if (workflowError) {
        console.error(`  Error inserting workflow:`, workflowError);
        continue;
      }

      console.log(`  ✓ Workflow inserted/updated`);

      // Delete existing steps
      await supabase.from('workflow_steps').delete().eq('workflow_id', workflowRecord.id);

      // Insert steps
      if (workflow.steps && workflow.steps.length > 0) {
        const steps = workflow.steps.map((stepText, index) => ({
          workflow_id: workflowRecord.id,
          step_text: stepText,
          display_order: index,
        }));

        const { error: stepsError } = await supabase
          .from('workflow_steps')
          .insert(steps);

        if (stepsError) {
          console.error(`  Error inserting steps:`, stepsError);
        } else {
          console.log(`  ✓ Inserted ${steps.length} steps`);
        }
      }

      // Delete existing relevant deliverables
      await supabase.from('workflow_deliverables').delete().eq('workflow_id', workflowRecord.id);

      // Insert relevant deliverables
      if (workflow.relevant_codes && workflow.relevant_codes.length > 0) {
        const deliverables = workflow.relevant_codes.map(code => ({
          workflow_id: workflowRecord.id,
          deliverable_code: code,
        }));

        const { error: delivError } = await supabase
          .from('workflow_deliverables')
          .insert(deliverables);

        if (delivError) {
          console.error(`  Error inserting deliverables:`, delivError);
        } else {
          console.log(`  ✓ Linked ${deliverables.length} deliverables`);
        }
      }
    }

    console.log('\n✅ Workflow import complete!');
  } catch (err) {
    console.error('❌ Error importing workflows:', err.message);
    process.exit(1);
  }
}

importWorkflows();

