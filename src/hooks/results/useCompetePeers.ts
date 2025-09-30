import { useMemo } from 'react';
import { useRoundPeers, type PeerRoundRow } from '@/hooks/useRoundPeers';

export interface UseCompetePeersResult {
  peers: PeerRoundRow[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Thin wrapper around the existing `useRoundPeers` hook that normalizes display names but keeps
 * the full `PeerRoundRow` payload required by the map overlay inside `ResultsLayout2`.
 */
export function useCompetePeers(roomId: string | null, roundNumber: number | null): UseCompetePeersResult {
  const { peers, isLoading, error, refresh } = useRoundPeers(roomId, roundNumber);

  const normalized = useMemo<PeerRoundRow[]>(() =>
    (peers || []).map((peer) => ({
      ...peer,
      displayName: peer.displayName || 'Player',
      xpTotal: Number.isFinite(peer.xpTotal) ? Number(peer.xpTotal) : 0,
      xpDebt: Number.isFinite(peer.xpDebt) ? Number(peer.xpDebt) : 0,
      accDebt: Number.isFinite(peer.accDebt) ? Number(peer.accDebt) : 0,
    })),
  [peers]);

  return {
    peers: normalized,
    isLoading,
    error,
    refresh,
  };
}
