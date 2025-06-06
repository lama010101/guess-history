// One-time script to assign random stats to users without metrics
// Usage: run with ts-node or node (after transpile)

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Make sure to set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDateWithinMonths(months: number): string {
  const now = new Date();
  const past = new Date(now.getTime() - getRandomInt(0, months * 30 * 24 * 60 * 60 * 1000));
  return past.toISOString();
}

async function main() {
  console.log('Starting user metrics seeding...');
  
  try {
    // Step 1: Get all users who don't have an entry in user_metrics
    console.log('Fetching users without metrics...');
    
    // First, get all user IDs from profiles
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id');
      
    if (usersError) throw usersError;
    
    if (!allUsers || allUsers.length === 0) {
      console.log('No users found in the profiles table.');
      return;
    }
    
    const userIds = allUsers.map(user => user.id);
    console.log(`Found ${userIds.length} total users.`);
    
    // Then, find which users already have metrics
    const { data: existingMetrics, error: metricsError } = await supabase
      .from('user_metrics')
      .select('user_id');
      
    if (metricsError) throw metricsError;
    
    const usersWithMetrics = new Set(existingMetrics?.map(m => m.user_id) || []);
    const usersNeedingMetrics = userIds.filter(id => !usersWithMetrics.has(id));
    
    if (usersNeedingMetrics.length === 0) {
      console.log('All users already have metrics. No seeding needed.');
      return;
    }
    
    console.log(`Found ${usersNeedingMetrics.length} users needing metrics initialization.`);
    
    // Step 2: Generate metrics for users who need them
    const metricsToInsert = usersNeedingMetrics.map(userId => ({
      user_id: userId,
      xp_total: getRandomInt(100, 10000),
      overall_accuracy: getRandomInt(50, 100),
      games_played: getRandomInt(1, 50),
      best_accuracy: getRandomInt(50, 100),
      perfect_games: getRandomInt(0, 5),
      time_accuracy: getRandomInt(50, 100),
      location_accuracy: getRandomInt(50, 100),
      challenge_accuracy: getRandomInt(50, 100),
      year_bullseye: getRandomInt(0, 10),
      location_bullseye: getRandomInt(0, 10),
      created_at: getRandomDateWithinMonths(6),
      updated_at: new Date().toISOString()
    }));
    
    console.log('Generated metrics for users. Starting batch insert...');
    
    // Step 3: Insert the new metrics in batches to avoid hitting limits
    const BATCH_SIZE = 50; // Adjust based on your Supabase plan
    let successCount = 0;
    
    for (let i = 0; i < metricsToInsert.length; i += BATCH_SIZE) {
      const batch = metricsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error: insertError } = await supabase
        .from('user_metrics')
        .insert(batch);
        
      if (insertError) {
        console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, insertError.message);
      } else {
        successCount += batch.length;
        console.log(`Inserted batch ${i / BATCH_SIZE + 1}/${Math.ceil(metricsToInsert.length / BATCH_SIZE)}`);
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`\nSeeding complete! Successfully initialized metrics for ${successCount} users.`);
    
    if (successCount < metricsToInsert.length) {
      console.warn(`Warning: ${metricsToInsert.length - successCount} users were not processed successfully.`);
    }
    
  } catch (error) {
    console.error('Error in seeding script:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((e) => {
  console.error('Script failed:', e);
  process.exit(1);
});
