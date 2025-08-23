import { supabase } from '../integrations/supabase/client';

// Helper: probe a public table by selecting 0 rows; treat 42P01 as non-existent
async function tableExists(tableName: 'session_players' | 'round_results'): Promise<boolean> {
  const { error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
  if (!error) return true;
  const msg = (error as any).message || '';
  const code = (error as any).code || '';
  if (code === '42P01' || /does not exist/i.test(msg)) return false;
  console.warn(`Non-existence check for ${tableName} returned error (assuming exists):`, { code, msg });
  return true;
}

async function testSessionPlayers(): Promise<boolean> {
  let hadError = false;
  const roomId = (process.argv[2] || process.env.ROOM_ID || 'VE5U9B').toString();
  console.log('Using roomId:', roomId);

  // Ensure we are authenticated (anonymous is fine)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No session found. Signing in anonymously...');
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Error signing in anonymously:', {
        message: (error as any)?.message,
        code: (error as any)?.code,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      hadError = true;
      return false;
    }
    console.log('✓ Signed in anonymously. User ID:', data.user?.id);
  }
  
  // 1. Check if session_players table exists
  console.log('Checking if session_players table exists...');
  const sessionPlayersExists = await tableExists('session_players');
  
  if (!sessionPlayersExists) {
    console.error('Error: session_players table does not exist');
    console.log('Please run the database migrations first');
    hadError = true;
    return false;
  }
  
  console.log('✓ session_players table exists');
  
  // Ensure current user is a participant in the room
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error('No authenticated user found');
    hadError = true;
    return false;
  }
  const { error: upsertMembershipError } = await supabase
    .from('session_players')
    .upsert({
      room_id: roomId,
      user_id: user.id,
      display_name: (user as any)?.user_metadata?.name || 'CLI Test User',
    }, {
      onConflict: 'room_id,user_id'
    });
  if (upsertMembershipError) {
    console.error('Error ensuring room membership:', {
      message: (upsertMembershipError as any)?.message,
      code: (upsertMembershipError as any)?.code,
      details: (upsertMembershipError as any)?.details,
      hint: (upsertMembershipError as any)?.hint,
    });
    hadError = true;
  } else {
    console.log('✓ Ensured membership for current user in room');
  }
  
  // 2. Check for existing players in the room
  console.log(`\nChecking for players in room ${roomId}...`);
  const { data: players, error: fetchError } = await supabase
    .from('session_players')
    .select('*')
    .eq('room_id', roomId)
    .limit(10); // Limit to 10 players for testing
    
  if (fetchError) {
    console.error('Error fetching session_players:', {
      message: (fetchError as any)?.message,
      code: (fetchError as any)?.code,
      details: (fetchError as any)?.details,
      hint: (fetchError as any)?.hint,
    });
    hadError = true;
  }
  
  console.log(`Found ${players?.length || 0} players in room ${roomId}:`);
  console.log(players);
  
  // 3. If no players, add test data
  if (!players || players.length === 0) {
    console.log('\nNo players found. Adding test players...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      hadError = true;
      return false;
    }
    
    // Add current user to session_players
    const { error: upsertError } = await supabase
      .from('session_players')
      .upsert({
        room_id: roomId,
        user_id: user.id,
        display_name: 'Test User 1',
      }, {
        onConflict: 'room_id,user_id'
      });
    
    if (upsertError) {
      console.error('Error adding test user 1:', {
        message: (upsertError as any)?.message,
        code: (upsertError as any)?.code,
        details: (upsertError as any)?.details,
        hint: (upsertError as any)?.hint,
      });
      hadError = true;
    } else {
      console.log('✓ Added test user 1');
    }
    
    // Verify the test data was added
    const { data: updatedPlayers } = await supabase
      .from('session_players')
      .select('*')
      .eq('room_id', roomId);
    
    console.log('\nUpdated players in room:');
    console.log(updatedPlayers);
  }
  
  // 4. Test the get_round_scoreboard RPC
  console.log('\nTesting get_round_scoreboard RPC...');
  const roundNumber = Number(process.argv[3] || process.env.ROUND_NUMBER || 1); // 1-based round number
  
  try {
    const { data: scoreboard, error: rpcError } = await supabase
      .rpc('get_round_scoreboard', {
        p_room_id: roomId,
        p_round_number: roundNumber
      });
      
    if (rpcError) {
      console.error('Error calling get_round_scoreboard:', {
        message: (rpcError as any)?.message,
        code: (rpcError as any)?.code,
        details: (rpcError as any)?.details,
        hint: (rpcError as any)?.hint,
      });
      hadError = true;
    } else {
      console.log('Scoreboard RPC result:');
      console.log(JSON.stringify(scoreboard, null, 2));
    }
  } catch (e) {
    console.error('Exception when calling get_round_scoreboard:', e);
    hadError = true;
  }
  
  // 5. Check if we have any round results
  console.log('\nChecking for round results...');
  const { data: roundResults, error: rrError } = await supabase
    .from('round_results')
    .select('*')
    .eq('room_id', roomId)
    .limit(10);
    
  if (rrError) {
    console.error('Error fetching round_results:', {
      message: (rrError as any)?.message,
      code: (rrError as any)?.code,
      details: (rrError as any)?.details,
      hint: (rrError as any)?.hint,
    });
    hadError = true;
  } else {
    console.log(`Found ${roundResults?.length || 0} round results:`);
    console.log(roundResults);
  }

  return !hadError;
}

// Run the test
console.log('Starting session_players test...');
testSessionPlayers()
  .then((ok) => {
    if (ok) {
      console.log('Test completed successfully');
      process.exit(0);
    } else {
      console.error('Test completed with errors');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
  });
