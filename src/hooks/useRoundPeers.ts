import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

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

  const refresh = useCallback(async () => {
    if (!roomId || !roundNumber) {
      setPeers([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // 1) Base scoreboard rows (includes display_name, score/xp/accuracy)
      const { data: scoreboard, error: rpcErr } = await (supabase as any)
        .rpc('get_round_scoreboard', { p_room_id: roomId, p_round_number: roundNumber });

      if (rpcErr) {
        console.warn('[useRoundPeers] get_round_scoreboard failed', rpcErr);
      }

      const scoreboardRows: Array<any> = Array.isArray(scoreboard) ? scoreboard : [];

      // 2) Lat/Lng and other per-round fields from round_results
      const { data: rrRows, error: rrErr } = await (supabase as any)
        .from('round_results')
        .select('user_id, guess_lat, guess_lng, actual_lat, actual_lng, distance_km, guess_year, score, accuracy, xp_total')
        .eq('room_id', roomId)
        .eq('round_index', roundNumber);

      if (rrErr) {
        console.warn('[useRoundPeers] round_results fetch failed', rrErr);
      }

      const rrByUser = new Map<string, any>();
      (rrRows || []).forEach((r: any) => rrByUser.set(String(r.user_id), r));

      // 3) Merge: prefer RPC values for score/accuracy/xp and names; enrich with rr lat/lng
      const mergedMap = new Map<string, PeerRoundRow>();

      // Merge from RPC first (preferred for score/xp/accuracy/display names)
      scoreboardRows.forEach((row: any) => {
        const userId = String(row.user_id);
        const rr = rrByUser.get(userId);
        mergedMap.set(userId, {
          userId,
          displayName: String(row.display_name ?? ''),
          score: Number(row.score ?? rr?.score ?? 0),
          accuracy: Number(row.accuracy ?? rr?.accuracy ?? 0),
          xpTotal: Number(row.xp_total ?? rr?.xp_total ?? 0),
          xpDebt: Number(row.xp_debt ?? 0),
          accDebt: Number(row.acc_debt ?? 0),
          distanceKm: (row.distance_km ?? rr?.distance_km) ?? null,
          guessYear: (row.guess_year ?? rr?.guess_year) ?? null,
          guessLat: rr?.guess_lat ?? null,
          guessLng: rr?.guess_lng ?? null,
          actualLat: rr?.actual_lat ?? null,
          actualLng: rr?.actual_lng ?? null,
        });
      });

      // Ensure any users only present in round_results are also represented
      (rrRows || []).forEach((rr: any) => {
        const userId = String(rr.user_id);
        if (!mergedMap.has(userId)) {
          mergedMap.set(userId, {
            userId,
            displayName: '',
            score: Number(rr?.score ?? 0),
            accuracy: Number(rr?.accuracy ?? 0),
            xpTotal: Number(rr?.xp_total ?? 0),
            xpDebt: 0,
            accDebt: 0,
            distanceKm: rr?.distance_km ?? null,
            guessYear: rr?.guess_year ?? null,
            guessLat: rr?.guess_lat ?? null,
            guessLng: rr?.guess_lng ?? null,
            actualLat: rr?.actual_lat ?? null,
            actualLng: rr?.actual_lng ?? null,
          });
        }
      });

      const merged: PeerRoundRow[] = Array.from(mergedMap.values());

      if (mountedRef.current) setPeers(merged);
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
    if (!roomId || !roundNumber) return;

    const channel = supabase
      .channel(`round_results:${roomId}:${roundNumber}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'round_results',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const newRow = (payload as any).new as any;
        if (newRow && typeof newRow.round_index === 'number' && newRow.round_index === roundNumber) {
          // Simple strategy: re-fetch to keep logic consistent with RLS and RPC output
          refresh();
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Optionally log
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, roundNumber, refresh]);

  return useMemo(() => ({ peers, isLoading, error, refresh }), [peers, isLoading, error, refresh]);
}
