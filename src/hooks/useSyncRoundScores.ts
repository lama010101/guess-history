import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { acquireChannel } from '@/integrations/supabase/realtime';

export interface SyncRoundScoreEntry {
  userId: string;
  displayName: string;
  xpTotal: number;
  timeAccuracy: number;
  locationAccuracy: number;
  xpDebt: number;
  accDebt: number;
  netXp: number;
  netTimeAccuracy: number;
  netLocationAccuracy: number;
  hintsUsed: number;
  distanceKm: number | null;
  yearDifference: number | null;
  guessYear: number | null;
  guessLat: number | null;
  guessLng: number | null;
  submittedAt: string;
}

type RawScoreRow = {
  user_id: string;
  display_name: string | null;
  xp_total: number | null;
  time_accuracy: number | null;
  location_accuracy: number | null;
  xp_debt: number | null;
  acc_debt: number | null;
  hints_used: number | null;
  distance_km: number | null;
  year_difference: number | null;
  guess_year: number | null;
  guess_lat: number | null;
  guess_lng: number | null;
  submitted_at: string | null;
};

type RawPlayerRow = {
  user_id: string;
  display_name: string | null;
};

export function useSyncRoundScores(roomId: string | null, roundNumber: number | null) {
  const [entries, setEntries] = useState<SyncRoundScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchScores = useCallback(async () => {
    if (!roomId || !roundNumber || !Number.isFinite(roundNumber)) {
      setEntries([]);
      return;
    }

    setLoading(true);
    try {
      const { data: scoreRows, error } = await supabase
        .from('sync_round_scores')
        .select('user_id, display_name, xp_total, time_accuracy, location_accuracy, xp_debt, acc_debt, hints_used, distance_km, year_difference, guess_year, guess_lat, guess_lng, submitted_at')
        .eq('room_id', roomId)
        .eq('round_number', roundNumber)
        .order('xp_total', { ascending: false });

      if (error) {
        console.warn('[useSyncRoundScores] fetch scores failed', error);
        setEntries([]);
        return;
      }

      const rows = (scoreRows ?? []) as RawScoreRow[];
      const missingNames = rows
        .filter((row) => !row.display_name)
        .map((row) => row.user_id);

      let nameMap = new Map<string, string>();
      if (missingNames.length > 0) {
        const uniqueMissing = Array.from(new Set(missingNames));
        const { data: playerRows, error: playersError } = await supabase
          .from('sync_room_players')
          .select('user_id, display_name')
          .eq('room_id', roomId)
          .in('user_id', uniqueMissing);

        if (!playersError && Array.isArray(playerRows)) {
          (playerRows as RawPlayerRow[]).forEach((row) => {
            if (row.user_id) {
              nameMap.set(row.user_id, row.display_name?.trim() ?? 'Player');
            }
          });
        }
      }

      const processed: SyncRoundScoreEntry[] = rows.map((row) => {
        const fallbackName = nameMap.get(row.user_id) ?? 'Player';
        const xpTotal = Number.isFinite(row.xp_total) ? Number(row.xp_total) : 0;
        const timeAccuracy = Number.isFinite(row.time_accuracy) ? Number(row.time_accuracy) : 0;
        const locationAccuracy = Number.isFinite(row.location_accuracy) ? Number(row.location_accuracy) : 0;
        const xpDebt = Number.isFinite(row.xp_debt) ? Number(row.xp_debt) : 0;
        const accDebt = Number.isFinite(row.acc_debt) ? Number(row.acc_debt) : 0;
        const netTime = Math.max(0, Math.round(timeAccuracy - accDebt));
        const netLocation = Math.max(0, Math.round(locationAccuracy - accDebt));
        return {
          userId: row.user_id,
          displayName: (row.display_name?.trim() || fallbackName || 'Player').slice(0, 48),
          xpTotal,
          timeAccuracy,
          locationAccuracy,
          xpDebt,
          accDebt,
          netXp: Math.max(0, xpTotal - Math.max(0, Math.round(Number(row.xp_debt) || 0))),
          netTimeAccuracy: netTime,
          netLocationAccuracy: netLocation,
          hintsUsed: Math.max(0, Number(row.hints_used ?? 0)),
          distanceKm: row.distance_km !== null ? Number(row.distance_km) : null,
          yearDifference: row.year_difference !== null ? Number(row.year_difference) : null,
          guessYear: row.guess_year !== null ? Number(row.guess_year) : null,
          guessLat: row.guess_lat !== null ? Number(row.guess_lat) : null,
          guessLng: row.guess_lng !== null ? Number(row.guess_lng) : null,
          submittedAt: row.submitted_at ?? new Date().toISOString(),
        };
      });

      setEntries(processed);
    } catch (err) {
      console.warn('[useSyncRoundScores] unexpected error', err);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [roomId, roundNumber]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  useEffect(() => {
    if (!roomId || !roundNumber || !Number.isFinite(roundNumber)) {
      return;
    }
    const channelName = `sync_round_scores:${roomId}:${roundNumber}`;
    const handle = acquireChannel(channelName);
    handle.channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_round_scores', filter: `room_id=eq.${roomId}` },
      () => {
        fetchScores();
      }
    );

    return () => {
      handle.release();
    };
  }, [roomId, roundNumber, fetchScores]);

  useEffect(() => {
    if (!roomId || !roundNumber || !Number.isFinite(roundNumber)) {
      return;
    }
    const spHandle = acquireChannel(`session_players:${roomId}`);
    spHandle.channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'session_players', filter: `room_id=eq.${roomId}` },
      () => {
        fetchScores();
      }
    );

    return () => {
      spHandle.release();
    };
  }, [roomId, roundNumber, fetchScores]);

  useEffect(() => {
    if (!roomId || !roundNumber || !Number.isFinite(roundNumber)) {
      return;
    }
    const dbRoundIndex = Math.max(0, Number(roundNumber) - 1);
    const rrHandle = acquireChannel(`round_results:${roomId}:${dbRoundIndex}`);
    rrHandle.channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'round_results', filter: `room_id=eq.${roomId},round_index=eq.${dbRoundIndex}` },
      () => {
        fetchScores();
      }
    );

    return () => {
      rrHandle.release();
    };
  }, [roomId, roundNumber, fetchScores]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (b.xpTotal !== a.xpTotal) return b.xpTotal - a.xpTotal;
      if (b.timeAccuracy !== a.timeAccuracy) return b.timeAccuracy - a.timeAccuracy;
      if (b.locationAccuracy !== a.locationAccuracy) return b.locationAccuracy - a.locationAccuracy;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [entries]);

  return {
    entries: sortedEntries,
    loading,
    refresh: fetchScores,
  };
}
