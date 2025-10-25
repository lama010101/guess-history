import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import ResultsLayout2 from "@/components/layouts/ResultsLayout2"; // Use the original layout
import { useToast } from "@/components/ui/use-toast";
import { Loader, Home, ChevronRight, ThumbsUp } from 'lucide-react';
import { useGame } from '@/contexts/GameContext'; 
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { awardRoundBadges } from '@/utils/badges/badgeService';
import { Badge } from '@/utils/badges/types';
import { toast as sonnerToast } from '@/components/ui/sonner';
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
import ImageRatingModal from '@/components/rating/ImageRatingModal';
import { makeRoundId } from '@/utils/roomState';
// Import RoundResult type from context if not already imported by ResultsLayout2 or define mapping
import { GameImage } from '@/contexts/GameContext';
import { RoundResult as ContextRoundResult } from '@/types';
// Import the RoundResult type expected by ResultsLayout2
import { RoundResult as LayoutRoundResultType, HintDebt } from '@/utils/results/types';
// Import supabase client
import { supabase } from '@/integrations/supabase/client';
// Multiplayer peers for round results
import { useRoundPeers } from '@/hooks/useRoundPeers';
// Import standardized scoring system
import { 
  calculateTimeAccuracy,
  calculateLocationAccuracy,
  getTimeDifferenceDescription,
  computeRoundNetPercent
} from '@/utils/gameCalculations';
import LevelRoundProgressCard from '@/components/levelup/LevelRoundProgressCard';
// Round leaderboard moved to CompeteRoundResultsPage (triple leaderboards)
// Timer integration removed to prevent flickering of Next Round button

// Removed imports for utils/resultsFetching as we use context now
// import { fetchRoundResult, checkGameProgress, advanceToNextRound } from '@/utils/resultsFetching';

// Define the structure ResultsLayout2 expects (based on its usage)
// We might need to refine this if ResultsLayout2 imports its own type
/*
interface LayoutRoundResult {
    locationAccuracy: number;
    xpTotal: number;
    distanceKm: number;
    yearDifference: number;
    guessYear: number;
    eventYear: number; // Actual year
    timeAccuracy: number;
    imageUrl: string;
    imageTitle: string;
    imageDescription: string;
    // Hint-related fields
    hintsUsed?: number;
    hintPenalty?: number;
    hintPenaltyPercent?: number;
    // Add any other fields ResultsLayout2 might need internally
    // These might be optional depending on ResultsLayout2 implementation
    xpWhere?: number;
    xpWhen?: number;
    actualLat?: number;
    actualLng?: number;
    guessLat?: number | null;
    guessLng?: number | null;
}
*/

// Typed row for round_hints to avoid any in Supabase query
type RoundHintRow = {
  hint_id: string;
  xpDebt: number;
  accDebt: number;
  label: string;
  hint_type: string;
  purchased_at: string;
  round_id: string;
  user_id?: string;
};

const RoundResultsPage = () => {
  // ---------------------------------- Hint debts ----------------------------------
  const [hintDebts, setHintDebts] = useState<HintDebt[]>([]);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { user } = useAuth();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        try {
          const userProfile = await fetchUserProfile(user.id);
          console.log('RoundResultsPage: Fetched profile:', userProfile);
          setProfile(userProfile);
        } catch (error) {
          console.error('Error fetching user profile for round results:', error);
        }
      }
    };
    loadProfile();
  }, [user]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  
  // Use useParams for new route structure
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>(); 
  const location = useLocation();
  // Derive base mode path (everything before '/game/') so we can preserve /solo, /level, /compete/sync, /compete/async
  const modeBasePath = useMemo(() => {
    const path = location.pathname;
    const idx = path.indexOf('/game/');
    return idx > 0 ? path.slice(0, idx) : '/solo'; // default to /solo if not found
  }, [location.pathname]);
  
  // Apply Level Up theming via body class when under /level/ routes
  useEffect(() => {
    const isLevelUp = location.pathname.includes('/level/');
    if (isLevelUp) {
      document.body.classList.add('mode-levelup');
    }
    return () => {
      document.body.classList.remove('mode-levelup');
    };
  }, [location.pathname]);

  // Apply Compete theming via body class when under /compete/ routes
  useEffect(() => {
    const isCompete = location.pathname.includes('/compete/');
    if (isCompete) {
      document.body.classList.add('mode-compete');
    }
    return () => {
      document.body.classList.remove('mode-compete');
    };
  }, [location.pathname]);
  
  const handleNavigateHome = useCallback(() => {
    navigate('/home');
  }, [navigate]);
  
  const confirmNavigation = useCallback((navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  }, []);

  // Get data from GameContext
  const { images, roundResults, isLoading: isContextLoading, error: contextError, hydrateRoomImages, syncRoomId } = useGame();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1; // 0-based index

  // Ensure context roomId is in sync with URL and membership is upserted
  useEffect(() => {
    if (roomId) {
      syncRoomId(roomId);
      if (!images || images.length === 0) {
        hydrateRoomImages(roomId);
      }
    }
  }, [roomId, images, hydrateRoomImages, syncRoomId]);

  // Find the context result and image data
  const contextResult = roundResults.find(r => r.roundIndex === currentRoundIndex);
  const currentImage = images.length > currentRoundIndex ? images[currentRoundIndex] : null;

  // --- Multiplayer peers: fetch other players' answers for this room/round ---
  const isSyncCompeteRoute = useMemo(() => location.pathname.startsWith('/compete/sync/'), [location.pathname]);
  const { peers: peerRows, miniLeaderboards } = useRoundPeers(
    isSyncCompeteRoute ? roomId || null : null,
    isSyncCompeteRoute && Number.isFinite(roundNumber) ? roundNumber : null
  );

  interface LayoutLeaderboardRow {
    userId: string;
    displayName: string;
    value: number;
    hintsUsed: number;
    penalty: number;
    avatarUrl: string | null;
  }

  const layoutLeaderboards = useMemo(() => {
    if (!isSyncCompeteRoute || !miniLeaderboards) return undefined;

    const peerMap = new Map((peerRows || []).map((peer) => [peer.userId, peer]));
    const normalizeCount = (value: number | null | undefined) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) return 0;
      return Math.max(0, Math.round(numeric));
    };

    const normalizePercent = (value: number | null | undefined) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return numeric > 1 ? Math.round(numeric) : Math.round(numeric * 100);
    };

    return {
      total: miniLeaderboards.total.map<LayoutLeaderboardRow>((row) => {
        const peer = peerMap.get(row.userId);
        const value = peer ? normalizePercent(peer.netAccuracy ?? peer.accuracy ?? row.value) : normalizePercent(row.value);
        const penalty = peer ? normalizePercent(peer.accDebt) : 0;
        const hints = peer ? normalizeCount(peer.hintsUsed) : normalizeCount(row.hintsUsed);
        return {
          userId: row.userId,
          displayName: row.displayName,
          value,
          hintsUsed: hints,
          penalty,
          avatarUrl: peer?.avatarUrl ?? null,
        };
      }),
      when: miniLeaderboards.time.map<LayoutLeaderboardRow>((row) => {
        const peer = peerMap.get(row.userId);
        const base = peer ? normalizePercent(peer.timeAccuracy) : normalizePercent(row.value);
        const penalty = peer ? normalizePercent(peer.whenAccDebt) : 0;
        const value = Math.max(0, base - penalty);
        const hints = peer ? normalizeCount(peer.whenHints) : normalizeCount(row.hintsUsed);
        return {
          userId: row.userId,
          displayName: row.displayName,
          value,
          hintsUsed: hints,
          penalty,
          avatarUrl: peer?.avatarUrl ?? null,
        };
      }),
      where: miniLeaderboards.location.map<LayoutLeaderboardRow>((row) => {
        const peer = peerMap.get(row.userId);
        const base = peer ? normalizePercent(peer.locationAccuracy) : normalizePercent(row.value);
        const penalty = peer ? normalizePercent(peer.whereAccDebt) : 0;
        const value = Math.max(0, base - penalty);
        const hints = peer ? normalizeCount(peer.whereHints) : normalizeCount(row.hintsUsed);
        return {
          userId: row.userId,
          displayName: row.displayName,
          value,
          hintsUsed: hints,
          penalty,
          avatarUrl: peer?.avatarUrl ?? null,
        };
      }),
      currentUserId: user?.id ?? null,
    };
  }, [isSyncCompeteRoute, miniLeaderboards, peerRows, user?.id]);

  // Fetch and process hint debts when user, image, and results are ready
  const fetchDebts = useCallback(async () => {
    if (!user || !currentImage || !contextResult) {
      console.log('Debug: Missing required data for fetchDebts', { 
        hasUser: !!user, 
        hasCurrentImage: !!currentImage, 
        hasContextResult: !!contextResult 
      });
      setHintDebts([]);
      return;
    }

    console.groupCollapsed(`Debug: Fetching Hint Debts for Round ${currentImage.id}`);
    console.log('currentImage.id:', currentImage.id, 'Type:', typeof currentImage.id);
    // Build composite round session ID using centralized helper
    const roundSessionId = makeRoundId(roomId as string, roundNumber);
    console.log('Query Params:', { userId: user.id, roundSessionId });

      try {
      // Query for round_hints (not in generated Database types yet)
      const { data, error } = await supabase
        .from('round_hints')
        .select('hint_id, xpDebt, accDebt, label, hint_type, purchased_at, round_id')
        .eq('user_id', user.id)
        .eq('round_id', roundSessionId)
        .order('purchased_at', { ascending: true });

      const hintRecords: RoundHintRow[] = (data ?? []) as RoundHintRow[];

      if (error) {
        console.error('Error fetching hint debts:', error);
        setHintDebts([]);
        console.groupEnd();
        return;
      }

      console.log(`Found ${hintRecords?.length || 0} hint records in DB for this round.`);
      console.log('Raw hint records:', JSON.stringify(hintRecords, null, 2));

      if (hintRecords && hintRecords.length > 0) {
        const roundIdMismatch = hintRecords.filter(r => r.round_id !== roundSessionId);
        if (roundIdMismatch.length > 0) {
          console.warn('Warning: Query returned records with mismatched round_id!', roundIdMismatch);
        }
      }

      if (!hintRecords || hintRecords.length === 0) {
        setHintDebts([]);
        console.groupEnd();
        return;
      }
      
      const processedDebts: HintDebt[] = hintRecords.map((hint) => ({
        hintId: hint.hint_id,
        xpDebt: Number(hint.xpDebt) || 0,
        accDebt: Number(hint.accDebt) || 0,
        label: hint.label,
        hint_type: hint.hint_type
      }));

      // Only show and use hints that were actually used and incurred a penalty
      const usedWithPenalty = processedDebts.filter(d => (d.xpDebt ?? 0) > 0 || (d.accDebt ?? 0) > 0);

      console.log('Processed hint debts (filtered to used with penalties):', JSON.stringify(usedWithPenalty, null, 2));
      setHintDebts(usedWithPenalty);

    } catch (e) {
      console.error('A critical error occurred in fetchDebts:', e);
    }
    console.groupEnd();
  }, [user, currentImage, contextResult, roomId, roundNumber]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const totalRounds = images.length > 0 ? images.length : 5; // Default to 5 if images not loaded yet

  // State for navigation loading indicator
  const [navigating, setNavigating] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const awardsSubmittedRef = useRef<boolean>(false);

  // Award badges when results are viewed
  useEffect(() => {
    const awardBadges = async () => {
      if (!contextResult || !currentImage || !roomId) return;
      if (awardsSubmittedRef.current) return; // dedupe within this page lifecycle

      try {
        // Ensure we have an authenticated user (anonymous or registered)
        let { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          try {
            const { data, error } = await supabase.auth.signInAnonymously();
            if (error) throw error;
            authUser = data?.user || null;
          } catch (signInError) {
            console.error('RoundResultsPage: Anonymous sign-in failed:', signInError);
            return;
          }
        }
        if (!authUser) return;

        // Get the year accuracy and location accuracy to check for perfect scores
        const actualYear = currentImage.year || 1900;
        const guessYear = contextResult.guessYear ?? actualYear;
        const yearDifference = Math.abs(actualYear - guessYear);

        // Check for perfect year (exact match)
        const yearAccuracy = yearDifference === 0 ? 100 : Math.max(0, 100 - (yearDifference / 50) * 100);

        // Check for perfect location (95%+ accuracy)
        const maxDistKm = 2000;
        const clampedDist = Math.min(contextResult.distanceKm ?? maxDistKm, maxDistKm);
        const locationAccuracy = Math.round(100 * (1 - clampedDist / maxDistKm));

        // Award badges based on performance
        const badges = await awardRoundBadges(
          authUser.id,
          roomId,
          currentRoundIndex,
          yearAccuracy,
          locationAccuracy,
          guessYear,
          actualYear
        );

        awardsSubmittedRef.current = true;

        // Show badge notification if any badges were earned
        if (badges.length > 0) {
          setEarnedBadges(badges);
          badges.forEach(badge => {
            sonnerToast.success(`Badge Earned: ${badge.name}`, {
              description: badge.description,
              duration: 5000
            });
          });
        }
      } catch (error) {
        console.error('Error awarding badges:', error);
      }
    };

    awardBadges();
  }, [contextResult, currentImage, roomId, currentRoundIndex]);

  // Mapping function: Context -> Layout Type
  const mapToLayoutResultType = useCallback((
    ctxResult: ContextRoundResult | undefined,
    img: GameImage | null,
    debts: HintDebt[],
  ): LayoutRoundResultType | null => {
    if (!ctxResult || !img) {
      return null;
    }

    const actualYear = img.year || 1900;
    const guessYear = ctxResult.guessYear ?? null;
    const distanceKm = ctxResult.distanceKm ?? null;
    const yearDifference = guessYear == null ? null : Math.abs(actualYear - guessYear);

    const locationAccuracy = distanceKm == null
      ? 0
      : (ctxResult.locationAccuracy !== undefined
          ? Math.round(ctxResult.locationAccuracy)
          : ctxResult.xpWhere !== undefined
            ? Math.round(ctxResult.xpWhere)
            : Math.round(calculateLocationAccuracy(distanceKm)));

    const timeAccuracy = guessYear == null
      ? 0
      : (ctxResult.timeAccuracy !== undefined
          ? Math.round(ctxResult.timeAccuracy)
          : ctxResult.xpWhen !== undefined
            ? Math.round(ctxResult.xpWhen)
            : Math.round(calculateTimeAccuracy(guessYear, actualYear)));

    const xpWhere = ctxResult.xpWhere ?? (distanceKm == null ? 0 : Math.round(calculateLocationAccuracy(distanceKm)));
    const xpWhen = ctxResult.xpWhen ?? (guessYear == null ? 0 : Math.round(calculateTimeAccuracy(guessYear, actualYear)));

    const hintsUsed = ctxResult.hintsUsed ?? 0;
    const totalXpDebt = debts.reduce((sum, d) => sum + (d.xpDebt || 0), 0);
    const totalAccDebt = debts.reduce((sum, d) => sum + (d.accDebt || 0), 0);

    const xpBeforePenalty = xpWhere + xpWhen;
    const xpTotal = ctxResult.score ?? Math.max(0, xpBeforePenalty - totalXpDebt);
    const totalAccuracy = Math.max(0, Math.round((timeAccuracy + locationAccuracy) / 2) - Math.round(totalAccDebt));

    const timeDifferenceDesc = guessYear == null
      ? 'No guess'
      : getTimeDifferenceDescription(guessYear, actualYear);

    const isCorrect = locationAccuracy >= 95;

    const layoutResult: LayoutRoundResultType = {
      imageId: img.id,
      eventLat: ctxResult.actualCoordinates?.lat ?? img.latitude,
      eventLng: ctxResult.actualCoordinates?.lng ?? img.longitude,
      locationName: img.location_name || 'Unknown Location',
      timeDifferenceDesc,
      guessLat: ctxResult.guessCoordinates?.lat ?? null,
      guessLng: ctxResult.guessCoordinates?.lng ?? null,
      distanceKm: distanceKm == null ? null : Math.round(distanceKm),
      locationAccuracy,
      guessYear,
      eventYear: actualYear,
      yearDifference,
      timeAccuracy,
      xpTotal,
      xpWhere,
      xpWhen,
      accuracy: Math.round((timeAccuracy + locationAccuracy) / 2),
      hintDebts: debts,
      hintsUsed,
      imageTitle: img.title || 'Untitled',
      imageDescription: img.description || 'No description.',
      imageUrl: img.url || 'placeholder.jpg',
      source_citation: img.source_citation,
      confidence: img.confidence ?? 0,
      earnedBadges: earnedBadges,
      isCorrect,
    };

    return layoutResult;
  }, [earnedBadges]);

  // Generate the result in the format the layout expects (memoized to avoid re-creating every render)
  const resultForLayout = useMemo(() => {
    return mapToLayoutResultType(contextResult, currentImage, hintDebts);
  }, [mapToLayoutResultType, contextResult, currentImage, hintDebts]);

  // --- Level Up per-round net percent (for progress card) ---
  const isLevelUpRoute = useMemo(() => location.pathname.includes('/level/'), [location.pathname]);
  const roundNetPercent = useMemo(() => {
    if (!contextResult || !currentImage) return 0;
    const actualYear = currentImage.year || 1900;
    const guessYear = contextResult.guessYear ?? null;
    const timeAcc = guessYear == null ? 0 : calculateTimeAccuracy(guessYear, actualYear);
    const distanceKm = contextResult.distanceKm ?? null;
    const locAcc = distanceKm == null ? 0 : calculateLocationAccuracy(distanceKm);
    const totalAccDebt = hintDebts.reduce((sum, d) => sum + (Number(d.accDebt) || 0), 0);
    return computeRoundNetPercent(timeAcc, locAcc, totalAccDebt);
  }, [contextResult, currentImage, hintDebts]);

  // Handle navigation to next round or end of game
  const handleNext = () => {
    if (navigating) return; // Prevent multiple clicks
    
    if (!roomId) {
      toast({
        title: "Error",
        description: "Game ID (Room ID) not found",
        variant: "destructive"
      });
      return;
    }
    
    setNavigating(true);

    const isLastRound = currentRoundIndex === totalRounds - 1;

    if (isLastRound) {
      console.log("Final round completed, navigating to final results page");
      navigate(`${modeBasePath}/game/room/${roomId}/final`);
    } else {
      const nextRoundNumber = roundNumber + 1;
      console.log(`Navigating to next round: ${nextRoundNumber}`);
      navigate(`${modeBasePath}/game/room/${roomId}/round/${nextRoundNumber}`);
    }
    
    // No need to call advanceToNextRound, context handles state
    // setNavigating(false); // Navigation happens, so no need to unset here unless navigation fails
  };

  // Next-round countdown timer removed

  // Show loading state from context (if game is still loading initially)
  // Note: This page might not be reachable if context is loading due to GameRoundPage checks
  if (isContextLoading && !resultForLayout) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <p className="text-lg">Loading game data...</p>
        </div>
      </div>
    );
  }

  // Show error if context had an error loading game
  if (contextError) {
     return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center p-4 bg-background rounded shadow">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Game</h2>
          <p className="text-muted-foreground mb-3">{contextError}</p>
           <Button onClick={() => confirmNavigation(handleNavigateHome)}>Return Home</Button>
        </div>
      </div>
    );
  }

  // Prevent 'Results Not Found' from flashing while loading
  if (isContextLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 p-4 bg-background rounded shadow">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <h2 className="text-xl font-semibold text-history-primary">Loading Results...</h2>
        </div>
      </div>
    );
  }

  // Handle case where results for this specific round aren't found in context yet OR image is missing
  // Show an intermediate loading state while results are being prepared.
  if (!resultForLayout) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3 p-4 bg-background rounded shadow">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <h2 className="text-xl font-semibold text-history-primary">Preparing results...</h2>
          <p className="text-sm text-muted-foreground">Calculating your score…</p>
        </div>
      </div>
    );
  }



  // Pass the correctly mapped result to the layout
  return (
    <>
      {isLevelUpRoute && (
        <div className="px-4 pt-4">
          <LevelRoundProgressCard roundIndex={currentRoundIndex} netPercent={Math.round(roundNetPercent)} />
        </div>
      )}
      <ResultsLayout2 
        round={roundNumber}
        totalRounds={images.length}
        result={resultForLayout}
        loading={navigating}
        error={null} 
        avatarUrl={profile?.avatar_image_url || profile?.avatar_url || '/assets/default-avatar.png'}
        peers={isSyncCompeteRoute ? (peerRows || []).filter(p => !user || p.userId !== user.id) : []}
        leaderboards={layoutLeaderboards}
        currentUserDisplayName={profile?.display_name || 'You'}
        nextRoundButton={
          <div className="flex items-center gap-2">
            <Button
              onClick={handleNext}
              disabled={navigating}
              className="rounded-xl bg-orange-500 text-white font-semibold text-sm px-5 py-2 shadow-lg hover:bg-orange-500 active:bg-orange-500 transition-colors min-w-[120px]"
            >
              {navigating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              <span className="ml-2">{roundNumber === images.length ? 'Finish Game' : 'Next Round'}</span>
            </Button>
          </div>
        }
        homeButton={
          <Button
            variant="outline"
            onClick={() => confirmNavigation(handleNavigateHome)}
            className="h-12 w-12 rounded-full text-black shadow-md border-none bg-white hover:bg-gray-100"
            aria-label="Return to Home"
            title="Return to Home"
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
              className="px-2 py-1 h-auto text-xs rounded-md bg-[#444444] text-white hover:bg[#444444] border border-[#444444] dark:bg-[#444444] dark:text-white dark:hover:bg-[#444444]"
              aria-label="Rate Image"
              title="Rate this image"
            >
              <ThumbsUp size={14} className="mr-1" />
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
      
      {/* Image Rating Modal */}
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

export default RoundResultsPage;