import { useEffect, useMemo, useState } from 'react';
import { useRoundPeers } from '@/hooks/useRoundPeers';
import { useGame } from '@/contexts/GameContext';
import { calculateLocationAccuracy, calculateTimeAccuracy, computeRoundNetPercent } from '@/utils/gameCalculations';
import { supabase } from '@/integrations/supabase/client';
import { useSyncRoundScores } from '@/hooks/useSyncRoundScores';

export interface LeaderRow {
  userId: string;
  displayName: string;
  value: number;
  xpTotal?: number;
  xpDebt?: number;
  timeAccuracy?: number;
  locationAccuracy?: number;
  accDebt?: number;
  baseAccuracy?: number;
  hintsUsed?: number;
  penalty?: number;
  avatarUrl?: string | null;
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
  refresh: () => Promise<void>;
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
  const { peers, isLoading: peersLoading, error: peersError, refresh: refreshPeers } = useRoundPeers(resolvedRoomId, resolvedRoundNumber);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string | null>(null);
  const { entries: snapshotEntries, loading: snapshotLoading, refresh: refreshSnapshots } = useSyncRoundScores(resolvedRoomId, resolvedRoundNumber);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    setInitialLoadComplete(false);
  }, [resolvedRoomId, resolvedRoundNumber]);

  useEffect(() => {
    if (!peersLoading && !snapshotLoading) {
      setInitialLoadComplete(true);
    }
  }, [peersLoading, snapshotLoading]);

  const refresh = useMemo(() => {
    return async () => {
      await Promise.allSettled([
        (async () => { if (typeof refreshPeers === 'function') await refreshPeers(); })(),
        (async () => { if (typeof refreshSnapshots === 'function') await refreshSnapshots(); })(),
      ]);
    };
  }, [refreshPeers, refreshSnapshots]);

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

    const globalObj: Record<string, any> | null = typeof globalThis !== 'undefined' ? (globalThis as any) : null;

    const getLogStore = (): any[] | null => {
      if (!globalObj) return null;
      if (!Array.isArray(globalObj.__ghCompeteLeaderboardLogs)) {
        globalObj.__ghCompeteLeaderboardLogs = [] as any[];
      }
      return globalObj.__ghCompeteLeaderboardLogs as any[];
    };

    if (globalObj && typeof globalObj.__ghGetCompeteLeaderboardLogTail !== 'function') {
      globalObj.__ghGetCompeteLeaderboardLogTail = (limit: number = 10) => {
        const store = getLogStore();
        if (!store) return [] as any[];
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
        return store.slice(-safeLimit);
      };
    }

    const isDev = typeof import.meta !== 'undefined' && Boolean((import.meta as any)?.env?.DEV);
    const debugEnabled = isDev || globalObj?.__ghEnableLeaderboardLogs === true;

    const pushDebugLog = (stage: 'input' | 'computed', payload: Record<string, unknown>) => {
      if (!debugEnabled) return;
      console.debug(`[useCompeteRoundLeaderboards] ${stage}`, payload);

      const store = getLogStore();
      if (!store) return;
      store.push({ ts: Date.now(), stage, payload });
      if (store.length > 200) {
        store.splice(0, store.length - 200);
      }
    };

    // Dev-only diagnostics to trace inputs and ensure current user presence
    if (debugEnabled) {
      try {
        const ids = Array.from(userIdSet);
        const payload = {
          roomId: resolvedRoomId,
          roundNumber: resolvedRoundNumber,
          snapshotCount: snapshotEntries.length,
          peersCount: (peers || []).length,
          currentUserId,
          userIdSet: ids,
        };
        pushDebugLog('input', payload);
      } catch {}
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
      const avatarUrl = peer?.avatarUrl ?? null;

      const fallbackXp = pickNumber(peer?.score, peer?.xpTotal) ?? 0;
      const xpDebt = Math.max(0, Math.round(pickNumber((snapshot as any)?.xpDebt, peer?.xpDebt) ?? 0));
      const xpTotalRaw = pickNumber(snapshot?.xpTotal, fallbackXp) ?? 0;
      const xpTotal = Math.max(0, pickNumber(snapshot?.netXp, xpTotalRaw - xpDebt) ?? (xpTotalRaw - xpDebt));

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

      // Compute hintsUsed first so we can prefer peer accDebt when snapshot is 0 but hints were used
      const whenHintsValue = Math.max(0, Math.round(pickNumber((snapshot as any)?.whenHints, peer?.whenHints, 0) ?? 0));
      const whereHintsValue = Math.max(0, Math.round(pickNumber((snapshot as any)?.whereHints, peer?.whereHints, 0) ?? 0));
      const hintsUsed = Math.max(0, Math.round(pickNumber((snapshot as any)?.hintsUsed, peer?.hintsUsed, whenHintsValue + whereHintsValue, 0) ?? 0));

      const whenAccDebtValue = Math.max(0, Math.round(pickNumber((snapshot as any)?.whenAccDebt, peer?.whenAccDebt, 0) ?? 0));
      const whereAccDebtValue = Math.max(0, Math.round(pickNumber((snapshot as any)?.whereAccDebt, peer?.whereAccDebt, 0) ?? 0));

      const accDebtSnapshot = pickNumber(snapshot?.accDebt, null);
      const accDebtPeer = pickNumber(peer?.accDebt, null);
      let accDebt = Math.max(0, Number(accDebtSnapshot ?? accDebtPeer ?? 0));
      if ((accDebtSnapshot ?? null) === 0 && (accDebtPeer ?? 0) > 0 && hintsUsed > 0) {
        accDebt = Math.max(0, Number(accDebtPeer));
      }

      const netTimeAcc = Math.max(0, Math.round(pickNumber(snapshot?.netTimeAccuracy, timeAcc - whenAccDebtValue) ?? (timeAcc - whenAccDebtValue)));
      const netLocationAcc = Math.max(0, Math.round(pickNumber(snapshot?.netLocationAccuracy, locationAcc - whereAccDebtValue) ?? (locationAcc - whereAccDebtValue)));
      const overallAccuracy = Math.round((timeAcc + locationAcc) / 2);
      const netAccuracy = computeRoundNetPercent(timeAcc, locationAcc, accDebt);

      total.push({
        userId,
        displayName,
        value: Number.isFinite(netAccuracy) ? netAccuracy : 0,
        xpTotal,
        xpDebt,
        timeAccuracy: timeAcc,
        locationAccuracy: locationAcc,
        accDebt,
        baseAccuracy: overallAccuracy,
        hintsUsed,
        penalty: Math.max(0, Math.round(accDebt)),
        avatarUrl,
      });

      when.push({
        userId,
        displayName,
        value: netTimeAcc,
        accDebt,
        hintsUsed: whenHintsValue,
        timeAccuracy: timeAcc,
        penalty: whenAccDebtValue,
        avatarUrl,
      });
      where.push({
        userId,
        displayName,
        value: netLocationAcc,
        accDebt,
        hintsUsed: whereHintsValue,
        locationAccuracy: locationAcc,
        penalty: whereAccDebtValue,
        avatarUrl,
      });
    });

    total.sort(sortDescending);
    when.sort(sortDescending);
    where.sort(sortDescending);

    const derivedSource = snapshotMap.size > 0 && peersMap.size > 0 && userIds.length > snapshotMap.size
      ? 'mixed' as const
      : snapshotMap.size > 0
        ? 'snapshots' as const
        : 'legacy' as const;

    // Dev-only diagnostics to trace computed rows and ensure self inclusion
    if (debugEnabled) {
      try {
        const payload = {
          roomId: resolvedRoomId,
          roundNumber: resolvedRoundNumber,
          source: derivedSource,
          currentUserId,
          totalIds: total.map(r => r.userId),
          whenIds: when.map(r => r.userId),
          whereIds: where.map(r => r.userId),
        };
        pushDebugLog('computed', payload);
      } catch {}
    }

    return { computed: { total, when, where }, source: derivedSource };
  }, [resolvedRoomId, resolvedRoundNumber, snapshotEntries, peers, actualYear, currentUserId, currentUserDisplayName]);

  const hasRows = computed.total.length > 0;
  const loading = !initialLoadComplete;
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
    refresh,
  };
}
