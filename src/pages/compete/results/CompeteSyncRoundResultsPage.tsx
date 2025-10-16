import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader, ChevronRight, Home, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ResultsLayout2 from '@/components/layouts/ResultsLayout2';
import ImageRatingModal from '@/components/rating/ImageRatingModal';
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
import { useCompeteRoundResult } from '@/hooks/results/useCompeteRoundResult';
import { useCompetePeers } from '@/hooks/results/useCompetePeers';
import { useCompeteRoundLeaderboards } from '@/hooks/useCompeteRoundLeaderboards';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useGame } from '@/contexts/GameContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { Badge } from '@/utils/badges/types';
import { awardRoundBadges } from '@/utils/badges/badgeService';
import { supabase } from '@/integrations/supabase/client';
import { useLobbyChat } from '@/hooks/useLobbyChat';

const CompeteSyncRoundResultsPage: React.FC = () => {
  const { roomId, roundNumber } = useParams<{ roomId: string; roundNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { images, hydrateRoomImages, syncRoomId } = useGame();

  const oneBasedRound = Math.max(1, Number(roundNumber || 1));
  const { isLoading, error, contextResult, currentImage, hintDebts, playerSummary } = useCompeteRoundResult(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const { peers, refresh: refreshPeers } = useCompetePeers(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const leaderboard = useCompeteRoundLeaderboards(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);

  useEffect(() => {
    document.body.classList.add('mode-compete');
    return () => {
      document.body.classList.remove('mode-compete');
    };
  }, []);

  const layoutLeaderboards = useMemo(() => {
    return {
      total: leaderboard.total.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        value: row.value,
      })),
      when: leaderboard.when.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        value: row.value,
      })),
      where: leaderboard.where.map((row) => ({
        userId: row.userId,
        displayName: row.displayName,
        value: row.value,
      })),
      currentUserId: leaderboard.currentUserId,
    };
  }, [leaderboard.total, leaderboard.when, leaderboard.where, leaderboard.currentUserId]);

  const leaderboardSourceLabel = useMemo(() => {
    switch (leaderboard.source) {
      case 'snapshots':
        return 'Scores synced from Supabase snapshots';
      case 'legacy':
        return 'Scores based on live peer telemetry';
      case 'mixed':
        return 'Scores blended from snapshots and peer telemetry';
      case 'empty':
      default:
        return null;
    }
  }, [leaderboard.source]);

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
    };
  }, [playerSummary, contextResult, currentImage, hintDebts, earnedBadges]);

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

  const { sendPayload: sendLobbyPayload } = useLobbyChat({
    roomCode: roomId ?? null,
    displayName,
    userId: user?.id,
    enabled: Boolean(roomId),
    onResultsReady: handleResultsReady,
  });

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

    const roster = peers || [];
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
  }, [peers, roomId, layoutResult, refreshLeaderboards, refreshPeers, forceRefreshingLeaderboards]);

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
      navigate(`/compete/sync/game/room/${roomId}/final`);
    } else {
      navigate(`/compete/sync/game/room/${roomId}/round/${oneBasedRound + 1}`);
    }
  }, [navigating, roomId, toast, oneBasedRound, totalRounds, navigate]);

  const expectedParticipants = useMemo(() => {
    const roundMatches = resultsReadySummary.roundNumber === oneBasedRound;
    const fromServer = roundMatches ? resultsReadySummary.totalPlayers : 0;
    const fromPeers = peers.length;
    const fromSubmissions = allSubmittedRef.current ? lastSubmittedCountRef.current : 0;
    return Math.max(fromServer || 0, fromPeers || 0, fromSubmissions || 0);
  }, [resultsReadySummary.roundNumber, resultsReadySummary.totalPlayers, oneBasedRound, peers.length]);

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
    if (allPlayersReady) {
      autoAdvanceRef.current = true;
      setPendingAdvance(true);
    }
  }, [allPlayersReady, handleNext]);

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
            }
          } else if (!pendingReadyAck) {
            setLocalFallbackReady(false);
          }
          autoAdvanceRef.current = true;
          setPendingAdvance(true);
          return 0;
        }
        return prev - 1;
      });
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
        peers={peers.filter((peer) => !user || peer.userId !== user.id)}
        currentUserDisplayName={profile?.display_name || user?.user_metadata?.display_name || 'You'}
        leaderboards={layoutLeaderboards}
        roundLeaderboardCard={(
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Round Leaderboard</h2>
              <div className="flex flex-col items-end text-right">
                {leaderboard.isLoading && <span className="text-sm text-neutral-400">Updating…</span>}
                {forceRefreshingLeaderboards && <span className="text-xs text-neutral-300">Finalizing scores…</span>}
              </div>
            </div>
            {leaderboardSourceLabel && !forceRefreshingLeaderboards && (
              <div className="text-xs text-neutral-400 mb-2">{leaderboardSourceLabel}</div>
            )}
            {leaderboard.error ? (
              <div className="text-sm text-red-300">{leaderboard.error}</div>
            ) : leaderboard.total.length === 0 ? (
              <div className="text-sm text-neutral-300">Waiting for players to finish this round…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {leaderboard.total.map((row, index) => {
                      const isCurrent = leaderboard.currentUserId != null && row.userId === leaderboard.currentUserId;
                      const displayName = row.displayName || 'Player';
                      const nameWithYou = isCurrent ? `(You) ${displayName}` : displayName;
                      const roundedClasses = index === 0
                        ? 'rounded-t-lg'
                        : index === leaderboard.total.length - 1
                          ? 'rounded-b-lg'
                          : '';
                      const textClasses = isCurrent ? 'font-semibold text-white' : 'text-neutral-200';
                      return (
                        <tr
                          key={`inline:${row.userId}`}
                          className={`bg-neutral-800/70 ${roundedClasses}`.trim()}
                        >
                          <td className={`py-2 pr-2 ${textClasses}`}>
                            {nameWithYou}
                          </td>
                          <td className={`py-2 pr-2 text-right ${isCurrent ? 'font-semibold text-white' : 'font-medium text-neutral-200'}`}>
                            {Math.round(row.value)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
              <span>{hasConfirmedAdvance ? 'Ready' : (oneBasedRound === totalRounds ? 'Finish Game' : 'Next Round')}</span>
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
