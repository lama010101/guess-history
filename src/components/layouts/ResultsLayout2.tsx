import React, { useState, useEffect, useMemo } from 'react';
import { Badge as BadgeType } from '@/utils/badges/types';
import { BadgeEarnedPopup } from '@/components/badges/BadgeEarnedPopup';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Fullscreen, MapPin, Calendar, Target, Zap, Users } from 'lucide-react';
import ResultsHeader from '@/components/results/ResultsHeader';
import SourceModal from '@/components/modals/SourceModal';
import HintDebtsCard from '@/components/results/HintDebtsCard';
import { RoundResult as BaseRoundResult, XP_WHERE_MAX, XP_WHEN_MAX, HintDebt } from '@/utils/results/types';
import { formatInteger, formatDistanceFromKm } from '@/utils/format';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PeerRoundRow } from '@/hooks/useRoundPeers';

// Import Leaflet components and CSS
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.fullscreen/Control.FullScreen.css';
import L from 'leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';

// Custom icons
const createUserIcon = (avatarUrl: string) => L.divIcon({
  html: `<div style="width: 30px; height: 30px; border-radius: 50%; background-image: url(${avatarUrl}); background-size: cover; border: 2px solid white;"></div>`,
  className: 'user-avatar-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

const correctIcon = L.divIcon({
  html: `<div style="background-color: hsl(var(--secondary)); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px hsl(var(--secondary) / 0.6);"></div>`,
  className: 'correct-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30]
});

// Helper to get hint label if not present in debt object
const getHintLabel = (hintId: string): string => {
  return HINT_TYPE_NAMES[hintId] || hintId;
};

// Component to automatically adjust map bounds
const MapBoundsUpdater = ({ bounds }: { bounds: L.LatLngBounds | null }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const FullscreenHandler = () => {
  const map = useMap();
  useEffect(() => {
    const lControl = document.querySelector('.leaflet-control-zoom-in');
    if (lControl) {
      L.DomEvent.disableClickPropagation(lControl as HTMLElement);
    }
  }, [map]);
  return null;
};

interface RoundResult extends BaseRoundResult {
  hintDebts?: HintDebt[];
  confidence?: number;
  source_citation?: string;
}

interface RoundLeaderboardEntry {
  userId: string;
  displayName: string;
  value: number;
  hintsUsed?: number;
}

interface RoundLeaderboardsProps {
  total: RoundLeaderboardEntry[];
  when: RoundLeaderboardEntry[];
  where: RoundLeaderboardEntry[];
  currentUserId?: string | null;
}

export interface ResultsLayoutProps {
  loading: boolean;
  error: string | null;
  result?: RoundResult | null;
  avatarUrl?: string;
  extraButtons?: React.ReactNode;
  homeButton?: React.ReactNode;
  round?: number;
  totalRounds?: number;
  nextRoundButton?: React.ReactNode;
  nextRoundCountdown?: number | null;
  rateButton?: React.ReactNode;
  peers?: PeerRoundRow[];
  currentUserDisplayName?: string;
  leaderboards?: RoundLeaderboardsProps;
  roundLeaderboardCard?: React.ReactNode;
  roundLeaderboardHeaderAccessory?: React.ReactNode;
}

const ResultsLayout2: React.FC<ResultsLayoutProps> = ({ 
  loading,
  error,
  result,
  avatarUrl = '/assets/default-avatar.png',
  extraButtons,
  homeButton,
  round,
  totalRounds,
  nextRoundButton,
  nextRoundCountdown,
  rateButton,
  peers = [],
  currentUserDisplayName = 'You',
  leaderboards,
  roundLeaderboardCard,
  roundLeaderboardHeaderAccessory,
}) => {
  const { user } = useAuth();
  const selfUserId = user?.id || 'self';
  const distanceUnit = useSettingsStore(s => s.distanceUnit);
  const mapLabelLanguage = useSettingsStore(s => s.mapLabelLanguage);
  const [earnedBadge, setEarnedBadge] = useState<BadgeType | null>(null);
  const [isSourceModalOpen, setSourceModalOpen] = useState(false);
  // Hooks must be called unconditionally before any early returns
  const handleBadgePopupClose = () => {
    setEarnedBadge(null);
  };

  useEffect(() => {
    if (result?.earnedBadges && result.earnedBadges.length > 0) {
      setEarnedBadge(result.earnedBadges[0]);
    }
  }, [result]);

  const whenHintDebts = result?.hintDebts?.filter(d => d.hint_type === 'when') ?? [];
  const whereHintDebts = result?.hintDebts?.filter(d => d.hint_type === 'where') ?? [];

  const xpDebt = result?.hintDebts?.reduce((sum, d) => sum + d.xpDebt, 0) ?? 0;
  const accDebt = result?.hintDebts?.reduce((sum, d) => sum + d.accDebt, 0) ?? 0;

  const xpDebtWhen = whenHintDebts.reduce((sum, d) => sum + d.xpDebt, 0);
  const xpDebtWhere = whereHintDebts.reduce((sum, d) => sum + d.xpDebt, 0);
  const accDebtWhen = whenHintDebts.reduce((sum, d) => sum + d.accDebt, 0);
  const accDebtWhere = whereHintDebts.reduce((sum, d) => sum + d.accDebt, 0);
  const totalAccDebt = accDebt;

  const netXpWhen = Math.max(0, (result?.xpWhen ?? 0) - xpDebtWhen);
  const netXpWhere = Math.max(0, (result?.xpWhere ?? 0) - xpDebtWhere);
  // Compute net XP consistently from components to avoid double-subtracting when xpTotal is already net.
  const netXP = Math.max(0, (result?.xpWhen ?? 0) + (result?.xpWhere ?? 0) - xpDebt);

  const baseTimeAccuracy = Math.max(0, result?.timeAccuracy ?? 0);
  const baseLocationAccuracy = Math.max(0, result?.locationAccuracy ?? 0);
  const baseTotalAccuracy = Math.max(0, result?.accuracy ?? 0);

  const netTimeAccuracy = Math.max(0, baseTimeAccuracy - accDebtWhen);
  const netLocationAccuracy = Math.max(0, baseLocationAccuracy - accDebtWhere);
  const netAccuracy = Math.max(0, baseTotalAccuracy - totalAccDebt);

  // If leaderboards are present, use their self row values to display "Your Score"
  // so both host and friend see identical numbers across devices.
  const selfLbUserId = (leaderboards?.currentUserId ?? selfUserId) || selfUserId;
  const lbSelfTotal = leaderboards?.total.find(r => r.userId === selfLbUserId)?.value;
  const lbSelfWhen = leaderboards?.when.find(r => r.userId === selfLbUserId)?.value;
  const lbSelfWhere = leaderboards?.where.find(r => r.userId === selfLbUserId)?.value;
  const displayNetAccuracy = lbSelfTotal != null ? Math.max(0, Math.round(Number(lbSelfTotal))) : Math.round(netAccuracy);
  const displayNetTimeAccuracy = lbSelfWhen != null ? Math.max(0, Math.round(Number(lbSelfWhen))) : Math.round(netTimeAccuracy);
  const displayNetLocationAccuracy = lbSelfWhere != null ? Math.max(0, Math.round(Number(lbSelfWhere))) : Math.round(netLocationAccuracy);

  const correctLat = result?.eventLat ?? 0;
  const correctLng = result?.eventLng ?? 0;
  const userLat = result?.guessLat ?? null;
  const userLng = result?.guessLng ?? null;

  const hasUserGuess = userLat !== null && userLng !== null;
  const correctPosition: L.LatLngTuple = [correctLat, correctLng];
  const userPosition: L.LatLngTuple | null = hasUserGuess ? [userLat as number, userLng as number] as L.LatLngTuple : null;

  const peerPositions: L.LatLngTuple[] = useMemo(() =>
    (peers || [])
      .filter(p => p.guessLat !== null && p.guessLng !== null)
      .map(p => [p.guessLat as number, p.guessLng as number] as L.LatLngTuple)
  , [peers]);

  const allPositions: L.LatLngTuple[] = useMemo(() => {
    const arr: L.LatLngTuple[] = [correctPosition];
    if (userPosition) arr.push(userPosition);
    return arr.concat(peerPositions);
  }, [correctPosition, userPosition, peerPositions]);

  const bounds = useMemo(() => {
    if (allPositions.length > 1) {
      return L.latLngBounds(allPositions);
    }
    return null;
  }, [allPositions]);

  const mapCenter = bounds ? bounds.getCenter() : correctPosition;

  const userIcon = useMemo(() => createUserIcon(avatarUrl), [avatarUrl]);

  type LeaderboardEntry = {
    userId: string;
    displayName: string;
    totalMetric: number;
    whenMetric: number;
    whereMetric: number;
    totalBase: number;
    whenBase: number;
    whereBase: number;
    totalPenalty: number;
    whenPenalty: number;
    wherePenalty: number;
    totalHints: number;
    whenHints: number;
    whereHints: number;
  };

  const selfTotalHintsCount = whenHintDebts.length + whereHintDebts.length;
  const selfTotalPenalty = Math.max(0, Math.round(totalAccDebt));
  const selfWhenPenalty = Math.max(0, Math.round(accDebtWhen));
  const selfWherePenalty = Math.max(0, Math.round(accDebtWhere));
  const selfWhenHints = whenHintDebts.length;
  const selfWhereHints = whereHintDebts.length;

  const leaderboardEntries = useMemo<LeaderboardEntry[]>(() => {
    const clampPercent = (value: number | null | undefined) => {
      if (typeof value !== 'number' || Number.isNaN(value)) return 0;
      return Math.min(100, Math.max(0, value));
    };

    const normalizeTime = (raw: number | null | undefined, fallbackGuess: number | null | undefined, fallbackEvent: number | null | undefined) => {
      if (raw != null) return clampPercent(raw);
      if (fallbackGuess == null || fallbackEvent == null) return 0;
      const diff = Math.abs(fallbackGuess - fallbackEvent);
      if (!Number.isFinite(diff)) return 0;
      const ratio = Math.max(0, Math.min(100, 100 - Math.min(diff, 50) / 50 * 100));
      return Math.round(ratio);
    };

    const normalizeDistance = (raw: number | null | undefined) => {
      if (raw == null || Number.isNaN(raw)) return 0;
      const maxDist = 2000;
      const clamped = Math.max(0, Math.min(maxDist, raw));
      return Math.round((1 - clamped / maxDist) * 100);
    };

    const baseTimeAccuracy = clampPercent(result?.timeAccuracy ?? 0);
    const baseLocationAccuracy = clampPercent(result?.locationAccuracy ?? 0);
    const baseTotalAccuracy = clampPercent((baseTimeAccuracy + baseLocationAccuracy) / 2);

    const entries: LeaderboardEntry[] = [];

    const selfTotalHints = Math.max(0, Number(result?.hintsUsed ?? (selfWhenHints + selfWhereHints)));

    const selfNetAccuracy = clampPercent(netAccuracy);
    const selfNetTimeAccuracy = clampPercent(netTimeAccuracy);
    const selfNetLocationAccuracy = clampPercent(netLocationAccuracy);

    entries.push({
      userId: selfUserId,
      displayName: currentUserDisplayName,
      totalMetric: selfNetAccuracy,
      whenMetric: selfNetTimeAccuracy,
      whereMetric: selfNetLocationAccuracy,
      totalBase: baseTotalAccuracy,
      whenBase: baseTimeAccuracy,
      whereBase: baseLocationAccuracy,
      totalPenalty: Math.max(0, baseTotalAccuracy - selfNetAccuracy),
      whenPenalty: Math.max(0, baseTimeAccuracy - selfNetTimeAccuracy),
      wherePenalty: Math.max(0, baseLocationAccuracy - selfNetLocationAccuracy),
      totalHints: selfTotalHints,
      whenHints: selfWhenHints,
      whereHints: selfWhereHints,
    });

    for (const peer of peers || []) {
      const normalizedTimeRaw = normalizeTime(peer.timeAccuracy, peer.guessYear, result?.eventYear ?? null);
      const normalizedWhereRaw = peer.locationAccuracy != null
        ? clampPercent(peer.locationAccuracy)
        : normalizeDistance(peer.distanceKm);
      const baseTime = clampPercent(normalizedTimeRaw);
      const baseWhere = clampPercent(normalizedWhereRaw);
      const whenAccDebt = Math.max(0, Number(peer.whenAccDebt ?? 0));
      const whereAccDebt = Math.max(0, Number(peer.whereAccDebt ?? 0));
      const whenPenalty = Math.min(baseTime, whenAccDebt);
      const wherePenalty = Math.min(baseWhere, whereAccDebt);
      const normalizedTime = Math.max(0, baseTime - whenPenalty);
      const normalizedWhere = Math.max(0, baseWhere - wherePenalty);
      const totalNet = typeof peer.netAccuracy === 'number'
        ? clampPercent(peer.netAccuracy)
        : Math.max(0, clampPercent(peer.accuracy) - Math.max(whenPenalty, wherePenalty));
      const baseTotal = clampPercent((baseTime + baseWhere) / 2);

      entries.push({
        userId: peer.userId,
        displayName: peer.displayName || 'Player',
        totalMetric: totalNet,
        whenMetric: normalizedTime,
        whereMetric: normalizedWhere,
        totalBase: clampPercent(baseTotal),
        whenBase: clampPercent(baseTime),
        whereBase: clampPercent(baseWhere),
        totalPenalty: Math.max(0, baseTotal - totalNet),
        whenPenalty: Math.max(0, whenPenalty),
        wherePenalty: Math.max(0, wherePenalty),
        totalHints: Math.max(0, Number(peer.hintsUsed ?? (peer.whenHints ?? 0) + (peer.whereHints ?? 0))),
        whenHints: Math.max(0, Number(peer.whenHints ?? 0)),
        whereHints: Math.max(0, Number(peer.whereHints ?? 0)),
      });
    }

    return entries;
  }, [
    selfUserId,
    currentUserDisplayName,
    netAccuracy,
    netTimeAccuracy,
    netLocationAccuracy,
    peers,
    result?.eventYear,
    result?.timeAccuracy,
    result?.locationAccuracy,
  ]);

  const hasLeaderboardPeers = leaderboardEntries.length > 1;

  const renderLeaderboardTable = (
    rows: Array<{ userId: string; displayName: string; value: number; hintsUsed?: number; penalty?: number }>,
    highlightUserId: string | null,
    metric: 'total' | 'when' | 'where',
    variant: 'default' | 'embedded' = 'default'
  ) => {
    if (!rows.length) return null;
    const containerClasses = variant === 'embedded'
      ? 'rounded-xl border border-gray-200 bg-white/80 dark:border-neutral-800 dark:bg-neutral-900/40'
      : 'mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60';
    const rowBackground = variant === 'embedded'
      ? 'bg-white/70 dark:bg-neutral-800/50'
      : 'bg-neutral-800/70';
    const baseNameClass = variant === 'embedded'
      ? 'text-gray-800 dark:text-neutral-200'
      : 'text-neutral-200';
    const highlightedNameClass = variant === 'embedded'
      ? 'font-semibold text-gray-900 dark:text-white'
      : 'font-semibold text-white';
    const valueClass = variant === 'embedded'
      ? 'font-medium text-gray-800 dark:text-neutral-100'
      : 'font-medium text-neutral-200';
    const highlightedValueClass = variant === 'embedded'
      ? 'font-semibold text-gray-900 dark:text-white'
      : 'font-semibold text-white';

    return (
      <div className={cn(containerClasses)}>
        <table className="w-full text-sm">
          <tbody>
            {rows.map((entry, index) => {
              const roundedValue = Math.round(entry.value ?? 0);
              const isHighlighted = highlightUserId != null && entry.userId === highlightUserId;
              const name = entry.displayName || 'Player';
              const rowName = isHighlighted ? `(You) ${name}` : name;
              const roundedClasses = index === 0
                ? 'rounded-t-xl'
                : index === rows.length - 1
                  ? 'rounded-b-xl'
                  : '';
              const rank = index + 1;
              const hintsUsed = Math.max(0, Number(entry.hintsUsed ?? 0));
              const penaltyValue = Math.max(0, Math.round(entry.penalty ?? 0));
              return (
                <tr
                  key={`${metric}-${entry.userId}`}
                  className={cn(rowBackground, roundedClasses, index < rows.length - 1 && variant === 'embedded' && 'border-b border-gray-200 dark:border-neutral-700')}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-baseline gap-2">
                      <span className={cn(baseNameClass, isHighlighted && highlightedNameClass)}>{rowName}</span>
                      {hintsUsed > 0 ? (
                        <span className="text-xs text-red-400 font-semibold">{`${hintsUsed} ${hintsUsed === 1 ? 'hint' : 'hints'} = -${penaltyValue}%`}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={cn(valueClass, isHighlighted && highlightedValueClass)}>{`${roundedValue}%`}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLeaderboard = (metric: 'total' | 'when' | 'where', variant: 'default' | 'embedded' = 'default') => {
    if (leaderboards) {
      const rows = (metric === 'total'
        ? leaderboards.total
        : metric === 'when'
          ? leaderboards.when
          : leaderboards.where).map((row) => {
            const penalty = Math.max(0, Math.round(Number((row as any).penalty ?? 0)));
            const hintsUsed = Math.max(0, Math.round(Number((row as any).hintsUsed ?? 0)));
            const value = Math.round(Number(row.value ?? 0));
            return {
              userId: row.userId,
              displayName: row.displayName,
              value,
              hintsUsed,
              penalty,
            };
          });
      return renderLeaderboardTable(rows, leaderboards.currentUserId ?? null, metric, variant);
    }

    if (!hasLeaderboardPeers) return null;

    const entryMap = new Map(leaderboardEntries.map(entry => [entry.userId, entry]));
    const sorted = [...leaderboardEntries].sort((a, b) => {
      const getValue = (entry: LeaderboardEntry) => {
        if (metric === 'when') return entry.whenMetric;
        if (metric === 'where') return entry.whereMetric;
        return entry.totalMetric;
      };
      const valueDiff = getValue(b) - getValue(a);
      if (valueDiff !== 0) return valueDiff;
      const totalDiff = b.totalMetric - a.totalMetric;
      if (totalDiff !== 0) return totalDiff;
      return a.displayName.localeCompare(b.displayName);
    }).map((entry) => {
      const full = entryMap.get(entry.userId) ?? entry;
      const value = metric === 'when'
        ? full.whenMetric
        : metric === 'where'
          ? full.whereMetric
          : full.totalMetric;
      const penalty = metric === 'when'
        ? full.whenPenalty
        : metric === 'where'
          ? full.wherePenalty
          : full.totalPenalty;
      const hintsUsed = metric === 'when'
        ? full.whenHints
        : metric === 'where'
          ? full.whereHints
          : full.totalHints;
      return {
        userId: entry.userId,
        displayName: entry.displayName,
        value,
        hintsUsed,
        penalty,
      };
    });

    return renderLeaderboardTable(sorted, selfUserId, metric, variant);
  };

  const totalLeaderboardContent = roundLeaderboardCard ?? renderLeaderboard('total', 'embedded');

  // Early returns after all hooks above
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">Calculating results...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#000000] text-gray-900 dark:text-gray-100 pb-20">
      <ResultsHeader 
        round={round}
        totalRounds={totalRounds}
        currentRoundXP={netXP}
        currentRoundAccuracy={displayNetAccuracy}
        nextRoundButton={nextRoundButton}
      />
      
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-6">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="flex flex-col items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Your Score</h2>
                  {(xpDebt > 0 || accDebt > 0) && (
                    <div className="text-xs text-red-500 dark:text-red-500 mt-1">(Hint penalties deducted)</div>
                  )}
                </div>
                <div className="flex justify-center items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-1">Accuracy</div>
                    <div className="flex flex-col items-center justify-center">
                      <Badge variant="accuracy" className="text-base flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5" />
                        {displayNetAccuracy.toFixed(0)}%
                      </Badge>
                      {accDebt > 0 && <Badge variant="hint" className={cn("text-xs font-semibold mt-1", {
                        "text-red-500 dark:text-red-500": accDebt > 0
                      })}>(-{accDebt.toFixed(0)}%)</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="text-sm text-muted-foreground mb-1">Experience</div>
                    <div className="flex flex-col items-center justify-center">
                      <Badge variant="xp" className="text-base flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" />
                        +{formatInteger(netXP)} XP
                      </Badge>
                      {xpDebt > 0 && <Badge variant="hint" className={cn("text-xs font-semibold mt-1", {
                        "text-red-500 dark:text-red-500": xpDebt > 0
                      })}>(-{formatInteger(xpDebt)} XP)</Badge>}
                    </div>
                  </div>
                </div>
                
                {/* Show peer avatars and names */}
                {peers && peers.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-muted-foreground mb-2 text-center">Playing with</div>
                    <div className="flex justify-center items-center gap-2 flex-wrap">
                      {peers.map((peer) => (
                        <div key={peer.userId} className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-1">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                            {(peer.displayName || 'P').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            {peer.displayName || 'Player'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {totalLeaderboardContent ? (
                  <div className="w-full mt-6">
                    <div className="w-full rounded-2xl border border-border bg-gray-50/90 p-4 text-left shadow-sm dark:border-neutral-700 dark:bg-neutral-900/40">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Round Leaderboard
                        </h3>
                        {roundLeaderboardHeaderAccessory ? (
                          <div className="flex-shrink-0 text-right">{roundLeaderboardHeaderAccessory}</div>
                        ) : null}
                      </div>
                      <div className="mt-3">
                        {totalLeaderboardContent}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg overflow-hidden">
              <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                <img src={result.imageUrl} alt="Historical reference" className="w-full h-full object-cover" />
              </div>
              <div className="p-4">
                {result.imageTitle && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {result.imageTitle}
                  </h3>
                )}
                <p className="text-muted-foreground text-sm mb-4">{result.imageDescription}</p>

                {/* Confidence and Source Link */}
                <div className="flex justify-between items-center mb-4 text-sm border-t border-b border-gray-200 dark:border-gray-700 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Confidence:</span>
                    <span className="text-muted-foreground">{result.confidence !== undefined ? `${(result.confidence <= 1 ? result.confidence * 100 : result.confidence).toFixed(0)}%` : 'N/A'}</span>
                    {result.source_citation && (
                      <Button 
                        className="px-2 py-1 h-auto text-xs bg-[#444444] text-white hover:bg-[#444444] border border-[#444444] dark:bg-[#444444] dark:text-white dark:hover:bg-[#444444]"
                        onClick={() => setSourceModalOpen(true)}
                      >
                        Source
                      </Button>
                    )}
                  </div>
                  <div>
                    {rateButton}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-normal text-lg text-gray-900 dark:text-gray-100 flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  When
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result?.guessYear == null
                    ? 'No guess'
                    : (result.yearDifference === 0
                        ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                        : `${formatInteger(Math.abs(result.yearDifference))} ${Math.abs(result.yearDifference) === 1 ? 'year' : 'years'} off`)}
                </Badge>
              </div>
              {/* badges moved below progress bar */}
              <div className="text-sm mb-4 mt-4">
                <div className="flex items-center">
                  <span className="text-foreground">Correct: </span>
                  <span className="ml-2 text-history-secondary font-semibold text-lg">{result.eventYear}</span>
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-foreground">Your guess:</span>
                  <span className="ml-2 text-gray-900 dark:text-white">{result?.guessYear == null ? 'No guess' : result.guessYear}</span>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-1.5 rounded-full bg-history-secondary" style={{ width: `${Math.max(0, Math.min(100, Math.round(displayNetTimeAccuracy)))}%` }} />
                </div>
                <span className="sr-only">Time accuracy progress</span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {Math.round(displayNetTimeAccuracy)}%

                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(netXpWhen)} XP

                </Badge>
              </div>
              {renderLeaderboard('when')}
            </div>

            <div className="bg-white dark:bg-[#333333] rounded-2xl shadow-lg p-4">
              <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
                <h2 className="font-normal text-lg text-gray-900 dark:text-gray-100 flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  Where
                </h2>
                <Badge variant="hint" className="text-sm">
                  {result?.distanceKm == null
                    ? 'No guess'
                    : (result.distanceKm === 0
                        ? <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                        : (() => { const d = formatDistanceFromKm(result.distanceKm, distanceUnit); return `${d.value} ${d.unitLabel} away`; })())}
                </Badge>
              </div>
              {/* badges moved below progress bar */}
              <div className="flex items-center mb-2">
                <span className="text-foreground mr-2">Correct:</span>
                <span className="text-history-secondary font-semibold">{result.locationName}</span>
              </div>
              <div className="relative h-64 md:h-80 rounded-lg overflow-hidden mb-4 z-0">
                <MapContainer 
                  center={mapCenter} 
                  zoom={3} 
                  style={{ height: '100%', width: '100%', backgroundColor: '#1f2937' }}
                  zoomControl={false}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url={mapLabelLanguage === 'en' 
                      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
                    attribution={mapLabelLanguage === 'en'
                      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
                  />
                  <ZoomControl position="topright" />
                  <FullscreenControl position="topright" />
                  <FullscreenHandler />
                  {/* Show the green correct icon if the answer is correct */}
                  {result.isCorrect && (
                    <Marker 
                      position={[result.eventLat, result.eventLng]} 
                      icon={correctIcon}
                      zIndexOffset={1000}  // Ensure it's on top
                    >
                      <Popup>Correct Answer</Popup>
                    </Marker>
                  )}
                  
                  {/* Always show the actual location marker */}
                  <Marker 
                    position={[result.eventLat, result.eventLng]} 
                    icon={correctIcon}
                    opacity={result.isCorrect ? 0 : 1}  // Hide if we're showing the correct icon
                  >
                    <Popup>Correct Location</Popup>
                  </Marker>
                  
                  {/* Show user's guess if it exists and isn't exactly on the correct location */}
                  {result.guessLat != null && result.guessLng != null && 
                    (result.guessLat !== result.eventLat || result.guessLng !== result.eventLng) && (
                      <Marker 
                        position={[result.guessLat, result.guessLng]} 
                        icon={userIcon}
                      >
                        <Popup>Your Guess</Popup>
                      </Marker>
                  )}
                  {result.guessLat != null && result.guessLng != null && (
                    <Polyline positions={[[result.guessLat, result.guessLng], [result.eventLat, result.eventLng]]} color="white" dashArray="5, 10" />
                  )}
                  {/* Show peers' guesses */}
                  {peers && peers.length > 0 && (
                    <>
                      {peers.map((p) => (
                        p.guessLat !== null && p.guessLng !== null ? (
                          <React.Fragment key={p.userId}>
                            <Marker position={[p.guessLat, p.guessLng]}>
                              <Popup>
                                <div className="text-sm">
                                  <div className="font-semibold">{p.displayName || 'Peer'}</div>
                                  {p.distanceKm != null && (() => { const d = formatDistanceFromKm(p.distanceKm, distanceUnit); return <div>{d.value} {d.unitLabel} away</div>; })()}
                                  {p.guessYear != null && <div>Year: {p.guessYear}</div>}
                                </div>
                              </Popup>
                            </Marker>
                            <Polyline positions={[[p.guessLat, p.guessLng], [result.eventLat, result.eventLng]]} color="#6EE7B7" opacity={0.7} dashArray="4,8" />
                          </React.Fragment>
                        ) : null
                      ))}
                    </>
                  )}
                  <MapBoundsUpdater bounds={bounds} />
                </MapContainer>
              </div>
              <div className="mt-4">
                <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                  <div className="h-1.5 rounded-full bg-history-secondary" style={{ width: `${Math.max(0, Math.min(100, Math.round(displayNetLocationAccuracy)))}%` }} />
                </div>
                <span className="sr-only">Location accuracy progress</span>
              </div>
              <div className="mt-3 flex justify-between items-center">
                <Badge variant="accuracy" className="text-sm flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {Math.round(displayNetLocationAccuracy)}%

                </Badge>
                <Badge variant="xp" className="text-sm flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  +{formatInteger(netXpWhere)} XP

                </Badge>
              </div>
              {renderLeaderboard('where')}
            </div>

            {result.hintDebts && result.hintDebts.length > 0 && (
              <HintDebtsCard 
                hintDebts={result.hintDebts}
                yearDifference={result.yearDifference ?? null}
                distanceKm={result.distanceKm ?? null}
              />
            )}

            {/* Desktop-only action buttons placed after the Hint Penalties/Debt card */}
            <div className="hidden lg:flex justify-center items-center space-x-4 mt-4">
              {extraButtons}
              {homeButton}
            </div>
          </div>
        </div>

        {/* Mobile/tablet action buttons at bottom; hidden on desktop (Next Round removed) */}
        <div className="mt-8 flex justify-center items-center space-x-4 md:col-span-2 lg:hidden">
          {extraButtons}
          {homeButton}
        </div>
      </div>

      {earnedBadge && (
        <BadgeEarnedPopup 
          badge={earnedBadge} 
          onClose={handleBadgePopupClose} 
        />
      )}

      <SourceModal 
        isOpen={isSourceModalOpen} 
        onClose={() => setSourceModalOpen(false)} 
        url={result.source_citation || ''} 
      />
    </div>
  );
};

export default ResultsLayout2;
