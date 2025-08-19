import { supabase } from './client';

// Types that mirror RPC returns (use broad number for numeric columns)
export interface RoundScoreRow {
  user_id: string;
  display_name: string | null;
  score: number | null;
  accuracy: number | null;
  xp_total: number | null;
  xp_debt: number | null;
  acc_debt: number | null;
  distance_km: number | null;
  guess_year: number | null;
}

export interface FinalScoreRow {
  user_id: string;
  display_name: string | null;
  total_score: number | null;
  total_xp: number | null;
  total_xp_debt: number | null;
  net_xp: number | null;
  rounds_played: number | null;
  avg_accuracy: number | null;
  net_avg_accuracy: number | null;
}

/**
 * Fetch per-round scoreboard for a room. Requires the caller to be a participant (RLS enforced in RPC).
 */
export async function fetchRoundScoreboard(roomId: string, roundNumber: number): Promise<RoundScoreRow[]> {
  const { data, error } = await supabase.rpc('get_round_scoreboard', {
    p_room_id: roomId,
    p_round_number: roundNumber,
  });
  if (error) throw error;
  return (data as RoundScoreRow[]) ?? [];
}

/**
 * Fetch final scoreboard aggregates for a room. Requires the caller to be a participant.
 */
export async function fetchFinalScoreboard(roomId: string): Promise<FinalScoreRow[]> {
  const { data, error } = await supabase.rpc('get_final_scoreboard', {
    p_room_id: roomId,
  });
  if (error) throw error;
  return (data as FinalScoreRow[]) ?? [];
}
