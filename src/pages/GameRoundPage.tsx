import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader, MapPin } from "lucide-react";
import { useGame } from '@/contexts/GameContext';
import { GuessCoordinates } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useToast } from "@/components/ui/use-toast";
import { getOrCreateRoundState, setCurrentRoundInSession } from '@/utils/roomState';
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
  const { user } = useAuth();
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
    setGameId,
    handleTimeUp,
    hydrateRoomImages,
    syncRoomId
  } = useGame();
  const { toast } = useToast();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1;
  const isLevelUpRoute = useMemo(() => location.pathname.includes('/level/'), [location.pathname]);
  const [showIntro, setShowIntro] = useState<boolean>(false);

  // Show Level Up intro only for round 1 on Level Up routes, and before any result is recorded for round 0
  useEffect(() => {
    const hasResultForFirstRound = !!roundResults.find(r => r.roundIndex === 0);
    setShowIntro(isLevelUpRoute && roundNumber === 1 && !hasResultForFirstRound);
  }, [isLevelUpRoute, roundNumber, roundResults]);

  // If intro is visible, pause the round timer; resume when dismissed (if timers are enabled)
  useEffect(() => {
    if (showIntro) {
      setIsTimerActive(false);
    } else if (timerEnabled) {
      setIsTimerActive(true);
    }
  }, [showIntro, timerEnabled]);

  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Year is not selected by default; becomes a number only after user interaction
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  // Initialize timer with roundTimerSec if timer is enabled, otherwise use 0 (will be hidden)
  const [remainingTime, setRemainingTime] = useState<number>(timerEnabled ? roundTimerSec : 0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(timerEnabled);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [hasGuessedLocation, setHasGuessedLocation] = useState<boolean>(false);

  // Initialize round timer from shared room/round state (persisted in Supabase)
  useEffect(() => {
    let cancelled = false;
    const initTimer = async () => {
      if (!timerEnabled) {
        setRemainingTime(0);
        setIsTimerActive(false);
        return;
      }
      if (!roomId || isNaN(roundNumber)) return;
      try {
        const state = await getOrCreateRoundState(roomId, roundNumber, roundTimerSec);
        if (cancelled) return;
        const elapsed = Math.floor((Date.now() - new Date(state.started_at).getTime()) / 1000);
        // Clamp to protect against client/server clock skew giving extra time
        const remainRaw = state.duration_sec - elapsed;
        const clampedRemain = Math.max(0, Math.min(state.duration_sec, remainRaw));
        setRemainingTime(clampedRemain);
        setIsTimerActive(true);
      } catch (e) {
        console.warn('[GameRoundPage] getOrCreateRoundState failed; using local timer init', e);
      }
    };
    initTimer();
    return () => { cancelled = true; };
  }, [roomId, roundNumber, roundTimerSec, timerEnabled]);

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
    hydrateRoomImages(roomId);
  }, [roomId, images.length, hydrateRoomImages]);

  // Determine the image for this round
  const imageForRound =
      !isContextLoading &&
      images.length > 0 &&
      !isNaN(roundNumber) &&
      roundNumber > 0 &&
      roundNumber <= images.length
        ? images[currentRoundIndex]
        : null;

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
        gameMode="solo"
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
      />

      {/* Level Up Intro overlay BEFORE starting Round 1 (Level Up only) */}
      {isLevelUpRoute && showIntro && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <LevelUpIntro onStart={() => setShowIntro(false)} />
        </div>
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