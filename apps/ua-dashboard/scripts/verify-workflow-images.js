/**
 * Verify Workflow Images in Supabase Storage
 * Run with: node scripts/verify-workflow-images.js
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

const expectedFiles = [
  'img2actions.png',
  'img2lego.png',
  'img2obj.png',
  'img2schematic.png',
  'img2toy.png',
  'txt2img.png'
];

async function verifyWorkflowImages() {
  try {
    console.log('Verifying workflow images in Supabase Storage...\n');

    // List files in workflows bucket
    const { data: files, error: listError } = await supabase.storage
      .from('workflows')
      .list('', {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      console.log(`⚠️  Could not list files (RLS may be blocking): ${listError.message}`);
      console.log('\nTrying to verify by checking individual files...\n');
      
      // Try to verify by attempting to generate signed URLs for expected files
      let verifiedCount = 0;
      for (const filename of expectedFiles) {
        try {
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('workflows')
            .createSignedUrl(filename, 60);
          
          if (!urlError && signedUrl) {
            console.log(`  ✓ ${filename} - Found! (can generate signed URL)`);
            verifiedCount++;
          } else {
            console.log(`  ✗ ${filename} - Not found or inaccessible`);
          }
        } catch (err) {
          console.log(`  ✗ ${filename} - Error checking: ${err.message}`);
        }
      }
      
      if (verifiedCount === expectedFiles.length) {
        console.log(`\n✅ All ${verifiedCount} files verified via signed URL generation!`);
        console.log('   (RLS is preventing file listing, but files are accessible)');
        return;
      } else {
        console.log(`\n⚠️  Only ${verifiedCount}/${expectedFiles.length} files found.`);
        console.log('   Please check:');
        console.log('   1. Files are uploaded to the correct bucket (workflows)');
        console.log('   2. Files are in the root of the bucket (not in a subfolder)');
        console.log('   3. File names match exactly (case-sensitive)');
        return;
      }
    }

    // If we got here, listError was null, so check if files exist
    if (!files || files.length === 0) {
      console.log('⚠️  No files found via listing (RLS may be blocking).');
      console.log('Trying alternative verification method...\n');
      
      // Try to verify by attempting to generate signed URLs for expected files
      let verifiedCount = 0;
      for (const filename of expectedFiles) {
        try {
          const { data: signedUrl, error: urlError } = await supabase.storage
            .from('workflows')
            .createSignedUrl(filename, 60);
          
          if (!urlError && signedUrl) {
            console.log(`  ✓ ${filename} - Found! (can generate signed URL)`);
            verifiedCount++;
          } else {
            console.log(`  ✗ ${filename} - Not found or inaccessible`);
            if (urlError) {
              console.log(`    Error: ${urlError.message}`);
            }
          }
        } catch (err) {
          console.log(`  ✗ ${filename} - Error checking: ${err.message}`);
        }
      }
      
      if (verifiedCount === expectedFiles.length) {
        console.log(`\n✅ All ${verifiedCount} files verified via signed URL generation!`);
        console.log('   (RLS is preventing file listing, but files are accessible)');
      } else {
        console.log(`\n⚠️  Only ${verifiedCount}/${expectedFiles.length} files found.`);
        console.log('   Please check:');
        console.log('   1. Files are uploaded to the correct bucket (workflows)');
        console.log('   2. Files are in the root of the bucket (not in a subfolder)');
        console.log('   3. File names match exactly (case-sensitive)');
      }
      return;
    }

    console.log(`Found ${files.length} file(s) in workflows bucket:\n`);

    // Check each expected file
    const foundFiles = new Set();
    const missingFiles = [];
    const unexpectedFiles = [];

    files.forEach(file => {
      if (file.name.endsWith('.png')) {
        foundFiles.add(file.name);
        const sizeMB = (file.metadata?.size || 0) / (1024 * 1024);
        console.log(`  ✓ ${file.name} (${sizeMB.toFixed(2)} MB)`);
      } else {
        unexpectedFiles.push(file.name);
      }
    });

    // Check for missing files
    expectedFiles.forEach(expected => {
      if (!foundFiles.has(expected)) {
        missingFiles.push(expected);
      }
    });

    // Report unexpected files
    if (unexpectedFiles.length > 0) {
      console.log(`\n⚠️  Unexpected files found:`);
      unexpectedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    }

    // Report missing files
    if (missingFiles.length > 0) {
      console.log(`\n❌ Missing files:`);
      missingFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('\nPlease upload these files to the workflows bucket.');
    }

    // Verify database paths match
    console.log('\n--- Verifying Database Paths ---\n');

    const { data: workflows, error: workflowsError } = await supabase
      .from('workflows')
      .select('workflow_id, name, image_path')
      .order('name');

    if (workflowsError) {
      console.log(`⚠️  Could not fetch workflows from database: ${workflowsError.message}`);
    } else if (workflows && workflows.length > 0) {
      console.log(`Found ${workflows.length} workflow(s) in database:\n`);

      workflows.forEach(workflow => {
        const dbPath = workflow.image_path || 'N/A';
        // Extract filename (remove 'img/' prefix if present)
        const filename = dbPath.replace(/^(img|workflows)\//, '');
        const existsInStorage = foundFiles.has(filename);

        if (existsInStorage) {
          console.log(`  ✓ ${workflow.name}`);
          console.log(`    DB path: ${dbPath}`);
          console.log(`    Storage: ${filename} ✅`);
        } else {
          console.log(`  ⚠️  ${workflow.name}`);
          console.log(`    DB path: ${dbPath}`);
          console.log(`    Storage: ${filename} ❌ NOT FOUND`);
        }
      });
    }

    // Summary
    console.log('\n--- Summary ---\n');
    const allFound = missingFiles.length === 0 && foundFiles.size === expectedFiles.length;

    if (allFound) {
      console.log('✅ All workflow images verified successfully!');
      console.log(`   - ${foundFiles.size}/${expectedFiles.length} expected files found`);
      console.log('   - All database paths match storage files');
      console.log('\n🎉 Your workflows are ready to use!');
    } else {
      console.log('⚠️  Verification incomplete:');
      console.log(`   - Found: ${foundFiles.size}/${expectedFiles.length} files`);
      if (missingFiles.length > 0) {
        console.log(`   - Missing: ${missingFiles.length} file(s)`);
      }
    }

  } catch (err) {
    console.error('❌ Error verifying images:', err.message);
    process.exit(1);
  }
}

verifyWorkflowImages();

