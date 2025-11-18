/**
 * Ontology Initializer Script
 * 
 * This script initializes the ontology (functions, tasks, deliverables) for a new IP
 * by copying generic templates to IP-specific entries.
 * 
 * Usage: node scripts/initialize-ip-ontology.js <ip-slug>
 * Example: node scripts/initialize-ip-ontology.js doh-world
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function initializeIPOntology(ipSlug) {
  try {
    console.log(`\n🚀 Initializing ontology for IP: ${ipSlug}\n`);

    // Get IP ID
    const { data: ipData, error: ipError } = await supabase
      .from('ips')
      .select('id, name')
      .eq('slug', ipSlug)
      .single();

    if (ipError || !ipData) {
      throw new Error(`IP with slug "${ipSlug}" not found`);
    }

    console.log(`✓ Found IP: ${ipData.name} (${ipData.id})`);

    // Call the database function
    const { data, error } = await supabase.rpc('initialize_ip_ontology', {
      ip_slug: ipSlug
    });

    if (error) {
      // If function doesn't exist, fall back to manual initialization
      console.log('⚠️  Database function not found, using manual initialization...');
      return await manualInitialize(ipData.id, ipSlug);
    }

    if (data && data.length > 0) {
      const result = data[0];
      console.log('\n✅ Initialization complete!');
      console.log(`   Functions linked: ${result.functions_added}`);
      console.log(`   Tasks: ${result.tasks_added}`);
      console.log(`   Deliverables created: ${result.deliverables_added}`);
      console.log(`   Aliases copied: ${result.aliases_added}`);
      console.log(`   Criteria copied: ${result.criteria_added}\n`);
      return result;
    }

    throw new Error('No data returned from initialization function');
  } catch (err) {
    console.error('❌ Error initializing ontology:', err.message);
    if (err.details) console.error('Details:', err.details);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  }
}

async function manualInitialize(ipId, ipSlug) {
  console.log('📋 Starting manual initialization...\n');

  // Step 1: Get IP's verticals
  const { data: verticals, error: verticalsError } = await supabase
    .from('ip_verticals')
    .select('vertical_name')
    .eq('ip_id', ipId);

  if (verticalsError) throw verticalsError;
  const verticalNames = verticals.map(v => v.vertical_name);
  console.log(`✓ Found verticals: ${verticalNames.join(', ')}`);

  // Step 2: Link functions to IP based on verticals
  const { data: functions, error: functionsError } = await supabase
    .from('functions')
    .select('code')
    .in('category', verticalNames);

  if (functionsError) throw functionsError;
  console.log(`✓ Found ${functions.length} functions to link`);

  let functionsLinked = 0;
  for (const func of functions) {
    const { error: linkError } = await supabase
      .from('ip_functions')
      .upsert({
        ip_id: ipId,
        function_code: func.code
      }, {
        onConflict: 'ip_id,function_code',
        ignoreDuplicates: true
      });

    if (!linkError) functionsLinked++;
  }
  console.log(`✓ Linked ${functionsLinked} functions to IP`);

  // Step 3: Get all tasks for linked functions
  const functionCodes = functions.map(f => f.code);
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .in('function_code', functionCodes);

  if (tasksError) throw tasksError;
  console.log(`✓ Found ${tasks.length} tasks`);

  // Step 4: Create IP-specific deliverables
  let deliverablesCreated = 0;
  let aliasesCopied = 0;
  let criteriaCopied = 0;

  for (const task of tasks) {
    // Get generic deliverables for this task
    const { data: genericDeliverables, error: delError } = await supabase
      .from('deliverables')
      .select('*')
      .eq('task_id', task.id)
      .is('ip_id', null); // Only get templates

    if (delError) throw delError;

    for (const genericDel of genericDeliverables || []) {
      // Check if IP-specific deliverable already exists
      const { data: existing, error: checkError } = await supabase
        .from('deliverables')
        .select('id')
        .eq('task_id', task.id)
        .eq('deliverable_id', genericDel.deliverable_id)
        .eq('ip_id', ipId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existing) {
        // Create IP-specific copy
        const { data: newDel, error: createError } = await supabase
          .from('deliverables')
          .insert({
            task_id: task.id,
            deliverable_id: genericDel.deliverable_id,
            filename: genericDel.filename,
            filetype: genericDel.filetype,
            path_hint: genericDel.path_hint,
            description: genericDel.description,
            display_order: genericDel.display_order,
            status: genericDel.status || 'Assigned',
            storage_path: null,
            ip_id: ipId
          })
          .select()
          .single();

        if (createError) throw createError;
        deliverablesCreated++;

        // Copy aliases
        const { data: aliases, error: aliasError } = await supabase
          .from('deliverable_aliases')
          .select('alias')
          .eq('deliverable_id', genericDel.id);

        if (!aliasError && aliases) {
          for (const alias of aliases) {
            await supabase
              .from('deliverable_aliases')
              .upsert({
                deliverable_id: newDel.id,
                alias: alias.alias
              }, {
                onConflict: 'deliverable_id,alias',
                ignoreDuplicates: true
              });
            aliasesCopied++;
          }
        }

        // Copy criteria
        const { data: criteria, error: critError } = await supabase
          .from('acceptance_criteria')
          .select('*')
          .eq('deliverable_id', genericDel.id);

        if (!critError && criteria) {
          for (const criterion of criteria) {
            await supabase
              .from('acceptance_criteria')
              .upsert({
                deliverable_id: newDel.id,
                criteria_id: criterion.criteria_id,
                criteria_text: criterion.criteria_text,
                display_order: criterion.display_order
              }, {
                onConflict: 'deliverable_id,criteria_id',
                ignoreDuplicates: true
              });
            criteriaCopied++;
          }
        }
      }
    }
  }

  console.log('\n✅ Manual initialization complete!');
  console.log(`   Functions linked: ${functionsLinked}`);
  console.log(`   Tasks: ${tasks.length}`);
  console.log(`   Deliverables created: ${deliverablesCreated}`);
  console.log(`   Aliases copied: ${aliasesCopied}`);
  console.log(`   Criteria copied: ${criteriaCopied}\n`);

  return {
    functions_added: functionsLinked,
    tasks_added: tasks.length,
    deliverables_added: deliverablesCreated,
    aliases_added: aliasesCopied,
    criteria_added: criteriaCopied
  };
}

// Main execution
const ipSlug = process.argv[2];
if (!ipSlug) {
  console.error('❌ Please provide an IP slug as argument');
  console.error('Usage: node scripts/initialize-ip-ontology.js <ip-slug>');
  process.exit(1);
}

initializeIPOntology(ipSlug);

