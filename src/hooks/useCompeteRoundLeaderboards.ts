import { useEffect, useMemo, useState } from 'react';
import { useRoundPeers } from '@/hooks/useRoundPeers';
import { useGame } from '@/contexts/GameContext';
import { calculateLocationAccuracy, calculateTimeAccuracy } from '@/utils/gameCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useSyncRoundScores } from '@/hooks/useSyncRoundScores';

export interface LeaderRow {
  userId: string;
  displayName: string;
  value: number;
  xpTotal?: number;
  timeAccuracy?: number;
  locationAccuracy?: number;
}

export interface CompeteLeaderboardState {
  total: LeaderRow[];
  when: LeaderRow[];
  where: LeaderRow[];
  peers: ReturnType<typeof useRoundPeers>['peers'];
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  actualYear: number | null;
  source: 'snapshots' | 'legacy' | 'mixed' | 'empty';
}

const EMPTY_ROWS = { total: [] as LeaderRow[], when: [] as LeaderRow[], where: [] as LeaderRow[] };

const sortDescending = (a: LeaderRow, b: LeaderRow) =>
  (b.value - a.value)
  || ((b.xpTotal ?? 0) - (a.xpTotal ?? 0))
  || a.displayName.localeCompare(b.displayName);

const pickNumber = (...candidates: Array<number | null | undefined>): number | null => {
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
    }
  }
  return null;
};

export function useCompeteRoundLeaderboards(
  roomId: string | null,
  roundNumber: number | null
): CompeteLeaderboardState {
  const resolvedRoomId = roomId ?? null;
  const hasValidRound = roundNumber != null && Number.isFinite(roundNumber);
  const resolvedRoundNumber = hasValidRound ? Number(roundNumber) : null;

  const { images } = useGame();
  const { peers, isLoading: peersLoading, error: peersError } = useRoundPeers(resolvedRoomId, resolvedRoundNumber);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const { entries: snapshotEntries, loading: snapshotLoading } = useSyncRoundScores(resolvedRoomId, resolvedRoundNumber);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id ?? null;
        if (!cancelled) {
          setCurrentUserId(userId);
        }

        if (!userId) {
          if (!cancelled) setCurrentUserDisplayName(null);
          return;
        }

        let displayName: string | null = null;
        if (resolvedRoomId) {
          const { data: profile } = await supabase
            .from('session_players')
            .select('display_name')
            .eq('room_id', resolvedRoomId)
            .eq('user_id', userId)
            .maybeSingle();
          displayName = profile?.display_name ?? null;
        }

        if (!displayName) {
          const meta = data?.user?.user_metadata ?? {};
          displayName = meta.display_name ?? meta.full_name ?? meta.name ?? null;
        }

        if (!cancelled) {
          setCurrentUserDisplayName(displayName ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setCurrentUserDisplayName(null);
        }
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, [resolvedRoomId]);

  const actualYear = useMemo(() => {
    if (!resolvedRoundNumber || !images || images.length < resolvedRoundNumber) return null;
    const imageForRound = images[resolvedRoundNumber - 1];
    return imageForRound?.year ?? null;
  }, [resolvedRoundNumber, images]);


  const { computed, source } = useMemo(() => {
    if (!resolvedRoomId || !resolvedRoundNumber) {
      return { computed: EMPTY_ROWS, source: 'empty' as const };
    }

    const snapshotMap = new Map(snapshotEntries.map((entry) => [entry.userId, entry]));
    const peersMap = new Map((peers || []).map((peer) => [peer.userId, peer]));
    const userIdSet = new Set<string>([
      ...snapshotEntries.map((entry) => entry.userId),
      ...(peers || []).map((peer) => peer.userId),
    ]);

    if (currentUserId) {
      userIdSet.add(currentUserId);
    }

    if (userIdSet.size === 0) {
      return { computed: EMPTY_ROWS, source: 'empty' as const };
    }

    const total: LeaderRow[] = [];
    const when: LeaderRow[] = [];
    const where: LeaderRow[] = [];

    const userIds = Array.from(userIdSet);

    userIds.forEach((userId) => {
      const snapshot = snapshotMap.get(userId);
      const peer = peersMap.get(userId);

      const rawName = snapshot?.displayName
        ?? peer?.displayName
        ?? (userId === currentUserId ? currentUserDisplayName ?? undefined : undefined);
      const displayName = rawName && rawName.trim().length > 0 ? rawName.trim() : 'Player';

      const fallbackXp = pickNumber(peer?.score, peer?.xpTotal) ?? 0;
      const xpTotal = pickNumber(snapshot?.xpTotal, fallbackXp) ?? 0;

      const fallbackTimeAcc = pickNumber(
        peer?.accuracy,
        peer?.guessYear != null && actualYear != null
          ? Math.round(calculateTimeAccuracy(Number(peer.guessYear), Number(actualYear)))
          : null
      );
      const timeAcc = pickNumber(snapshot?.timeAccuracy, fallbackTimeAcc) ?? 0;

      const fallbackLocationAcc = peer?.distanceKm != null
        ? Math.round(calculateLocationAccuracy(Number(peer.distanceKm)))
        : null;
      const locationAcc = pickNumber(snapshot?.locationAccuracy, fallbackLocationAcc) ?? 0;

      const overallAccuracy = Math.round((timeAcc + locationAcc) / 2);

      total.push({ userId, displayName, value: overallAccuracy, xpTotal, timeAccuracy: timeAcc, locationAccuracy: locationAcc });
      when.push({ userId, displayName, value: timeAcc });
      where.push({ userId, displayName, value: locationAcc });
    });

    total.sort(sortDescending);
    when.sort(sortDescending);
    where.sort(sortDescending);

    const derivedSource = snapshotMap.size > 0 && peersMap.size > 0 && userIds.length > snapshotMap.size
      ? 'mixed' as const
      : snapshotMap.size > 0
        ? 'snapshots' as const
        : 'legacy' as const;

    return { computed: { total, when, where }, source: derivedSource };
  }, [resolvedRoomId, resolvedRoundNumber, snapshotEntries, peers, actualYear, currentUserId, currentUserDisplayName]);

  const hasRows = computed.total.length > 0;
  const loading = (peersLoading || snapshotLoading) && !hasRows;
  const surfacedError = hasRows ? null : peersError;

  return {
    total: computed.total,
    when: computed.when,
    where: computed.where,
    peers,
    isLoading: loading,
    error: surfacedError,
    currentUserId,
    actualYear,
    source,
  };
}
