import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader, MapPin } from "lucide-react";
import { useGame } from '@/contexts/GameContext';
import { GuessCoordinates } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useToast } from "@/components/ui/use-toast";
import { setCurrentRoundInSession } from '@/utils/roomState';
import { getCurrentRoundFromSession } from '@/utils/roomState';
import { Button } from '@/components/ui/button';
import { SegmentedProgressBar } from '@/components/ui';
import LevelUpIntro from '@/components/levelup/LevelUpIntro';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
// import { useHint, HINT_PENALTY } from '@/hooks/useHint'; // Legacy hint system removed
import { useHintV2 } from '@/hooks/useHintV2';
import { 
  calculateDistanceKm, 
  calculateRoundScore, 
  calculateTimeXP, 
  calculateLocationXP, 
  ROUNDS_PER_GAME 
} from '@/utils/gameCalculations';
import { useServerCountdown } from '@/hooks/useServerCountdown';
import { buildTimerId } from '@/lib/timerId';
import { getLevelUpConstraints } from '@/lib/levelUpConfig';

// Rename component
const GameRoundPage = () => {
  // --- Hint system V2 ---
  const navigate = useNavigate();
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>();
  const location = useLocation();
  // Derive base mode path (everything before '/game/') to keep navigation inside the current mode (e.g., /level, /solo, /compete/sync)
  const modeBasePath = useMemo(() => {
    const path = location.pathname;
    const idx = path.indexOf('/game/');
    return idx > 0 ? path.slice(0, idx) : '/solo';
  }, [location.pathname]);
  // Detect Level Up routes and apply theming
  useEffect(() => {
    const isLevelUp = location.pathname.includes('/level/');
    if (isLevelUp) {
      document.body.classList.add('mode-levelup');
    }
    return () => {
      document.body.classList.remove('mode-levelup');
    };
  }, [location.pathname]);
  const { user, isLoading: authLoading, continueAsGuest } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const userProfile = await fetchUserProfile(user.id);
        setProfile(userProfile);
      }
    };
    loadProfile();
  }, [user]);

  // Ensure we have an authenticated session (guest is fine) before starting timers
  useEffect(() => {
    if (!authLoading && !user) {
      try { if (import.meta.env.DEV) console.debug('[GameRoundPage] No user session; signing in anonymously for timers'); } catch {}
      continueAsGuest().catch((e) => {
        try { console.warn('[GameRoundPage] continueAsGuest failed', e); } catch {}
      });
    }
  }, [authLoading, user, continueAsGuest]);

  const handleNavigateHome = useCallback(() => {
    console.log("Attempting to navigate to /home");
    navigate('/home');
    console.log("Called navigate('/home')");
  }, [navigate]);

  const confirmNavigation = useCallback((navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
    }
  }, [pendingNavigation]);

  const {
    images,
    roundResults,
    recordRoundResult,
    isLoading: isContextLoading,
    roundTimerSec,
    timerEnabled,
    setTimerEnabled,
    setGameId,
    gameId,
    handleTimeUp,
    hydrateRoomImages,
    syncRoomId
  } = useGame();
  const { toast } = useToast();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1;
  const isLevelUpRoute = useMemo(() => location.pathname.includes('/level/'), [location.pathname]);
  // Parse level from route start: "/level" or "/level/:level"
  const levelUpLevel = useMemo(() => {
    if (!isLevelUpRoute) return null;
    const match = location.pathname.match(/^\/level(?:\/(\d+))?/);
    const lvl = match && match[1] ? parseInt(match[1], 10) : 1;
    return isNaN(lvl) ? 1 : Math.max(1, Math.min(100, lvl));
  }, [location.pathname, isLevelUpRoute]);
  // Compute Level Up slider constraints when applicable
  const levelUpConstraints = useMemo(() => {
    if (!isLevelUpRoute) return null;
    const lvl = levelUpLevel ?? 1;
    const c = getLevelUpConstraints(lvl);
    if (import.meta.env.DEV) {
      try { console.log('[LevelUp][Slider] constraints:compute', { level: lvl, ...c }); } catch {}
    }
    return c;
  }, [isLevelUpRoute, levelUpLevel]);
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [roundStarted, setRoundStarted] = useState<boolean>(!isLevelUpRoute);

  // Level Up guarantee: timer must be enabled even on refresh/navigation directly into Level Up routes
  useEffect(() => {
    if (isLevelUpRoute && !timerEnabled) {
      setTimerEnabled(true);
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] Enforcing timerEnabled=true for Level Up route'); } catch {}
      }
    }
  }, [isLevelUpRoute, timerEnabled, setTimerEnabled]);

  // For Level Up: auto-show intro at the start of each round and gate timer start until Start is pressed
  useEffect(() => {
    if (isLevelUpRoute) {
      setShowIntro(true);
      setRoundStarted(false);
      setIsTimerActive(false);
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] Level Up gating: show intro & pause timer', { roundNumber }); } catch {}
      }
    }
  }, [isLevelUpRoute, roundNumber]);

  // If intro is visible, always pause the round timer. Resume only if timers are enabled and the round has started.
  useEffect(() => {
    if (showIntro) {
      setIsTimerActive(false);
    } else if (timerEnabled && roundStarted) {
      setIsTimerActive(true);
    }
    if (import.meta.env.DEV) {
      try { console.debug('[GameRoundPage] intro:toggle', { showIntro, timerEnabled, isLevelUpRoute, roundStarted }); } catch {}
    }
  }, [showIntro, timerEnabled, isLevelUpRoute, roundStarted]);

  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Year is not selected by default; becomes a number only after user interaction
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // Initialize timer with roundTimerSec if timer is enabled, otherwise use 0 (will be hidden)
  const [remainingTime, setRemainingTime] = useState<number>(timerEnabled ? roundTimerSec : 0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(timerEnabled);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [hasGuessedLocation, setHasGuessedLocation] = useState<boolean>(false);

  // Server-authoritative countdown integration
  const timerId = useMemo(() => {
    // Canonical: gh:{gameId}:{roundIndex}
    try {
      if (!gameId || isNaN(currentRoundIndex)) return '';
      return buildTimerId(gameId, currentRoundIndex);
    } catch {
      return '';
    }
  }, [gameId, currentRoundIndex]);

  const autoStart = useMemo(() => {
    // Start server timer only after the round is explicitly started
    return !!(timerEnabled && roundStarted && timerId && user);
  }, [timerEnabled, roundStarted, timerId, user]);
  useEffect(() => {
    if (import.meta.env.DEV) {
      try { console.debug('[GameRoundPage] timer:config', { timerId, roundTimerSec, timerEnabled, showIntro, autoStart, hasUser: !!user, authLoading }); } catch {}
    }
  }, [timerId, roundTimerSec, timerEnabled, showIntro, autoStart, user, authLoading]);

  const { ready: timerReady, expired: timerExpired, remainingSec, refetch } = useServerCountdown({
    timerId,
    durationSec: roundTimerSec,
    autoStart,
    onExpire: () => {
      if (import.meta.env.DEV) console.debug('[GameRoundPage] Server timer expired');
      handleTimeComplete();
    },
  });

  // When duration changes from Level Up constraints, reflect it in the local UI state
  // only before the server timer hydrates. Once hydrated, server values take over
  // even if the Level Up intro is visible (timer runs under the overlay).
  useEffect(() => {
    if (!timerEnabled) {
      setRemainingTime(0);
      return;
    }
    if (!timerReady) {
      setRemainingTime(roundTimerSec);
    }
  }, [roundTimerSec, timerEnabled, timerReady]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      try { console.debug('[GameRoundPage] timer:state', { timerReady, timerExpired, remainingSec }); } catch {}
    }
  }, [timerReady, timerExpired, remainingSec]);

  // Reflect server timer into UI state without changing UI contract
  useEffect(() => {
    if (!timerEnabled) {
      setRemainingTime(0);
      setIsTimerActive(false);
      return;
    }
    // Keep local state in sync with server countdown, but only run when round has started
    if (timerReady) {
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] timer:sync', { remainingSec, timerExpired, roundStarted }); } catch {}
      }
      setRemainingTime(remainingSec);
      setIsTimerActive(roundStarted && !timerExpired);
    }
  }, [timerEnabled, timerReady, remainingSec, timerExpired, roundStarted]);

  // After explicit Start, force a refetch to hydrate/start the server timer
  useEffect(() => {
    if (timerEnabled && roundStarted && timerId && user) {
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] timer:refetch after start', { timerId, hasUser: !!user }); } catch {}
      }
      refetch();
    }
  }, [roundStarted, timerEnabled, timerId, refetch, user]);

  // Persist the current round number to game_sessions so reconnect can restore it
  useEffect(() => {
    if (!roomId || isNaN(roundNumber)) return;
    setCurrentRoundInSession(roomId, roundNumber).catch((e) => {
      console.warn('[GameRoundPage] setCurrentRoundInSession failed', e);
    });
  }, [roomId, roundNumber]);

  // Hydrate images from persistent room session on refresh
  useEffect(() => {
    if (!roomId) return;
    if (images && images.length > 0) return;
    if (import.meta.env.DEV) console.debug('[GameRoundPage] Hydrating room images for', roomId);
    hydrateRoomImages(roomId);
  }, [roomId, images.length, hydrateRoomImages]);

  // After hydration, auto-redirect to the persisted round if it differs from the URL
  const redirectedRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    if (!roomId) return;
    if (redirectedRef.done) return;
    // When images are present or even if not, we can still navigate to the stored round number
    (async () => {
      const persistedRound = await getCurrentRoundFromSession(roomId);
      if (!persistedRound || isNaN(persistedRound)) return;
      if (persistedRound !== roundNumber) {
        redirectedRef.done = true;
        navigate(`${modeBasePath}/game/room/${roomId}/round/${persistedRound}`);
      }
    })();
  }, [roomId, roundNumber, modeBasePath, navigate, redirectedRef]);

  // Persist URL-derived round to the backend session so refresh lands on same round
  

  // Determine the image for this round
  const imageForRound =
      !isContextLoading &&
      images.length > 0 &&
      !isNaN(roundNumber) &&
      roundNumber > 0 &&
      roundNumber <= images.length
        ? images[currentRoundIndex]
        : null;

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[GameRoundPage] imageForRound', { roundNumber, hasImage: !!imageForRound });
    }
  }, [roundNumber, imageForRound]);

  // V2 hint system - track purchased hints for this image
  const { purchasedHints, purchasedHintIds, xpDebt, accDebt, purchaseHint, availableHints, isHintLoading } = useHintV2(imageForRound, { roomId: roomId!, roundNumber });

  
  
  useEffect(() => {
    if (roomId) {
      // setGameId(roomId); // removed to avoid overwriting gameId with roomId
    }
  }, [roomId, setGameId]);

  const handleTimeout = useCallback(() => {
    if (handleTimeUp) {
      handleTimeUp(currentRoundIndex);
    }
  }, [handleTimeUp, currentRoundIndex]);
  


  // Handle guess submission
  const handleSubmitGuess = useCallback(() => {
    console.log('[GameRoundPage] handleSubmitGuess called');
    if (isSubmitting) {
      console.log('[GameRoundPage] Already submitting, returning');
      return;
    }
    if (hasTimedOut) {
      console.log('[GameRoundPage] Has timed out, returning');
      return; // Prevent submission after timeout
    }

    if (!imageForRound) {
      console.log('[GameRoundPage] No imageForRound, showing toast');
      toast({
        title: 'Error',
        description: 'Cannot submit guess, image data is missing.',
        variant: 'destructive',
      });
      return;
    }

    // Defensive: Submit should only be possible when both year and location are selected
    if (selectedYear === null) {
      console.log('[GameRoundPage] No selectedYear, showing toast');
      toast({ title: 'Missing Year', description: 'Please select a year before submitting.', variant: 'destructive' });
      return;
    }

    if (!hasGuessedLocation) {
      console.log('[GameRoundPage] No location guessed, showing toast');
      toast({
        title: 'No location selected',
        description: 'Please select a location on the map first.',
        variant: 'destructive',
      });
      return;
    }

    console.log(`[GameRoundPage] Submitting guess for round ${roundNumber}, Year: ${selectedYear}, Coords:`, currentGuess);
    setIsSubmitting(true);
    setIsTimerActive(false);

    try {
      const distance = currentGuess
        ? calculateDistanceKm(
            currentGuess.lat,
            currentGuess.lng,
            imageForRound.latitude,
            imageForRound.longitude,
          )
        : null;

      // Calculate base XP without penalties using the scoring helpers
      const timeXP = calculateTimeXP(selectedYear, imageForRound.year);
      const locationXP = distance !== null ? calculateLocationXP(distance) : 0;
      const roundXPBeforePenalty = timeXP + locationXP;

      // Apply dynamic hint debts from the V2 hint system
      const roundXP = Math.max(0, roundXPBeforePenalty - xpDebt);
      const percentBeforePenalty = (roundXPBeforePenalty / (100 + 100)) * 100; // 200 is max XP per round
      const roundPercent = Math.max(0, Math.round(percentBeforePenalty - accDebt));

      const hintPenalty = xpDebt;
      const hintPenaltyPercent = accDebt;

      const resultData = {
        guessCoordinates: currentGuess,
        distanceKm: distance,
        score: roundXP,
        guessYear: selectedYear,
        xpWhere: locationXP,
        xpWhen: timeXP,
        accuracy: roundPercent,
        hintsUsed: purchasedHints.length,
        xpDebt,
        accDebt,
        hintPenalty,
        hintPenaltyPercent,
      };

      console.log('[GameRoundPage] About to call recordRoundResult with:', resultData, currentRoundIndex);
      recordRoundResult(resultData, currentRoundIndex);
      console.log('[GameRoundPage] recordRoundResult called, navigating to results');

      setCurrentGuess(null);
      navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
    } catch (error) {
      console.error('Error during guess submission:', error);
      toast({
        title: 'Submission Error',
        description: 'An error occurred while submitting your guess.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  }, [
    isSubmitting,
    hasTimedOut,
    imageForRound,
    toast,
    hasGuessedLocation,
    roundNumber,
    selectedYear,
    currentGuess,
    setIsSubmitting,
    setIsTimerActive,
    purchasedHints,
    recordRoundResult,
    currentRoundIndex,
    setCurrentGuess,
    navigate,
    roomId,
  ]);

  // Handle timer completion
  const handleTimeComplete = useCallback(() => {
    if (!timerEnabled) return;
    console.log("Timer completed - auto submitting");
    setHasTimedOut(true);
    setIsTimerActive(false);
    setIsSubmitting(true);
    
    if (!imageForRound) {
      toast({
        title: "Error",
        description: "Cannot submit guess, image data is missing.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (!hasGuessedLocation) {
        recordRoundResult(
          {
            guessCoordinates: null,
            distanceKm: null,
            score: 0,
            guessYear: null,
            xpWhere: 0,
            xpWhen: 0,
            accuracy: 0,
            hintsUsed: purchasedHints.length
          },
          currentRoundIndex
        );
        
        toast({
          title: "Time's Up!",
          description: "No location was selected. Your score for this round is 0.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
        navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
        setIsSubmitting(false);
        return;
      } else if (selectedYear === null) {
        // Location guessed but no year selected: assign no year and zero points
        recordRoundResult(
          {
            guessCoordinates: currentGuess,
            distanceKm: null,
            score: 0,
            guessYear: null,
            xpWhere: 0,
            xpWhen: 0,
            accuracy: 0,
            hintsUsed: purchasedHints.length
          },
          currentRoundIndex
        );
        toast({
          title: "Time's Up!",
          description: "No year was selected. Your score for this round is 0.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
        navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
        setIsSubmitting(false);
        return;
      } else {
        const distance = currentGuess 
          ? calculateDistanceKm(
              currentGuess.lat,
              currentGuess.lng,
              imageForRound.latitude,
              imageForRound.longitude
            ) 
          : null;

        const { 
          timeXP = 0, 
          locationXP = 0, 
          roundXP: finalScore = 0, 
          roundPercent = 0
        } = distance !== null 
          ? calculateRoundScore(distance, selectedYear, imageForRound.year, purchasedHints.length)
          : { timeXP: 0, locationXP: 0, roundXP: 0, roundPercent: 0 };
        
        recordRoundResult(
          {
            guessCoordinates: currentGuess,
            distanceKm: distance,
            score: finalScore,
            guessYear: selectedYear,
            xpWhere: locationXP,
            xpWhen: timeXP,
            accuracy: roundPercent,
            hintsUsed: purchasedHints.length
          },
          currentRoundIndex
        );
        
        toast({
          title: "Time's Up!",
          description: "Submitting your current guess automatically.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
      }
      
      setTimeout(() => {
        navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
        setIsSubmitting(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error recording timeout result:", error);
      setIsSubmitting(false);
    }
  }, [imageForRound, selectedYear, currentRoundIndex, recordRoundResult, toast, navigate, roomId, roundNumber, hasGuessedLocation, currentGuess, timerEnabled, modeBasePath]);

  const handleMapGuess = (lat: number, lng: number) => {
    console.log(`Guess placed at: Lat ${lat}, Lng ${lng}`);
    setCurrentGuess({ lat, lng });
    setHasGuessedLocation(true);
  };

  useEffect(() => {
    // Always synchronize the context room ID with the URL room ID and ensure membership
    if (!isContextLoading && roomId) {
      syncRoomId(roomId);
    }

    if (!isContextLoading && images.length > 0 && (isNaN(roundNumber) || roundNumber <= 0 || roundNumber > images.length)) {
       console.warn(`Invalid round number (${roundNumber}) for image count (${images.length}). Navigating home.`);
       navigate(`/home`);
       return;
    }

  }, [roomId, roundNumber, images, isContextLoading, syncRoomId, navigate]);

  // Loading state from context
  if (isContextLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <p className="text-lg">Loading Game...</p>
        </div>
      </div>
    );
  }

  // No need to check for context error as we handle loading state above
  
  // Context loaded but no image available for this valid round (shouldn't happen often)
  if (!imageForRound) {
     return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-3">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <p className="text-lg">Resuming game...</p>
          <p className="text-sm text-muted-foreground">Restoring images and round state</p>
        </div>
      </div>
    );
  }

  // Render the layout and the separate submit button
  return (
    // Use relative positioning to allow absolute positioning for the button
    <div className="relative w-full min-h-screen flex flex-col">
      {/* Progress bar at the very top */}
      <div className="w-full bg-history-primary absolute top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <SegmentedProgressBar current={roundNumber} total={ROUNDS_PER_GAME} className="w-full" />
        </div>
      </div>

      {/* Main game content */}
      <GameLayout1
        onComplete={handleSubmitGuess}
        gameMode={isLevelUpRoute ? 'levelup' : 'solo'}
        currentRound={roundNumber}
        image={imageForRound}
        onMapGuess={handleMapGuess}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        remainingTime={remainingTime}
        setRemainingTime={setRemainingTime}
        isTimerActive={isTimerActive}
        onNavigateHome={handleNavigateHome}
        onConfirmNavigation={confirmNavigation}
        avatarUrl={profile?.avatar_image_url}
        onTimeout={handleTimeComplete}
        availableHints={availableHints}
        purchasedHints={purchasedHints}
        purchasedHintIds={purchasedHintIds}
        xpDebt={xpDebt}
        accDebt={accDebt}
        onPurchaseHint={purchaseHint}
        isHintLoading={isHintLoading}
        minYear={levelUpConstraints?.levelYearRange.start}
        maxYear={levelUpConstraints?.levelYearRange.end}
        levelLabel={isLevelUpRoute ? `Level ${levelUpLevel ?? 1}` : undefined}
        onOpenLevelIntro={() => setShowIntro(true)}
      />

      {/* Level Up Intro overlay BEFORE starting Round 1 (Level Up only) */}
      {isLevelUpRoute && showIntro && createPortal(
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <LevelUpIntro
            onStart={() => { setRoundStarted(true); setShowIntro(false); }}
            onClose={() => setShowIntro(false)}
            level={levelUpLevel ?? undefined}
            constraints={levelUpConstraints ?? undefined}
            currentOverallNetPct={(() => {
              if (!roundResults || roundResults.length === 0) return undefined;
              const sum = roundResults.reduce((s, r) => s + (Number.isFinite(r.accuracy as number) ? (r.accuracy as number) : 0), 0);
              return Math.max(0, Math.min(100, Math.round(sum / roundResults.length)));
            })()}
            bestRoundNetPct={(() => {
              if (!roundResults || roundResults.length === 0) return undefined;
              return Math.max(
                ...roundResults.map(r => (Number.isFinite(r.accuracy as number) ? (r.accuracy as number) : 0))
              );
            })()}
          />
        </div>,
        document.body
      )}

      {/* Confirmation Dialog */}
      <ConfirmNavigationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmNavigation}
      />
    </div>
  );
};

export default GameRoundPage; 