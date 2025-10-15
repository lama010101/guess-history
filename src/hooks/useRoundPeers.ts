import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { acquireChannel } from '../../integrations/supabase/realtime';

const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
const devLog = (...args: unknown[]) => {
  if (isDev) {
    console.log('[useRoundPeers]', ...args);
  }
};

export interface PeerRoundRow {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  accuracy: number;
  xpTotal: number;
  xpDebt: number;
  accDebt: number;
  xpWhere: number | null;
  xpWhen: number | null;
  locationAccuracy: number | null;
  timeAccuracy: number | null;
  distanceKm: number | null;
  guessYear: number | null;
  guessLat: number | null;
  guessLng: number | null;
  actualLat: number | null;
  actualLng: number | null;
  submitted: boolean;
  ready: boolean;
  hintsUsed: number | null;
  netAccuracy: number | null;
}

export interface MiniLeaderboardRow {
  userId: string;
  displayName: string;
  value: number | null;
  hintsUsed: number;
}

export interface MiniLeaderboards {
  total: MiniLeaderboardRow[];
  time: MiniLeaderboardRow[];
  location: MiniLeaderboardRow[];
}

interface UseRoundPeersResult {
  peers: PeerRoundRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  miniLeaderboards: MiniLeaderboards;
}

/**
 * useRoundPeers
 * - Room-scoped peer results per round with realtime updates.
 * - Reads scoreboard via RPC public.get_round_scoreboard(room_id, round_number)
 * - Note: RPC expects a 1-based round_number and converts to 0-based internally.
 * - Enriches with lat/lng and related fields from public.round_results
 * - Subscribes to Postgres changes on round_results for the given room/round
 */
export function useRoundPeers(roomId: string | null, roundNumber: number | null): UseRoundPeersResult {
  const [peers, setPeers] = useState<PeerRoundRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [miniLeaderboards, setMiniLeaderboards] = useState<MiniLeaderboards>({ total: [], time: [], location: [] });
  const mountedRef = useRef(true);
  const refreshInFlightRef = useRef(false);
  const queuedRefreshRef = useRef(false);
  const pollIntervalRef = useRef<number | null>(null);

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
      devLog('Missing roomId or roundNumber', { roomId, roundNumber });
      setPeers([]);
      setMiniLeaderboards({ total: [], time: [], location: [] });
      return;
    }
    if (refreshInFlightRef.current) {
      devLog('Refresh already in flight, queueing rerun');
      queuedRefreshRef.current = true;
      return;
    }
    refreshInFlightRef.current = true;
    devLog('Fetching peers for', { roomId, roundNumber });
    setIsLoading(true);
    setError(null);

    try {
      // For RPC: pass 1-based roundNumber directly (RPC converts to 0-based internally)
      const oneBasedRound = Math.max(1, Number(roundNumber));
      // For realtime subscription below: we will still compute 0-based index

      // Ensure we are a participant for RLS/RPC authorization
      await ensureMembership();

      // 1. Fetch scoreboard via RPC (names, basic metrics)
      const { data: scoreboard, error: rpcError } = await (supabase as any).rpc('get_round_scoreboard', {
        p_room_id: roomId,
        p_round_number: oneBasedRound
      });
      devLog('Scoreboard RPC result', { scoreboard, rpcError });

      let scoreboardRows: Array<any> = Array.isArray(scoreboard) ? scoreboard : [];
      let scoreboardError: any = rpcError;

      // Retry once if not a participant (race condition) after ensuring membership
      if (scoreboardError && String(scoreboardError.message || '').toLowerCase().includes('not a participant')) {
        try {
          await ensureMembership();
          const { data: retryData, error: retryErr } = await (supabase as any).rpc('get_round_scoreboard', {
            p_room_id: roomId,
            p_round_number: oneBasedRound
          });
          if (!retryErr && Array.isArray(retryData)) {
            scoreboardRows = retryData;
            scoreboardError = null;
          } else {
            scoreboardError = retryErr ?? scoreboardError;
          }
        } catch (retryException) {
          scoreboardError = retryException;
        }
      }

      if (scoreboardError) {
        const message = (scoreboardError as any)?.message ?? 'Unable to load round leaderboard';
        const msgLower = String(message).toLowerCase();
        if (msgLower.includes('not a participant')) {
          devLog('RPC denied by RLS; attempting round_results fallback');
          const fallbackQuery = await (supabase as any)
            .from('round_results')
            .select('user_id, score, accuracy, xp_total, xp_debt, acc_debt, xp_where, xp_when, location_accuracy, time_accuracy, distance_km, guess_year, guess_lat, guess_lng, actual_lat, actual_lng, hints_used')
            .eq('room_id', roomId)
            .eq('round_index', oneBasedRound - 1);
          if (!fallbackQuery.error && Array.isArray(fallbackQuery.data)) {
            scoreboardRows = fallbackQuery.data.map((row: any) => ({
              user_id: row.user_id,
              display_name: null,
              score: Number(row.score ?? 0),
              accuracy: Number(row.accuracy ?? 0),
              xp_total: Number(row.xp_total ?? 0),
              xp_debt: Number(row.xp_debt ?? 0),
              acc_debt: Number(row.acc_debt ?? 0),
              xp_where: row.xp_where ?? null,
              xp_when: row.xp_when ?? null,
              location_accuracy: row.location_accuracy ?? null,
              time_accuracy: row.time_accuracy ?? null,
              distance_km: row.distance_km ?? null,
              guess_year: row.guess_year ?? null,
              guess_lat: row.guess_lat ?? null,
              guess_lng: row.guess_lng ?? null,
              actual_lat: row.actual_lat ?? null,
              actual_lng: row.actual_lng ?? null,
              hints_used: row.hints_used ?? null,
            }));
            scoreboardError = null;
            devLog('Fallback round_results rows', scoreboardRows);
          } else {
            console.warn('[useRoundPeers] round_results fallback failed', fallbackQuery.error ?? 'unknown error');
          }
        }

        if (scoreboardError) {
          console.warn('[useRoundPeers] get_round_scoreboard failed', scoreboardError);
          if (mountedRef.current) {
            setPeers([]);
            setMiniLeaderboards({ total: [], time: [], location: [] });
            setError(message);
          }
          return;
        }
      }

      // 2. Fetch the list of participants (ensures we include everyone by name)
      const { data: spRows, error: spErr } = await (supabase as any)
        .from('session_players')
        .select('user_id, display_name, ready')
        .eq('room_id', roomId);
      if (spErr) {
        console.warn('[useRoundPeers] session_players fetch failed', spErr);
      }

      // 3. Fetch round_results for lat/lng enrichment
      const dbRoundIndex = Math.max(0, oneBasedRound - 1);
      const { data: rrRows, error: rrError } = await (supabase as any)
        .from('round_results')
        .select('user_id, guess_year, distance_km, guess_lat, guess_lng, actual_lat, actual_lng, xp_where, xp_when, location_accuracy, time_accuracy, xp_total, score, accuracy, xp_debt, acc_debt, hints_used')
        .eq('room_id', roomId)
        .eq('round_index', dbRoundIndex);
      devLog('Round results query', { rrRows, rrError });

      if (rrError) {
        console.warn('[useRoundPeers] round_results fetch failed', rrError);
      }

      // 4. Unify participants: union of session_players and scoreboard rows
      const playersArr: Array<any> = Array.isArray(spRows) ? spRows : [];
      const rrByUser = new Map<string, any>((rrRows || []).map((r: any) => [r.user_id, r]));
      const sbByUser = new Map<string, any>((scoreboardRows || []).map((s: any) => [s.user_id, s]));
      const allUserIds = Array.from(new Set<string>([
        ...playersArr.map(p => String(p.user_id)),
        ...scoreboardRows.map(s => String(s.user_id)),
      ]));

      let profilesArr: Array<any> = [];
      if (allUserIds.length > 0) {
        const { data: profileRows, error: profileErr } = await (supabase as any)
          .from('profiles')
          .select('id, display_name, avatar_image_url, avatar_url, avatar_id')
          .in('id', allUserIds);
        if (profileErr) {
          console.warn('[useRoundPeers] profiles fetch failed', profileErr);
        } else if (Array.isArray(profileRows)) {
          profilesArr = profileRows;
          devLog('profiles fetched', profilesArr.length);
        }
      }

      const profileByUser = new Map<string, any>(profilesArr.map((p: any) => [String(p.id), p]));

      const avatarIdNeeds: string[] = profilesArr
        .filter((p: any) => (!p?.avatar_image_url || p.avatar_image_url === '') && p?.avatar_id)
        .map((p: any) => String(p.avatar_id));

      const avatarById = new Map<string, string>();
      if (avatarIdNeeds.length > 0) {
        const uniqueAvatarIds = Array.from(new Set(avatarIdNeeds));
        const { data: avatarRows, error: avatarErr } = await (supabase as any)
          .from('avatars')
          .select('id, firebase_url')
          .in('id', uniqueAvatarIds);
        if (avatarErr) {
          console.warn('[useRoundPeers] avatars fetch failed', avatarErr);
        } else if (Array.isArray(avatarRows)) {
          for (const row of avatarRows) {
            if (row?.id && row?.firebase_url) {
              avatarById.set(String(row.id), String(row.firebase_url));
            }
          }
        }
      }

      let mergedPeers: PeerRoundRow[] = allUserIds.map((uid) => {
        const sp = playersArr.find(p => String(p.user_id) === uid);
        const sb = sbByUser.get(uid);
        const rr = rrByUser.get(uid);
        const profile = profileByUser.get(uid);
        const resolvedAvatar = profile?.avatar_image_url
          ?? profile?.avatar_url
          ?? (profile?.avatar_id ? avatarById.get(String(profile.avatar_id)) ?? null : null);
        const hasRoundResult = !!rr;
        const hasScoreboardEntry = !!sb && (
          sb.score != null || sb.accuracy != null || sb.xp_total != null || sb.xp_where != null || sb.xp_when != null
        );
        const rawHintsUsed = sb?.hints_used ?? rr?.hints_used ?? null;
        const numericHintsUsed = rawHintsUsed != null ? Number(rawHintsUsed) : null;
        const rawAccuracy = Number(sb?.accuracy ?? rr?.accuracy ?? 0);
        const rawAccDebt = Number(sb?.acc_debt ?? rr?.acc_debt ?? 0);
        const netAccuracy = Math.max(0, rawAccuracy - rawAccDebt);
        return {
          userId: uid,
          displayName: (sp?.display_name ?? sb?.display_name ?? profile?.display_name ?? 'Unknown') as string,
          avatarUrl: resolvedAvatar,
          score: Number(sb?.score ?? 0),
          accuracy: Number(sb?.accuracy ?? 0),
          xpTotal: Number(sb?.xp_total ?? 0),
          xpDebt: Number(sb?.xp_debt ?? 0),
          accDebt: Number(sb?.acc_debt ?? 0),
          xpWhere: sb?.xp_where != null ? Number(sb.xp_where) : (rr?.xp_where != null ? Number(rr.xp_where) : null),
          xpWhen: sb?.xp_when != null ? Number(sb.xp_when) : (rr?.xp_when != null ? Number(rr.xp_when) : null),
          locationAccuracy: sb?.location_accuracy != null ? Number(sb.location_accuracy) : (rr?.location_accuracy != null ? Number(rr.location_accuracy) : null),
          timeAccuracy: sb?.time_accuracy != null ? Number(sb.time_accuracy) : (rr?.time_accuracy != null ? Number(rr.time_accuracy) : null),
          distanceKm: (sb?.distance_km != null ? Number(sb.distance_km) : (rr?.distance_km ?? null)),
          guessYear: (sb?.guess_year != null ? Number(sb.guess_year) : (rr?.guess_year ?? null)),
          guessLat: rr?.guess_lat ?? null,
          guessLng: rr?.guess_lng ?? null,
          actualLat: rr?.actual_lat ?? null,
          actualLng: rr?.actual_lng ?? null,
          submitted: hasRoundResult || hasScoreboardEntry,
          ready: sp?.ready === true,
          hintsUsed: numericHintsUsed,
          netAccuracy,
        } as PeerRoundRow;
      });

      // 4b. Final fallback: if still empty, derive from session_players alone
      if ((!mergedPeers || mergedPeers.length === 0) && playersArr.length > 0) {
        mergedPeers = playersArr.map((sp: any) => {
          const profile = profileByUser.get(String(sp.user_id));
          const resolvedAvatar = profile?.avatar_image_url
            ?? profile?.avatar_url
            ?? (profile?.avatar_id ? avatarById.get(String(profile.avatar_id)) ?? null : null);
          return {
            userId: sp.user_id,
            displayName: sp.display_name || profile?.display_name || 'Unknown',
            avatarUrl: resolvedAvatar,
            score: 0,
            accuracy: 0,
            xpTotal: 0,
            xpDebt: 0,
            accDebt: 0,
            xpWhere: null,
            xpWhen: null,
            locationAccuracy: null,
            timeAccuracy: null,
            distanceKm: null,
            guessYear: null,
            guessLat: null,
            guessLng: null,
            actualLat: null,
            actualLng: null,
            submitted: false,
            ready: sp?.ready === true,
            hintsUsed: 0,
            netAccuracy: 0,
          } as PeerRoundRow;
        });
      }

      devLog('merged peer count', mergedPeers.length, mergedPeers.map(p => ({ id: p.userId, hasAvatar: !!p.avatarUrl })));

      const normalizeForSort = (value: number | null) => (typeof value === 'number' && Number.isFinite(value) ? value : -Infinity);
      const buildLeaderboard = (extractor: (peer: PeerRoundRow) => number | null): MiniLeaderboardRow[] => {
        const rows = mergedPeers
          .filter((peer) => peer.ready)
          .map((peer) => ({
            userId: peer.userId,
            displayName: peer.displayName,
            value: extractor(peer),
            hintsUsed: Math.max(0, Number(peer.hintsUsed ?? 0)),
          }))
          .filter((row) => row.value != null && Number.isFinite(Number(row.value)));

        rows.sort((a, b) => {
          const bVal = normalizeForSort(b.value);
          const aVal = normalizeForSort(a.value);
          if (bVal !== aVal) return bVal - aVal;
          return a.displayName.localeCompare(b.displayName);
        });

        return rows.slice(0, 5);
      };

      if (mountedRef.current) {
        setPeers(mergedPeers);
        setMiniLeaderboards({
          total: buildLeaderboard(peer => (typeof peer.netAccuracy === 'number' ? peer.netAccuracy : null)),
          time: buildLeaderboard(peer => {
            if (typeof peer.timeAccuracy === 'number') {
              return Math.max(0, peer.timeAccuracy - Number(peer.accDebt ?? 0));
            }
            return null;
          }),
          location: buildLeaderboard(peer => {
            if (typeof peer.locationAccuracy === 'number') {
              return Math.max(0, peer.locationAccuracy - Number(peer.accDebt ?? 0));
            }
            return null;
          }),
        });
        setError(null);
      }
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e?.message || 'Failed to load peers');
        setMiniLeaderboards({ total: [], time: [], location: [] });
      }
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) setIsLoading(false);
      if (queuedRefreshRef.current) {
        queuedRefreshRef.current = false;
        requestAnimationFrame(() => {
          if (mountedRef.current) {
            refresh();
          }
        });
      }
    }
  }, [roomId, roundNumber]);

  // Initial and param-change fetch
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime subscription: refresh on insert/update for this room/round
  useEffect(() => {
    if (!roomId || roundNumber == null) return;

    // Translate 1-based round number (UI) to 0-based DB index for subscription
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

  useEffect(() => {
    if (pollIntervalRef.current != null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (!roomId || roundNumber == null) {
      return;
    }

    const waitingForPeers = peers.length === 0 || peers.some((peer) => !peer.submitted);
    if (!waitingForPeers) {
      return;
    }

    if (typeof window !== 'undefined') {
      pollIntervalRef.current = window.setInterval(() => {
        refresh();
      }, 4000);
    }

    return () => {
      if (pollIntervalRef.current != null) {
        window.clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [roomId, roundNumber, peers, refresh]);

  return useMemo(() => ({ peers, isLoading, error, refresh, miniLeaderboards }), [peers, isLoading, error, refresh, miniLeaderboards]);
}
