#!/usr/bin/env tsx
/**
 * Migration script to load JSON function files into Supabase database
 * 
 * Usage:
 *   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   npm run migrate
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// Load .env.local file
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
// For migrations, we MUST use the service role key (bypasses RLS)
// Do not fall back to anon key for migrations
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Missing required environment variables for migration')
  console.error('\nRequired variables:')
  console.error('  - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (required for migrations)')
  console.error('\n⚠️  Note: SUPABASE_SERVICE_ROLE_KEY bypasses Row Level Security.')
  console.error('   This key should only be used for server-side migrations, never in client code.')
  console.error('   Get it from: Supabase Dashboard > Project Settings > API > service_role key\n')
  process.exit(1)
}

// Debug info (shows first/last few chars of key for verification)
const keyPreview = supabaseKey.length > 20 
  ? `${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 10)}`
  : '***'
console.log(`\n✓ Using service role key (RLS bypass enabled): ${keyPreview}\n`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function migrate() {
  const functionsDir = path.join(process.cwd(), 'functions')
  const jsonFiles = glob.sync('*.json', { cwd: functionsDir })

  if (jsonFiles.length === 0) {
    console.error(`No JSON files found in ${functionsDir}`)
    process.exit(1)
  }

  console.log(`Found ${jsonFiles.length} JSON files to migrate...\n`)

  let successCount = 0
  let errorCount = 0

  for (const file of jsonFiles) {
    const filePath = path.join(functionsDir, file)
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

      if (!data.code || !data.tasks) {
        console.warn(`[WARN] Skipping ${file}: missing required fields (code or tasks)`)
        continue
      }

      // Insert or update function
      const { data: func, error: funcError } = await supabase
        .from('functions')
        .upsert({
          code: data.code,
          title: data.title || '',
          category: data.category || null,
          phase: data.phase || null,
          purpose: data.purpose || null,
          dependencies: data.dependencies || [],
          guardrails: data.guardrails || [],
          source_md: data.source_md || null
        }, { onConflict: 'code' })
        .select()
        .single()

      if (funcError) {
        console.error(`[ERROR] Failed to insert function ${data.code}:`, funcError.message)
        errorCount++
        continue
      }

      // Delete existing tasks for this function (to handle updates)
      await supabase.from('tasks').delete().eq('function_id', func.id)

      // Insert tasks
      for (const task of data.tasks || []) {
        if (!task.id || !task.title) {
          console.warn(`[WARN] Skipping task in ${data.code}: missing id or title`)
          continue
        }

        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .insert({
            function_id: func.id,
            task_id: task.id,
            title: task.title,
            description: task.description || null
          })
          .select()
          .single()

        if (taskError) {
          console.error(`[ERROR] Failed to insert task ${task.id} for ${data.code}:`, taskError.message)
          continue
        }

        // Insert deliverables
        for (const deliverable of task.deliverables || []) {
          if (!deliverable.id) {
            console.warn(`[WARN] Skipping deliverable in task ${task.id}: missing id`)
            continue
          }

          const { data: delData, error: delError } = await supabase
            .from('deliverables')
            .insert({
              task_id: taskData.id,
              deliverable_id: deliverable.id,
              filename: deliverable.filename || null,
              filetype: deliverable.filetype || null,
              path_hint: deliverable.path_hint || null,
              description: deliverable.description || null,
              aliases: deliverable.aliases || []
            })
            .select()
            .single()

          if (delError) {
            console.error(`[ERROR] Failed to insert deliverable ${deliverable.id}:`, delError.message)
            continue
          }

          // Insert acceptance criteria
          for (const ac of deliverable.acceptance || []) {
            if (!ac.id || !ac.text) {
              console.warn(`[WARN] Skipping acceptance criterion: missing id or text`)
              continue
            }

            const { error: acError } = await supabase
              .from('acceptance_criteria')
              .upsert({
                deliverable_id: delData.id,
                criterion_id: ac.id,
                text: ac.text
              }, { onConflict: 'deliverable_id,criterion_id' })

            if (acError) {
              console.error(`[ERROR] Failed to insert acceptance criterion ${ac.id}:`, acError.message)
            }
          }
        }
      }

      console.log(`✓ Migrated ${data.code}`)
      successCount++
    } catch (error: any) {
      console.error(`[ERROR] Failed to process ${file}:`, error.message)
      errorCount++
    }
  }

  console.log(`\n=== Migration Summary ===`)
  console.log(`Successfully migrated: ${successCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log(`Total files: ${jsonFiles.length}`)
}

migrate().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})

