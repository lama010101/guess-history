import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation, Navigate } from 'react-router-dom';
import { Loader, ChevronRight, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarFrameGradient } from '@/utils/avatarGradient';
import ResultsLayout2 from '@/components/layouts/ResultsLayout2';
import ImageRatingModal from '@/components/rating/ImageRatingModal';
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
import { useCompeteRoundResult } from '@/hooks/results/useCompeteRoundResult';
import { useCompetePeers } from '@/hooks/results/useCompetePeers';
import type { PeerRoundRow } from '@/hooks/useRoundPeers';
import { useCompeteRoundLeaderboards } from '@/hooks/useCompeteRoundLeaderboards';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useGame } from '@/contexts/GameContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { Badge } from '@/utils/badges/types';
import { awardRoundBadges } from '@/utils/badges/badgeService';
import { supabase } from '@/integrations/supabase/client';
import { useLobbyChat } from '@/hooks/useLobbyChat';
import { useSyncRoundScores } from '@/hooks/useSyncRoundScores';
import { usePeerProfileCacheStore, resolvePeerProfile, makePeerNameKey } from '@/store/peerProfileCacheStore';
import { fetchAvatarUrlsForUserIds } from '@/utils/profile/avatarLoader';

const getInitial = (value?: string | null) => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : '?';
};

const CompeteSyncRoundResultsPage: React.FC = () => {
  const { roomId, roundNumber } = useParams<{ roomId: string; roundNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { images, hydrateRoomImages, syncRoomId } = useGame();
  const modeBasePath = useMemo(() => {
    const path = location.pathname;
    const idx = path.indexOf('/game/');
    return idx > 0 ? path.slice(0, idx) : '/compete/sync';
  }, [location.pathname]);

  const oneBasedRound = Math.max(1, Number(roundNumber || 1));
  const { isLoading, error, contextResult, currentImage, hintDebts, playerSummary } = useCompeteRoundResult(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const { peers, refresh: refreshPeers } = useCompetePeers(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const { entries: snapshotEntries } = useSyncRoundScores(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const mergePeerProfiles = usePeerProfileCacheStore((state) => state.mergeEntries);
  const peerProfileCache = usePeerProfileCacheStore((state) => state.cache);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});

  const resolveCachedProfile = useCallback((userId?: string | null, displayName?: string | null) => {
    const entry = resolvePeerProfile(userId, displayName);
    if (entry) {
      return entry;
    }
    if (userId && userId.trim().length > 0) {
      const byId = peerProfileCache[userId.trim()];
      if (byId) return byId;
    }
    const nameKey = makePeerNameKey(displayName);
    if (nameKey) {
      const byName = peerProfileCache[nameKey];
      if (byName) return byName;
    }
    return null;
  }, [peerProfileCache]);
  const leaderboard = useCompeteRoundLeaderboards(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);

  useEffect(() => {
    document.body.classList.add('mode-compete');
    return () => {
      document.body.classList.remove('mode-compete');
    };
  }, []);

  const combinedPeerState = useMemo(() => {
    const leaderboardAvatarEntries: Array<[string, string | null]> = [
      ...(leaderboard?.total || []).map((row) => [row.userId, row.avatarUrl ?? null]),
      ...(leaderboard?.when || []).map((row) => [row.userId, row.avatarUrl ?? null]),
      ...(leaderboard?.where || []).map((row) => [row.userId, row.avatarUrl ?? null]),
    ];
    const avatarById = new Map<string, string | null>(leaderboardAvatarEntries);

    const mergePayload: Record<string, { displayName?: string | null; avatarUrl?: string | null }> = {};
    const mergedMap = new Map<string, PeerRoundRow>();
    const orderedPeers: PeerRoundRow[] = [];

    const applyCachePayload = (userId?: string | null, displayName?: string | null, avatarUrl?: string | null) => {
      const cacheKeys: string[] = [];
      if (userId && userId.trim().length > 0) {
        cacheKeys.push(userId.trim());
      }
      const nameKey = makePeerNameKey(displayName);
      if (nameKey) cacheKeys.push(nameKey);

      cacheKeys.forEach((key) => {
        if (!key) return;
        const existing = peerProfileCache[key];
        const nextDisplay = displayName && displayName.trim().length > 0
          ? displayName.trim()
          : existing?.displayName || '';
        const nextAvatar = avatarUrl ?? existing?.avatarUrl ?? null;
        if (nextDisplay === '' && nextAvatar === null) return;
        if (existing && existing.displayName === nextDisplay && existing.avatarUrl === nextAvatar) {
          return;
        }
        mergePayload[key] = {
          displayName: nextDisplay,
          avatarUrl: nextAvatar,
        };
      });
    };

    const resolveAvatar = (userId?: string | null, primary?: string | null) => {
      const uid = userId && userId.trim().length > 0 ? userId.trim() : null;
      const explicit = uid ? avatarUrls[uid] ?? null : null;
      const resolved = resolveCachedProfile(uid, primary)?.avatarUrl ?? null;
      const leaderboardAvatar = uid ? avatarById.get(uid) ?? null : null;
      const candidates = [primary, explicit, leaderboardAvatar, resolved];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
      return null;
    };

    const mapPeer = (peer: PeerRoundRow) => {
      const resolved = resolveCachedProfile(peer.userId, peer.displayName);
      const displayName = peer.displayName && peer.displayName.trim().length > 0
        ? peer.displayName.trim()
        : (resolved?.displayName ?? 'Player');
      const avatarUrl = resolveAvatar(peer.userId, peer.avatarUrl);

      applyCachePayload(peer.userId, displayName, avatarUrl);

      return {
        ...peer,
        displayName,
        avatarUrl,
        submitted: peer.submitted ?? false,
      } satisfies PeerRoundRow;
    };

    const enrichWithSnapshot = (existing: PeerRoundRow, snap: SyncRoundScoreEntry): PeerRoundRow => {
      const accuracy = Math.round((Number(snap.timeAccuracy ?? 0) + Number(snap.locationAccuracy ?? 0)) / 2);
      return {
        ...existing,
        score: existing.score ?? 0,
        accuracy: Number.isFinite(existing.accuracy) && existing.accuracy !== 0 ? existing.accuracy : accuracy,
        xpTotal: existing.xpTotal ?? snap.xpTotal ?? 0,
        xpDebt: existing.xpDebt ?? snap.xpDebt ?? 0,
        accDebt: existing.accDebt ?? snap.accDebt ?? 0,
        locationAccuracy: existing.locationAccuracy ?? snap.locationAccuracy ?? null,
        timeAccuracy: existing.timeAccuracy ?? snap.timeAccuracy ?? null,
        distanceKm: existing.distanceKm ?? snap.distanceKm ?? null,
        guessYear: existing.guessYear ?? snap.guessYear ?? null,
        guessLat: existing.guessLat ?? snap.guessLat ?? null,
        guessLng: existing.guessLng ?? snap.guessLng ?? null,
        submitted: existing.submitted || true,
        hintsUsed: existing.hintsUsed ?? snap.hintsUsed ?? null,
      };
    };

    const buildFromSnapshot = (snap: SyncRoundScoreEntry): PeerRoundRow => {
      const cached = resolveCachedProfile(snap.userId, snap.displayName);
      const displayName = snap.displayName && snap.displayName.trim().length > 0
        ? snap.displayName.trim()
        : (cached?.displayName ?? 'Player');
      const avatarUrl = resolveAvatar(snap.userId, avatarById.get(snap.userId) ?? null);

      applyCachePayload(snap.userId, displayName, avatarUrl);

      return {
        userId: snap.userId,
        displayName,
        avatarUrl,
        score: Math.max(0, Math.round(Number(snap.xpTotal ?? 0))),
        accuracy: Math.round((Number(snap.timeAccuracy ?? 0) + Number(snap.locationAccuracy ?? 0)) / 2),
        xpTotal: snap.xpTotal ?? 0,
        xpDebt: snap.xpDebt ?? 0,
        whenXpDebt: 0,
        whereXpDebt: 0,
        accDebt: snap.accDebt ?? 0,
        whenAccDebt: 0,
        whereAccDebt: 0,
        xpWhere: null,
        xpWhen: null,
        locationAccuracy: snap.locationAccuracy ?? null,
        timeAccuracy: snap.timeAccuracy ?? null,
        distanceKm: snap.distanceKm ?? null,
        guessYear: snap.guessYear ?? null,
        guessLat: snap.guessLat ?? null,
        guessLng: snap.guessLng ?? null,
        actualLat: null,
        actualLng: null,
        submitted: true,
        ready: false,
        hintsUsed: snap.hintsUsed ?? null,
        whenHints: null,
        whereHints: null,
        netAccuracy: null,
      } satisfies PeerRoundRow;
    };

    (peers || []).forEach((peer) => {
      const mapped = mapPeer(peer);
      mergedMap.set(peer.userId, mapped);
      orderedPeers.push(mapped);
    });

    const leaderboardUserIds = new Set<string>([...avatarById.keys()]);

    (snapshotEntries || []).forEach((snap) => {
      if (!snap?.userId) return;
      leaderboardUserIds.add(snap.userId);
      if (mergedMap.has(snap.userId)) {
        const enriched = enrichWithSnapshot(mergedMap.get(snap.userId)!, snap);
        mergedMap.set(snap.userId, enriched);
        const idx = orderedPeers.findIndex((peer) => peer.userId === snap.userId);
        if (idx >= 0) {
          orderedPeers[idx] = enriched;
        }
        return;
      }

      const mapped = buildFromSnapshot(snap);
      mergedMap.set(snap.userId, mapped);
      orderedPeers.push(mapped);
    });

    (leaderboard?.total || []).forEach((row) => leaderboardUserIds.add(row.userId));
    (leaderboard?.when || []).forEach((row) => leaderboardUserIds.add(row.userId));
    (leaderboard?.where || []).forEach((row) => leaderboardUserIds.add(row.userId));

    leaderboardUserIds.forEach((userId) => {
      if (!userId || mergedMap.has(userId)) return;
      const row = (leaderboard?.total || []).find((entry) => entry.userId === userId)
        || (leaderboard?.when || []).find((entry) => entry.userId === userId)
        || (leaderboard?.where || []).find((entry) => entry.userId === userId);
      if (!row) return;
      const cached = resolveCachedProfile(userId, row.displayName);
      const displayName = row.displayName && row.displayName.trim().length > 0
        ? row.displayName.trim()
        : (cached?.displayName ?? 'Player');
      const avatarUrl = resolveAvatar(userId, row.avatarUrl ?? null);

      applyCachePayload(userId, displayName, avatarUrl);

      const placeholder: PeerRoundRow = {
        userId,
        displayName,
        avatarUrl,
        score: 0,
        accuracy: Math.round(Number(row.value ?? 0)),
        xpTotal: row.xpTotal ?? 0,
        xpDebt: row.xpDebt ?? 0,
        whenXpDebt: 0,
        whereXpDebt: 0,
        accDebt: row.accDebt ?? 0,
        whenAccDebt: 0,
        whereAccDebt: 0,
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
        submitted: true,
        ready: false,
        hintsUsed: row.hintsUsed ?? null,
        whenHints: null,
        whereHints: null,
        netAccuracy: Number(row.value ?? 0),
      };

      mergedMap.set(userId, placeholder);
      orderedPeers.push(placeholder);
    });

    const normalizedPeers = orderedPeers.map((peer) => {
      const existing = mergedMap.get(peer.userId) ?? peer;
      return existing;
    });

    return { peers: normalizedPeers, mergePayload };
  }, [
    peers,
    snapshotEntries,
    leaderboard.total,
    leaderboard.when,
    leaderboard.where,
    peerProfileCache,
    resolveCachedProfile,
    avatarUrls,
  ]);

  const combinedPeers = combinedPeerState.peers;
  const combinedPeerCachePayload = combinedPeerState.mergePayload;

  useEffect(() => {
    if (!combinedPeerCachePayload || Object.keys(combinedPeerCachePayload).length === 0) {
      return;
    }
    mergePeerProfiles(combinedPeerCachePayload);
  }, [combinedPeerCachePayload, mergePeerProfiles]);

  useEffect(() => {
    if (!combinedPeers || combinedPeers.length === 0) return;
    const missingUserIds = Array.from(new Set(
      combinedPeers
        .map((peer) => (peer.userId && peer.userId.trim().length > 0 ? peer.userId.trim() : null))
        .filter((id): id is string => !!id && !(id in avatarUrls)),
    ));
    if (missingUserIds.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const fetched = await fetchAvatarUrlsForUserIds(missingUserIds);
        if (cancelled) return;

        const mergedMap: Record<string, string | null> = {};
        missingUserIds.forEach((id) => {
          const resolved = Object.prototype.hasOwnProperty.call(fetched, id) ? fetched[id] : null;
          mergedMap[id] = resolved ?? null;
        });

        if (Object.keys(mergedMap).length > 0) {
          setAvatarUrls((prev) => ({ ...prev, ...mergedMap }));

          const payload: Record<string, { displayName?: string | null; avatarUrl?: string | null }> = {};
          combinedPeers.forEach((peer) => {
            const uid = peer.userId && peer.userId.trim().length > 0 ? peer.userId.trim() : null;
            if (!uid || !(uid in mergedMap)) return;
            const avatarUrl = mergedMap[uid];
            const cached = resolveCachedProfile(uid, peer.displayName);
            const displayName = peer.displayName && peer.displayName.trim().length > 0
              ? peer.displayName
              : (cached?.displayName ?? null);
            payload[uid] = {
              displayName: displayName ?? undefined,
              avatarUrl,
            };
          });

          if (Object.keys(payload).length > 0) {
            mergePeerProfiles(payload);
          }
        }
      } catch (err) {
        console.error('[CompeteSyncRoundResultsPage] Failed to fetch peer avatars', err);
        setAvatarUrls((prev) => ({
          ...prev,
          ...Object.fromEntries(missingUserIds.map((id) => [id, prev[id] ?? null])),
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [combinedPeers, avatarUrls, mergePeerProfiles, resolveCachedProfile]);

  const layoutLeaderboards = useMemo(() => {
    const mapper = (rows: typeof leaderboard.total) =>
      [...rows]
        .map((row) => {
          const cached = resolveCachedProfile(row.userId, row.displayName);
          const displayName = row.displayName && row.displayName.trim().length > 0
            ? row.displayName
            : (cached?.displayName ?? 'Player');
          const avatarUrl = row.avatarUrl ?? cached?.avatarUrl ?? null;
          return {
            userId: row.userId,
            displayName,
            value: row.value,
            hintsUsed: row.hintsUsed,
            penalty: row.penalty ?? (row.accDebt ?? 0),
            accDebt: (row as any).accDebt ?? 0,
            avatarUrl,
          };
        })
        .sort((a, b) => {
          const valueDiff = (b.value ?? 0) - (a.value ?? 0);
          if (valueDiff !== 0) return valueDiff;
          return a.displayName.localeCompare(b.displayName);
        });

    return {
      total: mapper(leaderboard.total),
      when: mapper(leaderboard.when),
      where: mapper(leaderboard.where),
      currentUserId: leaderboard.currentUserId,
    };
  }, [leaderboard.total, leaderboard.when, leaderboard.where, leaderboard.currentUserId, resolveCachedProfile]);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const awardsSubmittedRef = useRef(false);
  const allSubmittedRef = useRef(false);
  const [forceRefreshingLeaderboards, setForceRefreshingLeaderboards] = useState(false);
  const lastSubmittedCountRef = useRef(0);
  const [nextRoundCountdown, setNextRoundCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const autoAdvanceRef = useRef(false);
  const navigationTriggeredRef = useRef(false);
  const hasConfirmedAdvanceRef = useRef(false);
  const [hasConfirmedAdvance, setHasConfirmedAdvance] = useState(false);
  const [resultsReadySummary, setResultsReadySummary] = useState<{ readyCount: number; totalPlayers: number; roundNumber: number }>({ readyCount: 0, totalPlayers: 0, roundNumber: oneBasedRound });
  const [pendingReadyAck, setPendingReadyAck] = useState(false);
  const [localFallbackReady, setLocalFallbackReady] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);

  const refreshLeaderboards = leaderboard.refresh;

  const layoutResult = useMemo(() => {
    if (!playerSummary || !contextResult || !currentImage) return null;
    const derivedAccuracy = Math.round((Math.max(0, playerSummary.timeAccuracy) + Math.max(0, playerSummary.locationAccuracy)) / 2);

    const cachedSelf = resolveCachedProfile(user?.id ?? null, profile?.display_name ?? user?.user_metadata?.display_name ?? null);
    const selfAvatarUrl = cachedSelf?.avatarUrl
      ?? profile?.avatar_image_url
      ?? profile?.avatar_url
      ?? (typeof user?.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : null);

    return {
      imageId: currentImage.id,
      eventLat: playerSummary.eventLat,
      eventLng: playerSummary.eventLng,
      locationName: playerSummary.locationName,
      timeDifferenceDesc: playerSummary.timeDifferenceDesc,
      guessLat: playerSummary.guessLat,
      guessLng: playerSummary.guessLng,
      distanceKm: playerSummary.distanceKm,
      locationAccuracy: playerSummary.locationAccuracy,
      accuracy: derivedAccuracy,
      guessYear: playerSummary.guessYear,
      eventYear: playerSummary.eventYear,
      yearDifference: playerSummary.guessYear == null ? null : Math.abs(playerSummary.eventYear - playerSummary.guessYear),
      timeAccuracy: playerSummary.timeAccuracy,
      xpTotal: playerSummary.xpTotal,
      xpWhere: playerSummary.xpWhere,
      xpWhen: playerSummary.xpWhen,
      hintDebts,
      imageTitle: playerSummary.imageTitle,
      imageDescription: playerSummary.imageDescription,
      imageUrl: playerSummary.imageUrl,
      source_citation: playerSummary.sourceCitation,
      confidence: playerSummary.confidence ?? 0,
      earnedBadges,
      isCorrect: playerSummary.isCorrect,
      avatarUrl: selfAvatarUrl,
    };
  }, [playerSummary, contextResult, currentImage, hintDebts, earnedBadges, profile?.avatar_image_url, profile?.avatar_url, profile?.display_name, user?.id, user?.user_metadata, resolveCachedProfile]);

  useEffect(() => {
    if (!roomId) return;
    syncRoomId(roomId);
    if (!images || images.length === 0) {
      hydrateRoomImages(roomId);
    }
  }, [roomId, images, hydrateRoomImages, syncRoomId]);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result = await fetchUserProfile(user.id);
        if (!cancelled) {
          setProfile(result);
        }
      } catch (err) {
        console.error('[CompeteSyncRoundResultsPage] Failed to load profile', err);
        if (!cancelled) setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!contextResult || !currentImage || !roomId) return;
    if (awardsSubmittedRef.current) return;

    (async () => {
      try {
        let { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          const { data, error: anonError } = await supabase.auth.signInAnonymously();
          if (anonError) throw anonError;
          authUser = data?.user ?? null;
        }
        if (!authUser) return;

        const actualYear = currentImage.year || 1900;
        const guessYear = contextResult.guessYear ?? actualYear;
        const yearDifference = Math.abs(actualYear - guessYear);
        const yearAccuracy = yearDifference === 0 ? 100 : Math.max(0, 100 - (yearDifference / 50) * 100);

        const maxDistKm = 2000;
        const distanceKm = contextResult.distanceKm ?? maxDistKm;
        const locationAccuracy = Math.round(100 * (1 - Math.min(distanceKm, maxDistKm) / maxDistKm));

        const badges = await awardRoundBadges(
          authUser.id,
          roomId,
          oneBasedRound - 1,
          yearAccuracy,
          locationAccuracy,
          guessYear,
          actualYear
        );

        awardsSubmittedRef.current = true;
        if (badges.length > 0) {
          setEarnedBadges(badges);
          badges.forEach((badge) => {
            toast({ title: `Badge Earned: ${badge.name}`, description: badge.description, duration: 5000 });
          });
        }
      } catch (badgeError) {
        console.error('[CompeteSyncRoundResultsPage] Failed to award badges', badgeError);
      }
    })();
  }, [contextResult, currentImage, roomId, oneBasedRound, toast]);

  const displayName = useMemo(() => {
    const derived = profile?.display_name || user?.user_metadata?.display_name || user?.email || 'Player';
    return (derived ?? 'Player').toString().trim() || 'Player';
  }, [profile?.display_name, user?.user_metadata?.display_name, user?.email]);

  const sendResultsReady = useRef<(ready: boolean) => boolean>(() => false);

  const handleResultsReady = useCallback((payload: { roundNumber: number; readyCount: number; totalPlayers: number }) => {
    if (payload.roundNumber !== oneBasedRound) return;
    setResultsReadySummary({ readyCount: payload.readyCount, totalPlayers: payload.totalPlayers, roundNumber: payload.roundNumber });
    setPendingReadyAck(false);
    setLocalFallbackReady(false);
  }, [oneBasedRound]);

  const { sendPayload: sendLobbyPayload, resetChat } = useLobbyChat({
    roomCode: roomId ?? null,
    displayName,
    userId: user?.id,
    enabled: Boolean(roomId),
    onResultsReady: handleResultsReady,
  });

  useEffect(() => resetChat, [resetChat]);

  sendResultsReady.current = (ready: boolean) => {
    if (!roomId || !sendLobbyPayload) return false;
    const success = sendLobbyPayload({ type: 'results-ready', roundNumber: oneBasedRound, ready });
    if (!success) {
      console.warn('[CompeteSyncRoundResultsPage] Failed to send results-ready payload');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!roomId || !layoutResult) {
      allSubmittedRef.current = false;
      lastSubmittedCountRef.current = 0;
      if (forceRefreshingLeaderboards) setForceRefreshingLeaderboards(false);
      return;
    }

    const roster = combinedPeers || [];
    if (roster.length === 0) {
      allSubmittedRef.current = false;
      lastSubmittedCountRef.current = 0;
      if (forceRefreshingLeaderboards) setForceRefreshingLeaderboards(false);
      return;
    }

    const submittedCount = roster.filter((peer) => peer.submitted).length;
    const totalParticipants = roster.length;

    if (submittedCount < totalParticipants) {
      allSubmittedRef.current = false;
      lastSubmittedCountRef.current = submittedCount;
      if (forceRefreshingLeaderboards) setForceRefreshingLeaderboards(false);
      return;
    }

    if (submittedCount > 0 && submittedCount !== lastSubmittedCountRef.current) {
      allSubmittedRef.current = true;
      lastSubmittedCountRef.current = submittedCount;
      setForceRefreshingLeaderboards(true);
      (async () => {
        await Promise.allSettled([
          refreshLeaderboards(),
          refreshPeers(),
        ]);
        setForceRefreshingLeaderboards(false);
      })();
    }
  }, [combinedPeers, roomId, layoutResult, refreshLeaderboards, refreshPeers, forceRefreshingLeaderboards]);

  const totalRounds = images.length || 5;
  const isLastRound = oneBasedRound === totalRounds;

  const handleNavigateHome = () => {
    navigate('/home');
  };

  const confirmNavigation = (navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  };

  const handleNext = useCallback(() => {
    if (navigating || navigationTriggeredRef.current) return;
    navigationTriggeredRef.current = true;
    if (!roomId) {
      toast({ title: 'Error', description: 'Game ID (Room ID) not found', variant: 'destructive' });
      return;
    }
    setNavigating(true);
    setNextRoundCountdown(null);
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    if (isLastRound) {
      navigate(`${modeBasePath}/game/room/${roomId}/final`);
    } else {
      navigate(`${modeBasePath}/game/room/${roomId}/round/${oneBasedRound + 1}`);
    }
  }, [navigating, roomId, toast, oneBasedRound, totalRounds, navigate, modeBasePath]);

  const expectedParticipants = useMemo(() => {
    const roundMatches = resultsReadySummary.roundNumber === oneBasedRound;
    const fromServer = roundMatches ? resultsReadySummary.totalPlayers : 0;
    if (fromServer > 0) {
      return fromServer;
    }

    const fromPeers = combinedPeers.length;
    const fromSubmissions = allSubmittedRef.current ? lastSubmittedCountRef.current : 0;
    return Math.max(fromPeers || 0, fromSubmissions || 0);
  }, [resultsReadySummary.roundNumber, resultsReadySummary.totalPlayers, oneBasedRound, combinedPeers.length]);

  const serverReadyCount = resultsReadySummary.roundNumber === oneBasedRound ? resultsReadySummary.readyCount : 0;
  const effectiveReadyCount = serverReadyCount + (localFallbackReady ? 1 : 0);
  const allPlayersReady = expectedParticipants > 0 && effectiveReadyCount >= expectedParticipants;

  const handleReadyClick = useCallback(() => {
    if (hasConfirmedAdvanceRef.current) return;
    const sent = sendResultsReady.current(true);
    if (!sent) {
      toast({ title: 'Connection issue', description: 'Failed to signal readiness. Proceeding without sync.', variant: 'destructive' });
      hasConfirmedAdvanceRef.current = true;
      setHasConfirmedAdvance(true);
      setPendingReadyAck(false);
      setLocalFallbackReady(true);
      autoAdvanceRef.current = true;
      setPendingAdvance(true);
      return;
    }
    hasConfirmedAdvanceRef.current = true;
    setHasConfirmedAdvance(true);
    setPendingReadyAck(true);
    setLocalFallbackReady(false);
  }, [toast, handleNext]);

  useEffect(() => {
    if (!allPlayersReady) return;
    if (!hasConfirmedAdvanceRef.current) return;
    setPendingAdvance(true);
  }, [allPlayersReady]);

  // Fallback: if countdown hits 0 and server ack doesn’t arrive, auto-advance after a short delay
  useEffect(() => {
    if (nextRoundCountdown !== 0) return;
    if (!hasConfirmedAdvanceRef.current) return;
    if (navigationTriggeredRef.current) return;
    // If server didn't ack within 3s after countdown reached 0, advance anyway
    const t = window.setTimeout(() => {
      setPendingAdvance(true);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [nextRoundCountdown]);

  useEffect(() => {
    if (!pendingAdvance) return;
    setPendingAdvance(false);
    handleNext();
  }, [pendingAdvance, handleNext]);

  useEffect(() => {
    if (!layoutResult) return;

    setNextRoundCountdown(30);
    autoAdvanceRef.current = false;

    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    countdownTimerRef.current = window.setInterval(() => {
      let shouldForceAdvance = false;
      setNextRoundCountdown((prev) => {
        if (prev == null) return null;
        if (prev <= 1) {
          if (!hasConfirmedAdvanceRef.current) {
            const sent = sendResultsReady.current(true);
            if (sent) {
              hasConfirmedAdvanceRef.current = true;
              setHasConfirmedAdvance(true);
              setPendingReadyAck(true);
              setLocalFallbackReady(false);
            } else {
              hasConfirmedAdvanceRef.current = true;
              setHasConfirmedAdvance(true);
              setPendingReadyAck(false);
              setLocalFallbackReady(true);
              shouldForceAdvance = true;
            }
          } else if (!pendingReadyAck) {
            setLocalFallbackReady(false);
          }
          autoAdvanceRef.current = true;
          return 0;
        }
        return prev - 1;
      });
      if (shouldForceAdvance) {
        setPendingAdvance(true);
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [layoutResult, handleNext]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    navigationTriggeredRef.current = false;
    hasConfirmedAdvanceRef.current = false;
    setHasConfirmedAdvance(false);
    setPendingReadyAck(false);
    setLocalFallbackReady(false);
    setPendingAdvance(false);
    setResultsReadySummary({ readyCount: 0, totalPlayers: 0, roundNumber: oneBasedRound });
  }, [oneBasedRound]);

  if (!isLoading && !error && (!roomId || !contextResult || !currentImage)) {
    return <Navigate to={`${modeBasePath}/game/room/${roomId ?? ''}/round/${oneBasedRound}`} replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 p-4 bg-background rounded shadow">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <h2 className="text-lg font-semibold text-history-primary">Loading Compete results…</h2>
        </div>
      </div>
    );
  }

  if (error || !layoutResult) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-4 bg-background rounded shadow space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Unable to load round results</h2>
          <p className="text-muted-foreground">{error ?? 'Results are still being prepared. Try again shortly.'}</p>
          <Button onClick={() => confirmNavigation(handleNavigateHome)}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResultsLayout2
        round={oneBasedRound}
        totalRounds={images.length}
        loading={navigating}
        error={null}
        result={layoutResult}
        avatarUrl={profile?.avatar_image_url || profile?.avatar_url || '/assets/default-avatar.png'}
        peers={combinedPeers.filter((peer) => !user || peer.userId !== user.id)}
        currentUserDisplayName={profile?.display_name || user?.user_metadata?.display_name || 'You'}
        leaderboards={layoutLeaderboards}
        roundLeaderboardHeaderAccessory={(
          <div className="flex flex-col items-end text-right gap-0.5">
            {leaderboard.isLoading && <span className="text-xs text-muted-foreground">Updating…</span>}
            {forceRefreshingLeaderboards && <span className="text-[11px] text-muted-foreground/80">Finalizing scores…</span>}
          </div>
        )}
        nextRoundButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReadyClick}
              disabled={navigating || hasConfirmedAdvance}
              className="rounded-xl bg-orange-500 text-white font-semibold text-sm px-5 py-2 shadow-lg hover:bg-orange-500 flex items-center gap-2"
            >
              {typeof nextRoundCountdown === 'number' && nextRoundCountdown >= 0 && (
                <span className="text-xs font-semibold bg-black/30 rounded-full px-2 py-0.5">
                  {`${nextRoundCountdown}s`}
                </span>
              )}
              <span>{hasConfirmedAdvance ? 'Ready' : (oneBasedRound === totalRounds ? 'Final Results' : 'Next Round')}</span>
              {navigating ? <Loader className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            {hasConfirmedAdvance && !allPlayersReady && (
              <span className="text-xs text-neutral-300">
                Waiting for players…
                {expectedParticipants > 0 ? ` (${effectiveReadyCount}/${expectedParticipants})` : pendingReadyAck ? ' (…)' : ''}
              </span>
            )}
          </div>
        }
        homeButton={
          <Button
            variant="outline"
            onClick={() => confirmNavigation(handleNavigateHome)}
            className="h-12 w-12 rounded-full text-black shadow-md border-none bg-white hover:bg-gray-100"
            aria-label="Go Home"
          >
            <Home size={20} />
          </Button>
        }
        extraButtons={null}
        rateButton={
          user && currentImage && roomId ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRatingModal(true)}
              className="px-2 py-1 h-auto text-xs rounded-md bg-[#444444] text-white hover:bg[#444444] border border-[#444444]"
              aria-label="Rate Image"
            >
              Rate
            </Button>
          ) : null
        }
      />

      <ConfirmNavigationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => {
          setShowConfirmDialog(false);
          pendingNavigation?.();
        }}
      />

      {user && currentImage && roomId && (
        <ImageRatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          imageId={currentImage.id}
        />
      )}
    </>
  );
};

export default CompeteSyncRoundResultsPage;
