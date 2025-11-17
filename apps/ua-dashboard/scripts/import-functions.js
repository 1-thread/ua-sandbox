/**
 * Import Functions from JSON files to Supabase
 * Run with: node scripts/import-functions.js
 * 
 * This script reads all JSON files from the functions/ folder and imports them into Supabase
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

const functionsDir = path.join(__dirname, '../functions');

async function importFunctions() {
  try {
    console.log('Starting function import...\n');

    // Get all JSON files
    const files = fs.readdirSync(functionsDir).filter(f => f.endsWith('.json'));
    console.log(`Found ${files.length} function files\n`);

    for (const file of files) {
      const filePath = path.join(functionsDir, file);
      const functionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      console.log(`Importing ${functionData.code}: ${functionData.title}...`);

      // 1. Insert or update function
      const { data: func, error: funcError } = await supabase
        .from('functions')
        .upsert({
          code: functionData.code,
          title: functionData.title,
          category: functionData.category,
          phase: functionData.phase || null,
          purpose: functionData.purpose || null,
          source_md: functionData.source_md || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'code' })
        .select()
        .single();

      if (funcError) {
        console.error(`  Error inserting function:`, funcError);
        continue;
      }

      // 2. Insert guardrails
      if (functionData.guardrails && functionData.guardrails.length > 0) {
        // Delete existing guardrails first
        await supabase.from('function_guardrails').delete().eq('function_code', functionData.code);

        const guardrails = functionData.guardrails.map((text, index) => ({
          function_code: functionData.code,
          guardrail_text: text,
          display_order: index,
        }));

        const { error: guardError } = await supabase
          .from('function_guardrails')
          .insert(guardrails);

        if (guardError) {
          console.error(`  Error inserting guardrails:`, guardError);
        } else {
          console.log(`  ✓ Inserted ${guardrails.length} guardrails`);
        }
      }

      // 3. Insert tasks and their deliverables
      if (functionData.tasks && functionData.tasks.length > 0) {
        // Delete existing tasks first (cascade will delete deliverables)
        await supabase.from('tasks').delete().eq('function_code', functionData.code);

        for (let taskIndex = 0; taskIndex < functionData.tasks.length; taskIndex++) {
          const taskData = functionData.tasks[taskIndex];

          // Insert task
          const { data: task, error: taskError } = await supabase
            .from('tasks')
            .insert({
              function_code: functionData.code,
              task_id: taskData.id,
              title: taskData.title,
              description: taskData.description || null,
              display_order: taskIndex,
            })
            .select()
            .single();

          if (taskError) {
            console.error(`  Error inserting task ${taskData.id}:`, taskError);
            continue;
          }

          // Insert deliverables for this task
          if (taskData.deliverables && taskData.deliverables.length > 0) {
            for (let delivIndex = 0; delivIndex < taskData.deliverables.length; delivIndex++) {
              const delivData = taskData.deliverables[delivIndex];

              // Insert deliverable
              const { data: deliverable, error: delivError } = await supabase
                .from('deliverables')
                .insert({
                  task_id: task.id,
                  deliverable_id: delivData.id,
                  filename: delivData.filename,
                  filetype: delivData.filetype || null,
                  path_hint: delivData.path_hint || null,
                  description: delivData.description || null,
                  display_order: delivIndex,
                })
                .select()
                .single();

              if (delivError) {
                console.error(`    Error inserting deliverable ${delivData.id}:`, delivError);
                continue;
              }

              // Insert aliases
              if (delivData.aliases && delivData.aliases.length > 0) {
                const aliases = delivData.aliases.map(alias => ({
                  deliverable_id: deliverable.id,
                  alias: alias,
                }));

                const { error: aliasError } = await supabase
                  .from('deliverable_aliases')
                  .insert(aliases);

                if (aliasError) {
                  console.error(`      Error inserting aliases:`, aliasError);
                }
              }

              // Insert acceptance criteria
              if (delivData.acceptance && delivData.acceptance.length > 0) {
                const criteria = delivData.acceptance.map((ac, index) => ({
                  deliverable_id: deliverable.id,
                  criteria_id: ac.id,
                  criteria_text: ac.text,
                  display_order: index,
                }));

                const { error: criteriaError } = await supabase
                  .from('acceptance_criteria')
                  .insert(criteria);

                if (criteriaError) {
                  console.error(`      Error inserting acceptance criteria:`, criteriaError);
                }
              }
            }
            console.log(`  ✓ Inserted ${taskData.deliverables.length} deliverables for task ${taskData.id}`);
          }
        }
        console.log(`  ✓ Inserted ${functionData.tasks.length} tasks`);
      }

      // 4. Insert function dependencies
      if (functionData.dependencies && functionData.dependencies.length > 0) {
        // Delete existing dependencies first
        await supabase.from('function_dependencies').delete().eq('from_function_code', functionData.code);

        const dependencies = functionData.dependencies.map(dep => ({
          from_function_code: functionData.code,
          to_function_code: dep,
        }));

        const { error: depError } = await supabase
          .from('function_dependencies')
          .insert(dependencies);

        if (depError) {
          console.error(`  Error inserting dependencies:`, depError);
        } else {
          console.log(`  ✓ Inserted ${dependencies.length} dependencies`);
        }
      }

      console.log(`✓ Completed ${functionData.code}\n`);
    }

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

importFunctions();

