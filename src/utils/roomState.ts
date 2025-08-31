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
export async function setCurrentRoundInSession(roomId: string, roundNumber: number, seed?: string): Promise<void> {
  try {
    // Ensure a non-null seed to satisfy schema (seed TEXT NOT NULL).
    // If a deterministic seed isn't provided by caller, derive a stable fallback from roomId.
    const payload = {
      room_id: roomId,
      current_round_number: roundNumber,
      seed: (seed ?? roomId),
    } as any;

    const { error } = await supabase
      .from('game_sessions' as any)
      .upsert(payload, { onConflict: 'room_id' } as any);

    if (error) {
      // 42703 = undefined column, 42P01 = undefined table
      const code = (error as any).code;
      const details = (error as any).details;
      const message = (error as any).message || String(error);
      if (code !== '42703' && code !== '42P01') {
        console.warn('[roomState] setCurrentRoundInSession upsert error', {
          code,
          message,
          details,
          roomId,
          roundNumber,
        });
      } else {
        console.warn('[roomState] setCurrentRoundInSession skipped (missing table/column)', {
          code,
          message,
          roomId,
          roundNumber,
        });
      }
    }
  } catch (e: any) {
    console.warn('[roomState] setCurrentRoundInSession fallback due to error:', {
      message: e?.message || String(e),
      roomId,
      roundNumber,
    });
  }
}

/**
 * Read the persisted current round number from game_sessions for a room.
 * Returns null if unavailable or on expected schema errors (missing table/column).
 */
export async function getCurrentRoundFromSession(roomId: string): Promise<number | null> {
  try {
    if (!roomId) return null;
    const { data, error } = await supabase
      .from('game_sessions' as any)
      .select('current_round_number')
      .eq('room_id', roomId)
      .maybeSingle();

    if (error) {
      const code = (error as any).code;
      const message = (error as any).message || String(error);
      // 42703 = undefined column, 42P01 = undefined table, PGRST116 = no rows
      if (code !== '42703' && code !== '42P01' && code !== 'PGRST116') {
        console.warn('[roomState] getCurrentRoundFromSession error', { code, message, roomId });
      }
      return null;
    }

    const num = (data as any)?.current_round_number;
    if (typeof num === 'number' && Number.isFinite(num)) return num;
    if (typeof num === 'string') {
      const parsed = parseInt(num, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  } catch (e: any) {
    console.warn('[roomState] getCurrentRoundFromSession fallback due to error:', {
      message: e?.message || String(e),
      roomId,
    });
    return null;
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
      const code = (error as any).code;
      const details = (error as any).details;
      const message = (error as any).message || String(error);
      if (code === '42P01') {
        // table missing, fallback below
      } else {
        console.warn('[roomState] room_rounds select error', {
          code,
          message,
          details,
          roomId,
          roundNumber,
        });
      }
    }

    if (data) {
      return (data as unknown) as RoomRoundState;
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
      const code = (insertErr as any).code;
      const details = (insertErr as any).details;
      const message = (insertErr as any).message || String(insertErr);
      if (code !== '42P01') {
        console.warn('[roomState] room_rounds upsert error', {
          code,
          message,
          details,
          insertPayload,
        });
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
      return (inserted as unknown) as RoomRoundState;
    }

    // 3) If row existed and was ignored by upsert, fetch it now
    const { data: after, error: afterErr } = await supabase
      .from('room_rounds' as any)
      .select('room_id, round_number, started_at, duration_sec')
      .eq('room_id', roomId)
      .eq('round_number', roundNumber)
      .maybeSingle();

    if (afterErr && (afterErr as any).code !== 'PGRST116') {
      const code = (afterErr as any).code;
      const details = (afterErr as any).details;
      const message = (afterErr as any).message || String(afterErr);
      if (code !== '42P01') {
        console.warn('[roomState] room_rounds follow-up select error', {
          code,
          message,
          details,
          roomId,
          roundNumber,
        });
      }
    }

    if (after) return (after as unknown) as RoomRoundState;

    // Fallback if still not found
    return {
      room_id: roomId,
      round_number: roundNumber,
      started_at: new Date().toISOString(),
      duration_sec: durationSec,
    };
  } catch (e: any) {
    console.warn('[roomState] getOrCreateRoundState fallback due to error:', {
      message: e?.message || String(e),
      roomId,
      roundNumber,
      durationSec,
    });
    // Fallback if anything goes wrong
    return {
      room_id: roomId,
      round_number: roundNumber,
      started_at: new Date().toISOString(),
      duration_sec: durationSec,
    };
  }
}
