import { supabase } from '../integrations/supabase/client';
import type { Database } from '../integrations/supabase/types';

async function testConnection() {
  console.log('Testing Supabase connection...');
  // Ensure we have an authenticated session (anonymous is fine for public RLS)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No session found. Signing in anonymously...');
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Error signing in anonymously:', error);
    } else {
      console.log('✓ Signed in anonymously. User ID:', data.user?.id);
    }
  } else {
    console.log('✓ Authenticated. User ID:', session.user.id);
  }

  // Helper to test selecting from a typed public table
  type PublicTables = keyof Database['public']['Tables'];
  async function testSelect(table: PublicTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(5);

      if (error) {
        console.error(`Query error on ${table}:`, {
          message: (error as any).message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
        });
      } else {
        console.log(`✓ Query successful on ${table}. Rows: ${data?.length ?? 0}`);
        console.log(data);
      }
    } catch (e) {
      console.error(`Exception when querying ${table}:`, e);
    }
  }

  console.log('\nTesting public tables...');
  await testSelect('session_players');
  await testSelect('round_results');
}

testConnection()
  .then(() => console.log('Test completed'))
  .catch(console.error);
