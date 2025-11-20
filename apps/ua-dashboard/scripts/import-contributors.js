/**
 * Import Contributors from JSON files
 * 
 * This script reads all JSON files from the contributors/ folder
 * and imports them into the Supabase contributors table.
 * 
 * Usage: node scripts/import-contributors.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importContributors() {
  const contributorsDir = path.join(__dirname, '../contributors');
  
  // Get all JSON files except the design doc
  const files = fs.readdirSync(contributorsDir)
    .filter(file => file.endsWith('.json') && file !== 'contributor_design_doc.txt');

  console.log(`\n📦 Found ${files.length} contributor JSON files\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(contributorsDir, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const contributor = JSON.parse(fileContent);

      console.log(`📄 Processing ${file}...`);
      console.log(`   Name: ${contributor.name}`);
      console.log(`   Expertise: ${contributor.expertise?.length || 0} items`);
      console.log(`   Roles: ${contributor.roles?.length || 0} items`);

      // Check if contributor already exists
      const { data: existing } = await supabase
        .from('contributors')
        .select('id')
        .eq('name', contributor.name)
        .single();

      if (existing) {
        // Update existing contributor
        const { error: updateError } = await supabase
          .from('contributors')
          .update({
            expertise: contributor.expertise || [],
            roles: contributor.roles || [],
            role: contributor.role || 'contributor',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
        console.log(`   ✅ Updated existing contributor\n`);
        successCount++;
      } else {
        // Insert new contributor
        const { error: insertError } = await supabase
          .from('contributors')
          .insert({
            name: contributor.name,
            expertise: contributor.expertise || [],
            roles: contributor.roles || [],
            role: contributor.role || 'contributor'
          });

        if (insertError) throw insertError;
        console.log(`   ✅ Created new contributor\n`);
        successCount++;
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${file}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total files: ${files.length}\n`);

  if (errorCount === 0) {
    console.log('🎉 All contributors imported successfully!\n');
  } else {
    console.log('⚠️  Some contributors failed to import. Please check the errors above.\n');
  }
}

// Run the import
importContributors()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

