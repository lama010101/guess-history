import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jghesmrwhegaotbztrhr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnaGVzbXJ3aGVnYW90Ynp0cmhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ0MzAwMDEsImV4cCI6MjA2MDAwNjAwMX0.C-zSGAiZAIbvKh9vNb2_s3DHogSzSKImLkRbjr_h5xI';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const roomId = process.argv[2];
  const userId = process.argv[3];

  if (!roomId || !userId) {
    console.error('Usage: pnpm tsx scripts/remove-test-session-player.ts <roomId> <userId>');
    process.exit(1);
  }

  const { error } = await supabase
    .from('session_players')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete session_players row:', error);
    process.exit(1);
  }

  console.log(`Removed session_players row for user ${userId} in room ${roomId}`);
}

main().catch((err) => {
  console.error('Unexpected error removing session player', err);
  process.exit(1);
});
