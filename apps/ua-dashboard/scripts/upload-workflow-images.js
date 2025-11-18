/**
 * Upload Workflow Images to Supabase Storage
 * Run with: node scripts/upload-workflow-images.js
 * 
 * This script uploads workflow images from public/workflows/ to Supabase Storage
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

const workflowsImagesPath = path.join(__dirname, '../public/workflows');

async function uploadWorkflowImages() {
  try {
    console.log('Starting workflow image upload...\n');

    // Check if images directory exists
    if (!fs.existsSync(workflowsImagesPath)) {
      throw new Error(`Images directory not found: ${workflowsImagesPath}`);
    }

    // Get all PNG files
    const files = fs.readdirSync(workflowsImagesPath).filter(f => f.endsWith('.png'));
    
    if (files.length === 0) {
      throw new Error(`No PNG files found in ${workflowsImagesPath}`);
    }

    console.log(`Found ${files.length} images to upload\n`);

    // Try to verify bucket exists (but don't fail if we can't list buckets)
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (!listError && buckets) {
        const workflowsBucket = buckets.find(b => b.name === 'workflows');
        if (workflowsBucket) {
          console.log('✓ "workflows" bucket found\n');
        } else {
          console.log('⚠️  Could not find "workflows" bucket in list, but will attempt upload anyway...\n');
        }
      } else {
        console.log('⚠️  Could not list buckets (this is okay), proceeding with upload...\n');
      }
    } catch (err) {
      console.log('⚠️  Could not verify bucket (this is okay), proceeding with upload...\n');
    }

    // Upload each image
    for (const file of files) {
      const filePath = path.join(workflowsImagesPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      
      console.log(`Uploading ${file}...`);

      // Upload to Supabase Storage
      // The path in storage should match what's in the database (without 'img/' prefix)
      const storagePath = file; // e.g., 'img2actions.png'

      const { error: uploadError } = await supabase.storage
        .from('workflows')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/png',
          upsert: true, // Overwrite if exists
        });

      if (uploadError) {
        console.error(`  ✗ Error uploading ${file}:`, uploadError.message);
        continue;
      }

      console.log(`  ✓ Uploaded ${file} to workflows/${storagePath}`);
    }

    console.log('\n✅ Image upload complete!');
    console.log('\nNote: Make sure your database image_path values match the uploaded filenames.');
    console.log('For example: "img/img2actions.png" in DB should match "img2actions.png" in storage.');
  } catch (err) {
    console.error('❌ Error uploading images:', err.message);
    process.exit(1);
  }
}

uploadWorkflowImages();

