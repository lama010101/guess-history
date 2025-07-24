import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader, MapPin } from "lucide-react";
import { useGame, GuessCoordinates } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useToast } from "@/components/ui/use-toast";
import { Button } from '@/components/ui/button';
import { SegmentedProgressBar } from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
// import { useHint, HINT_PENALTY } from '@/hooks/useHint'; // Legacy hint system removed
// TODO: Implement V2 hint penalty logic for scoring
import { 
  calculateDistanceKm, 
  calculateRoundScore, 
  calculateTimeXP, 
  calculateLocationXP, 
  ROUNDS_PER_GAME 
} from '@/utils/gameCalculations';

// Rename component
const GameRoundPage = () => {
  const navigate = useNavigate();
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>();
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
    console.log("Attempting to navigate to /test"); // Added log
    navigate('/test');
    console.log("Called navigate('/test')"); // Added log
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
    gameId: contextRoomId,
    roundTimerSec,
    timerEnabled,
    setGameId,
    handleTimeUp
  } = useGame();
  const { toast } = useToast();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1;

  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1932);
  // Initialize timer with roundTimerSec if timer is enabled, otherwise use 0 (will be hidden)
  const [remainingTime, setRemainingTime] = useState<number>(timerEnabled ? roundTimerSec : 0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(timerEnabled);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const [hasGuessedLocation, setHasGuessedLocation] = useState<boolean>(false);

  // Get current round's hint usage
  const imageForRound = 
      !isContextLoading && 
      images.length > 0 && 
      !isNaN(roundNumber) && 
      roundNumber > 0 && 
      roundNumber <= images.length
      ? images[currentRoundIndex] 
      : null;
  
  useEffect(() => {
    if (roomId) {
      setGameId(roomId);
    }
  }, [roomId, setGameId]);

  const handleTimeout = useCallback(() => {
    if (handleTimeUp) {
      handleTimeUp(currentRoundIndex);
    }
  }, [handleTimeUp, currentRoundIndex]);
  


  // Handle guess submission
  const handleSubmitGuess = useCallback(() => {
    if (isSubmitting) return;
    if (hasTimedOut) return; // Prevent submission after timeout
    
    if (!imageForRound) {
      toast({
        title: "Error",
        description: "Cannot submit guess, image data is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!hasGuessedLocation && !hasTimedOut) {
      toast({
        title: "No location selected",
        description: "Please select a location on the map first.",
        variant: "destructive",
      });
      return;
    }

    console.log(`Submitting guess for round ${roundNumber}, Year: ${selectedYear}, Coords:`, currentGuess);
    setIsSubmitting(true);
    setIsTimerActive(false);

    try {
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
        ? calculateRoundScore(distance, selectedYear, imageForRound.year, 0, 0)
        : { timeXP: 0, locationXP: 0, roundXP: 0, roundPercent: 0 };
      
      console.log(`Distance: ${distance?.toFixed(2) ?? 'N/A'} km, Location XP: ${locationXP.toFixed(1)}, Time XP: ${timeXP.toFixed(1)}, Round XP: ${finalScore.toFixed(1)}, Accuracy: ${roundPercent}%`);

      recordRoundResult(
        {
          guessCoordinates: currentGuess,
          distanceKm: distance,
          score: finalScore,
          guessYear: selectedYear,
          xpWhere: locationXP,
          xpWhen: timeXP,
          accuracy: roundPercent,
          hintsUsed: 0 // TODO: Get from V2 context
        },
        currentRoundIndex
      );

      setCurrentGuess(null);
      navigate(`/test/game/room/${roomId}/round/${roundNumber}/results`);
    } catch (error) {
      console.error("Error during guess submission:", error);
      toast({
        title: "Submission Error",
        description: "An error occurred while submitting your guess.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  }, [currentGuess, imageForRound, toast, roundNumber, selectedYear, recordRoundResult, currentRoundIndex, navigate, roomId, hasGuessedLocation, hasTimedOut]);

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
            guessYear: selectedYear,
            xpWhere: 0,
            xpWhen: 0,
            accuracy: 0,
            hintsUsed: 0 // TODO: Get from V2 context
          },
          currentRoundIndex
        );
        
        toast({
          title: "Time's Up!",
          description: "No location was selected. Your score for this round is 0.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
        navigate(`/test/game/room/${roomId}/round/${roundNumber}/results`);
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
          ? calculateRoundScore(distance, selectedYear, imageForRound.year, 0, 0)
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
            hintsUsed: 0 // TODO: Get from V2 context
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
        navigate(`/test/game/room/${roomId}/round/${roundNumber}/results`);
        setIsSubmitting(false);
      }, 2000);
      
    } catch (error) {
      console.error("Error recording timeout result:", error);
      setIsSubmitting(false);
    }
  }, [imageForRound, selectedYear, currentRoundIndex, recordRoundResult, toast, navigate, roomId, roundNumber, hasGuessedLocation, currentGuess, timerEnabled]);

  const handleMapGuess = (lat: number, lng: number) => {
    console.log(`Guess placed at: Lat ${lat}, Lng ${lng}`);
    setCurrentGuess({ lat, lng });
    setHasGuessedLocation(true);
  };

  useEffect(() => {
    // Always synchronize the context room ID with the URL room ID
    // This prevents unwanted redirects due to ID mismatch after timeout/next round navigation
    if (!isContextLoading && roomId && contextRoomId !== roomId) {
      console.log(`Synchronizing context room ID with URL room ID: ${roomId}`);
      setGameId(roomId);
      // Store this synchronization in session storage to help with navigation tracking
      sessionStorage.setItem('lastSyncedRoomId', roomId);
    }
    
    if (!isContextLoading && images.length > 0 && (isNaN(roundNumber) || roundNumber <= 0 || roundNumber > images.length)) {
       console.warn(`Invalid round number (${roundNumber}) for image count (${images.length}). Navigating to final page.`);
       navigate(`/test/game/room/${roomId}/final`);
       return;
    }

  }, [roomId, roundNumber, images, isContextLoading, contextRoomId, navigate]);

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
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-yellow-600 mb-3">Image Not Found</h2>
          <p className="text-muted-foreground">Could not load image for round {roundNumber}.</p>
           <button 
             onClick={() => confirmNavigation(handleNavigateHome)}
             className="px-4 py-2 bg-history-primary text-white rounded hover:bg-history-primary/90"
           >
             Return Home
           </button>
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
        onTimeout={handleTimeout}
      />

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