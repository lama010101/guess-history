import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { acquireChannel } from '../../integrations/supabase/realtime';

export interface PeerRoundRow {
  userId: string;
  displayName: string;
  score: number;
  accuracy: number;
  xpTotal: number;
  xpDebt: number;
  accDebt: number;
  distanceKm: number | null;
  guessYear: number | null;
  guessLat: number | null;
  guessLng: number | null;
  actualLat: number | null;
  actualLng: number | null;
}

interface UseRoundPeersResult {
  peers: PeerRoundRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * useRoundPeers
 * - Room-scoped peer results per round with realtime updates.
 * - Reads scoreboard via RPC public.get_round_scoreboard(room_id, round_number)
 * - Enriches with lat/lng and related fields from public.round_results
 * - Subscribes to Postgres changes on round_results for the given room/round
 */
export function useRoundPeers(roomId: string | null, roundNumber: number | null): UseRoundPeersResult {
  const [peers, setPeers] = useState<PeerRoundRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  // Ensure current user is registered as a participant in this room to satisfy RPC/RLS
  const membershipEnsuredRef = useRef(false);
  useEffect(() => { membershipEnsuredRef.current = false; }, [roomId]);

  const ensureMembership = useCallback(async () => {
    try {
      if (!roomId) return;
      if (membershipEnsuredRef.current) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Fetch display name from profiles; fallback to null if unavailable
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle();

      const { error: upsertErr } = await (supabase as any)
        .from('session_players')
        .upsert({ room_id: roomId, user_id: user.id, display_name: profile?.display_name ?? null }, { onConflict: 'room_id,user_id' });
      if (!upsertErr) {
        membershipEnsuredRef.current = true;
      }
    } catch (e) {
      // Non-fatal; RPC may still fail and we will surface/log that path
    }
  }, [roomId]);

  const refresh = useCallback(async () => {
    if (!roomId || roundNumber == null) {
      console.log('useRoundPeers: Missing roomId or roundNumber', { roomId, roundNumber });
      setPeers([]);
      return;
    }
    console.log('useRoundPeers: Fetching peers for', { roomId, roundNumber });
    setIsLoading(true);
    setError(null);

    try {
      // Convert 1-based roundNumber to 0-based for DB
      const dbRoundIndex = Math.max(0, Number(roundNumber) - 1);
      console.log('useRoundPeers: Using dbRoundIndex:', dbRoundIndex);

      // Ensure we are a participant for RLS/RPC authorization
      await ensureMembership();

      // 1. Fetch scoreboard via RPC
      const { data: scoreboard, error: rpcError } = await (supabase as any).rpc('get_round_scoreboard', {
        p_room_id: roomId,
        p_round_number: dbRoundIndex
      });
      console.log('useRoundPeers: Scoreboard RPC result:', { scoreboard, rpcError });

      if (rpcError) {
        console.warn('[useRoundPeers] get_round_scoreboard failed', rpcError);
      }

      let scoreboardRows: Array<any> = Array.isArray(scoreboard) ? scoreboard : [];

      // Retry once if not a participant (race condition) after ensuring membership
      if (rpcError && String(rpcError.message || '').toLowerCase().includes('not a participant')) {
        try {
          await ensureMembership();
          const { data: retryData, error: retryErr } = await (supabase as any).rpc('get_round_scoreboard', {
            p_room_id: roomId,
            p_round_number: dbRoundIndex
          });
          if (!retryErr && Array.isArray(retryData)) {
            scoreboardRows = retryData;
          }
        } catch {}
      }

      // 2. Fetch round_results for lat/lng enrichment
      const { data: rrRows, error: rrError } = await (supabase as any)
        .from('round_results')
        .select('user_id, guess_lat, guess_lng, actual_lat, actual_lng')
        .eq('room_id', roomId)
        .eq('round_index', dbRoundIndex);
      console.log('useRoundPeers: Round results query:', { rrRows, rrError });

      if (rrError) {
        console.warn('[useRoundPeers] round_results fetch failed', rrError);
      }

      // 3. Merge scoreboard + round_results
      const mergedPeers: PeerRoundRow[] = (scoreboardRows).map((sb: any) => {
        const rr = rrRows?.find((r: any) => r.user_id === sb.user_id);
        return {
          userId: sb.user_id,
          displayName: sb.display_name || 'Unknown',
          score: sb.score || 0,
          accuracy: sb.accuracy || 0,
          xpTotal: sb.xp_total || 0,
          xpDebt: sb.xp_debt || 0,
          accDebt: sb.acc_debt || 0,
          distanceKm: sb.distance_km,
          guessYear: sb.guess_year,
          guessLat: rr?.guess_lat ?? null,
          guessLng: rr?.guess_lng ?? null,
          actualLat: rr?.actual_lat ?? null,
          actualLng: rr?.actual_lng ?? null,
        };
      });
      console.log('useRoundPeers: Merged peers:', mergedPeers);

      if (mountedRef.current) {
        console.log('useRoundPeers: Setting peers state:', mergedPeers);
        setPeers(mergedPeers);
      }
    } catch (e: any) {
      if (mountedRef.current) setError(e?.message || 'Failed to load peers');
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [roomId, roundNumber]);

  // Initial and param-change fetch
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription: refresh on insert/update for this room/round
  useEffect(() => {
    if (!roomId || roundNumber == null) return;

    // Translate 1-based round number (UI) to 0-based DB index for subscription, too
    const dbRoundIndex = Math.max(0, Number(roundNumber) - 1);

    const handle = acquireChannel(`round_results:${roomId}:${dbRoundIndex}`);
    handle.channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'round_results',
      filter: `room_id=eq.${roomId},round_index=eq.${dbRoundIndex}`,
    }, (payload) => {
      const newRow = (payload as any).new as any;
      if (newRow && typeof newRow.round_index === 'number' && newRow.round_index === dbRoundIndex) {
        // Simple strategy: re-fetch to keep logic consistent with RLS and RPC output
        refresh();
      }
    });

    return () => {
      handle.release();
    };
  }, [roomId, roundNumber, refresh]);

  return useMemo(() => ({ peers, isLoading, error, refresh }), [peers, isLoading, error, refresh]);
}
