import { supabase } from '@/integrations/supabase/client';

export interface RoomRoundState {
  room_id: string;
  round_number: number;
  started_at: string; // ISO string
  duration_sec: number;
}

/**
 * Build a canonical round session identifier for a given room and round number.
 * Keep this centralized so all features (hints, results, etc.) remain consistent.
 */
export function makeRoundId(roomId: string, roundNumber: number): string {
  return `${roomId}-r${roundNumber}`;
}

/**
 * Persist the current round number for a given room in game_sessions.
 * Uses upsert on room_id and tolerates missing column/table gracefully.
 */
export async function setCurrentRoundInSession(roomId: string, roundNumber: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('game_sessions' as any)
      .upsert({ room_id: roomId, current_round_number: roundNumber } as any, { onConflict: 'room_id' } as any);

    if (error) {
      // 42703 = undefined column, 42P01 = undefined table
      if ((error as any).code !== '42703' && (error as any).code !== '42P01') {
        console.warn('[roomState] setCurrentRoundInSession upsert error', error);
      }
    }
  } catch (e: any) {
    console.warn('[roomState] setCurrentRoundInSession fallback due to error:', e?.message || e);
  }
}

/**
 * Fetch existing round state for a room+round, or create it with current time.
 * Uses upsert on (room_id, round_number) to avoid races.
 * Falls back gracefully when table is missing by returning a local state.
 */
export async function getOrCreateRoundState(
  roomId: string,
  roundNumber: number,
  durationSec: number
): Promise<RoomRoundState> {
  try {
    // 1) Try to read existing state
    const { data, error } = await supabase
      .from('room_rounds' as any)
      .select('room_id, round_number, started_at, duration_sec')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (error && (error as any).code !== 'PGRST116') {
      if ((error as any).code === '42P01') {
        // table missing, fallback below
      } else {
        console.warn('[roomState] select error', error);
      }
    }

    if (data) {
      return data as RoomRoundState;
    }

    // 2) Not found: insert a new row relying on server default for started_at
    // Use upsert with ignoreDuplicates to avoid updates on conflict
    const insertPayload = {
      room_id: roomId,
      round_number: roundNumber,
      duration_sec: durationSec,
    } as any;

    const { data: inserted, error: insertErr } = await supabase
      .from('room_rounds' as any)
      .upsert(insertPayload, { onConflict: 'room_id,round_number', ignoreDuplicates: true } as any)
      .select('room_id, round_number, started_at, duration_sec')
      .single();

    if (insertErr && (insertErr as any).code !== 'PGRST116') {
      if ((insertErr as any).code !== '42P01') {
        console.warn('[roomState] insert/upsert error', insertErr);
      }
      // Best-effort fallback using client time (only when table missing or other errors)
      return {
        room_id: roomId,
        round_number: roundNumber,
        started_at: new Date().toISOString(),
        duration_sec: durationSec,
      };
    }

    if (inserted) {
      return inserted as RoomRoundState;
    }

    // 3) If row existed and was ignored by upsert, fetch it now
    const { data: after, error: afterErr } = await supabase
      .from('room_rounds' as any)
      .select('room_id, round_number, started_at, duration_sec')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (afterErr && (afterErr as any).code !== 'PGRST116') {
      if ((afterErr as any).code !== '42P01') {
        console.warn('[roomState] follow-up select error', afterErr);
      }
    }

    if (after) return after as RoomRoundState;

    // Fallback if still not found
    return {
      room_id: roomId,
      round_number: roundNumber,
      started_at: new Date().toISOString(),
      duration_sec: durationSec,
    };
  } catch (e: any) {
    console.warn('[roomState] getOrCreateRoundState fallback due to error:', e?.message || e);
    // Fallback if anything goes wrong
    return {
      room_id: roomId,
      round_number: roundNumber,
      started_at: new Date().toISOString(),
      duration_sec: durationSec,
    };
  }
}
