import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSyncRoundScores } from '@/hooks/useSyncRoundScores';

export interface CompeteSyncLeaderboardEntry {
  userId: string;
  displayName: string;
  totalPercent: number;
  timeAccuracy: number;
  locationAccuracy: number;
  xpTotal: number;
  submittedAt: string;
}

export interface UseCompeteSyncLeaderboardResult {
  entries: CompeteSyncLeaderboardEntry[];
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  source: 'snapshots' | 'empty';
}

/**
 * Reads the authoritative multiplayer round leaderboard from the `sync_round_scores` table.
 * This hook is Compete-specific; Solo and Level experiences continue to rely on the existing
 * context-driven results.
 */
export function useCompeteSyncLeaderboard(
  roomId: string | null,
  roundNumber: number | null
): UseCompeteSyncLeaderboardResult {
  const hasValidRound = roundNumber != null && Number.isFinite(roundNumber);
  const resolvedRound = hasValidRound ? Number(roundNumber) : null;
  const resolvedRoomId = roomId ?? null;

  const { entries: rawEntries, loading: loadingEntries } = useSyncRoundScores(resolvedRoomId, resolvedRound);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchUser = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw authError;
        }
        if (!cancelled) {
          setCurrentUserId(data?.user?.id ?? null);
        }
      } catch (err) {
        console.warn('[useCompeteSyncLeaderboard] Failed to read auth session', err);
        if (!cancelled) {
          setCurrentUserId(null);
        }
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalized = useMemo<CompeteSyncLeaderboardEntry[]>(() => {
    if (!resolvedRoomId || !resolvedRound) {
      return [];
    }

    if (!rawEntries || rawEntries.length === 0) {
      return [];
    }

    return rawEntries.map((entry) => ({
      userId: entry.userId,
      displayName: entry.displayName || 'Player',
      timeAccuracy: Number.isFinite(entry.timeAccuracy) ? Number(entry.timeAccuracy) : 0,
      locationAccuracy: Number.isFinite(entry.locationAccuracy) ? Number(entry.locationAccuracy) : 0,
      totalPercent: Number.isFinite(entry.timeAccuracy) && Number.isFinite(entry.locationAccuracy)
        ? (Number(entry.timeAccuracy) + Number(entry.locationAccuracy)) / 2
        : 0,
      xpTotal: Number.isFinite(entry.xpTotal) ? Number(entry.xpTotal) : 0,
      submittedAt: entry.submittedAt,
    }));
  }, [resolvedRoomId, resolvedRound, rawEntries]);

  useEffect(() => {
    if (!resolvedRoomId || !resolvedRound) {
      setError(null);
      return;
    }

    if (rawEntries.length === 0) {
      setError(null);
      return;
    }

    setError(null);
  }, [resolvedRoomId, resolvedRound, rawEntries]);

  return {
    entries: normalized,
    isLoading: loadingEntries,
    error,
    currentUserId,
    source: normalized.length > 0 ? 'snapshots' : 'empty',
  };
}
