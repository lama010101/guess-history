import React, { useMemo, useRef, useState, useEffect } from 'react';
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

const CompeteSyncRoundResultsPage: React.FC = () => {
  const { roomId, roundNumber } = useParams<{ roomId: string; roundNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { images, hydrateRoomImages, syncRoomId } = useGame();

  const oneBasedRound = Math.max(1, Number(roundNumber || 1));
  const { isLoading, error, contextResult, currentImage, hintDebts, playerSummary } = useCompeteRoundResult(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const { peers } = useCompetePeers(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);
  const leaderboard = useCompeteRoundLeaderboards(roomId ?? null, Number.isFinite(oneBasedRound) ? oneBasedRound : null);

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

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const awardsSubmittedRef = useRef(false);

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

  const totalRounds = images.length || 5;
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

  const handleNavigateHome = () => {
    navigate('/home');
  };

  const confirmNavigation = (navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  };

  const handleNext = () => {
    if (navigating) return;
    if (!roomId) {
      toast({ title: 'Error', description: 'Game ID (Room ID) not found', variant: 'destructive' });
      return;
    }
    setNavigating(true);
    const isLastRound = oneBasedRound === totalRounds;
    if (isLastRound) {
      navigate(`/compete/sync/game/room/${roomId}/final`);
    } else {
      navigate(`/compete/sync/game/room/${roomId}/round/${oneBasedRound + 1}`);
    }
  };

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
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-4 w-4" />Round Leaderboard</h2>
            {leaderboard.isLoading && <span className="text-sm text-neutral-400">Updating…</span>}
          </div>
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
      </div>

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
        nextRoundButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleNext}
              disabled={navigating}
              className="rounded-xl bg-orange-500 text-white font-semibold text-sm px-5 py-2 shadow-lg hover:bg-orange-500"
            >
              {navigating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              <span className="ml-2">{oneBasedRound === images.length ? 'Finish Game' : 'Next Round'}</span>
            </Button>
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
