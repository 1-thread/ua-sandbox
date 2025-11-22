/**
 * Check for Duplicate Deliverables
 * 
 * This script checks if there are duplicate deliverables in the database
 * 
 * Usage: node scripts/check-duplicate-deliverables.js [deliverable-code]
 * Example: node scripts/check-duplicate-deliverables.js P1-T1-D1
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

async function checkDuplicates(deliverableCode = null) {
  try {
    console.log('🔍 Checking for duplicate deliverables...\n');

    let query = supabase
      .from('deliverables')
      .select('id, deliverable_id, task_id, filename, ip_id')
      .order('deliverable_id');

    if (deliverableCode) {
      query = query.eq('deliverable_id', deliverableCode);
    }

    const { data: deliverables, error } = await query;

    if (error) throw error;

    if (!deliverables || deliverables.length === 0) {
      console.log('⚠️  No deliverables found');
      return;
    }

    // Group by deliverable_id
    const grouped = new Map();
    deliverables.forEach(d => {
      if (!grouped.has(d.deliverable_id)) {
        grouped.set(d.deliverable_id, []);
      }
      grouped.get(d.deliverable_id).push(d);
    });

    // Find duplicates
    const duplicates = Array.from(grouped.entries())
      .filter(([code, items]) => items.length > 1)
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (duplicates.length === 0) {
      console.log('✅ No duplicate deliverable codes found\n');
    } else {
      console.log(`⚠️  Found ${duplicates.length} deliverable code(s) with duplicates:\n`);
      
      duplicates.forEach(([code, items]) => {
        console.log(`📦 ${code}: ${items.length} entries`);
        items.forEach((item, index) => {
          console.log(`   ${index + 1}. ID: ${item.id}`);
          console.log(`      Task ID: ${item.task_id}`);
          console.log(`      IP ID: ${item.ip_id || 'NULL (template)'}`);
          console.log(`      Filename: ${item.filename}`);
        });
        console.log('');
      });
    }

    // Also check for duplicates by task_id (same task having same deliverable multiple times)
    const taskGrouped = new Map();
    deliverables.forEach(d => {
      const key = `${d.task_id}_${d.deliverable_id}`;
      if (!taskGrouped.has(key)) {
        taskGrouped.set(key, []);
      }
      taskGrouped.get(key).push(d);
    });

    const taskDuplicates = Array.from(taskGrouped.entries())
      .filter(([key, items]) => items.length > 1);

    if (taskDuplicates.length > 0) {
      console.log(`\n⚠️  Found ${taskDuplicates.length} deliverable(s) duplicated within the same task:\n`);
      taskDuplicates.forEach(([key, items]) => {
        const [taskId, deliverableId] = key.split('_');
        console.log(`📦 Task ${taskId}, Deliverable ${deliverableId}: ${items.length} entries`);
        items.forEach((item, index) => {
          console.log(`   ${index + 1}. ID: ${item.id}`);
          console.log(`      IP ID: ${item.ip_id || 'NULL (template)'}`);
          console.log(`      Filename: ${item.filename}`);
        });
        console.log('');
      });
    } else {
      console.log('\n✅ No duplicates found within the same task\n');
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

const deliverableCode = process.argv[2] || null;
checkDuplicates(deliverableCode)
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

