import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
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
import { RoundResult as LayoutRoundResultType } from '@/utils/resultsFetching';
// Import supabase client
import { supabase } from '@/integrations/supabase/client';
// Import standardized scoring system
import { 
  MAX_DIST_KM,
  MAX_TIME_DIFF,
  calculateTimeAccuracy,
  calculateLocationAccuracy,
  getTimeDifferenceDescription
} from '@/utils/gameCalculations';

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

const RoundResultsPage = () => {
  // ---------------------------------- Hint debts ----------------------------------
  const [hintDebts, setHintDebts] = useState<{ hintId: string; xpDebt: number; accDebt: number; label: string; hint_type: string }[]>([]);

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
  
  const handleNavigateHome = useCallback(() => {
    navigate('/test');
  }, [navigate]);
  
  const confirmNavigation = useCallback((navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  }, []);

  // Get data from GameContext
  const { images, roundResults, isLoading: isContextLoading, error: contextError } = useGame();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1; // 0-based index

  // Find the context result and image data
  const contextResult = roundResults.find(r => r.roundIndex === currentRoundIndex);
  const currentImage = images.length > currentRoundIndex ? images[currentRoundIndex] : null;

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
      const { data: hintRecords, error } = await supabase
        .from('round_hints')
        .select('hint_id, xpDebt, accDebt, label, hint_type, purchased_at, round_id')
        .eq('user_id', user.id)
        .eq('round_id', roundSessionId)
        .order('purchased_at', { ascending: true });

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
      
      const processedDebts = hintRecords.map((hint: any) => ({
        hintId: hint.hint_id,
        xpDebt: Number(hint.xpDebt) || 0,
        accDebt: Number(hint.accDebt) || 0,
        label: hint.label,
        hint_type: hint.hint_type
      }));

      console.log('Processed hint debts:', JSON.stringify(processedDebts, null, 2));
      setHintDebts(processedDebts);

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

  // Award badges when results are viewed
  useEffect(() => {
    const awardBadges = async () => {
      if (!user || !contextResult || !currentImage || !roomId) return;
      
      try {
        // Get the year accuracy and location accuracy to check for perfect scores
        const actualYear = currentImage.year || 1900;
        const guessYear = contextResult.guessYear ?? actualYear;
        const yearDifference = Math.abs(actualYear - guessYear);
        
        // Check for perfect year (exact match)
        const yearAccuracy = yearDifference === 0 ? 100 : 
          Math.max(0, 100 - (yearDifference / 50) * 100);
        
        // Check for perfect location (95%+ accuracy)  
        const maxDistKm = 2000;
        const clampedDist = Math.min(contextResult.distanceKm ?? maxDistKm, maxDistKm);
        const locationAccuracy = Math.round(100 * (1 - clampedDist / maxDistKm));
        
        // Award badges based on performance
        const badges = await awardRoundBadges(
          user.id, 
          roomId, 
          currentRoundIndex,
          yearAccuracy,
          locationAccuracy,
          guessYear,
          actualYear
        );
        
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
  }, [user, contextResult, currentImage, roomId, currentRoundIndex]);

  // Mapping function: Context -> Layout Type
  const mapToLayoutResultType = (
      ctxResult: ContextRoundResult | undefined,
      img: GameImage | null,
      debts: typeof hintDebts
  ): LayoutRoundResultType | null => {
      if (!ctxResult || !img) return null;

      // --- Calculations using standardized scoring system ---
      const distanceKm = ctxResult.distanceKm ?? MAX_DIST_KM;
      
      // Get the actual values from the context if available, otherwise calculate them
      const actualYear = img.year || 1900;
      const guessYear = ctxResult.guessYear ?? actualYear;
      const yearDifference = Math.abs(actualYear - guessYear);
      
      // Use the standardized calculations for accuracy percentages
      const locationAccuracy = ctxResult.xpWhere !== undefined 
          ? Math.round((ctxResult.xpWhere / 100) * 100) // Convert XP to percentage
          : Math.round(calculateLocationAccuracy(distanceKm));
      
      const timeAccuracy = ctxResult.xpWhen !== undefined
          ? Math.round((ctxResult.xpWhen / 100) * 100) // Convert XP to percentage
          : Math.round(calculateTimeAccuracy(guessYear, actualYear));
      
      // Use the values from context if available, otherwise calculate
      const xpWhere = ctxResult.xpWhere ?? Math.round(calculateLocationAccuracy(distanceKm));
      const xpWhen = ctxResult.xpWhen ?? Math.round(calculateTimeAccuracy(guessYear, actualYear));
      
      // Get hint-related information
      const hintsUsed = ctxResult.hintsUsed ?? 0;
      const totalXpDebt = hintDebts.reduce((sum, d) => sum + (d.xpDebt || 0), 0);
      const totalAccDebt = hintDebts.reduce((sum, d) => sum + (d.accDebt || 0), 0);
      
      // Calculate total XP with hint penalties / debts
      const xpBeforePenalty = xpWhere + xpWhen;
      const xpTotal = ctxResult.score ?? Math.max(0, xpBeforePenalty - totalXpDebt);
      
      // Get standardized time difference description
      const timeDifferenceDesc = getTimeDifferenceDescription(guessYear, actualYear);

      // Construct the object matching LayoutRoundResultType from utils/resultsFetching
      const isCorrect = locationAccuracy >= 95; // Consider 95%+ as correct
    console.log('Mapping result:', { isCorrect, locationAccuracy, guessLat: ctxResult.guessCoordinates?.lat, guessLng: ctxResult.guessCoordinates?.lng });
    const layoutResult: LayoutRoundResultType = {
          // Fields identified from linter errors & ResultsLayout2 usage
          imageId: img.id, 
          eventLat: ctxResult.actualCoordinates.lat, // Use actual coords
          eventLng: ctxResult.actualCoordinates.lng, // Use actual coords
          locationName: img.location_name || 'Unknown Location',
          timeDifferenceDesc: timeDifferenceDesc, // Add the description string
          guessLat: ctxResult.guessCoordinates?.lat ?? null, // Use optional chaining and null default
          guessLng: ctxResult.guessCoordinates?.lng ?? null, // Use optional chaining and null default
          distanceKm: Math.round(ctxResult.distanceKm ?? 0),
          locationAccuracy: locationAccuracy,
          guessYear: guessYear, 
          eventYear: actualYear, // Actual year
          yearDifference: yearDifference,
          timeAccuracy: timeAccuracy,
          xpTotal: xpTotal,
          xpWhere: xpWhere,
          xpWhen: xpWhen,
          // Include hint information
          hintDebts: debts, // Pass hint debts to the layout
          // Include image details if the type definition requires them
          imageTitle: img.title || 'Untitled',
          imageDescription: img.description || 'No description.',
          imageUrl: img.url || 'placeholder.jpg',
          source_citation: img.source_citation,
          confidence: img.confidence ?? 0,
          earnedBadges: earnedBadges,
          isCorrect: isCorrect,
          // Include other potential fields if defined in the imported type
          // roundNumber: ctxResult.roundIndex + 1, // Example if needed
          // gameId: roomId, // Example if needed
      };
      
      return layoutResult;
  }

  // Generate the result in the format the layout expects
  const resultForLayout = mapToLayoutResultType(contextResult, currentImage, hintDebts);

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
      navigate(`/test/game/room/${roomId}/final`);
    } else {
      const nextRoundNumber = roundNumber + 1;
      console.log(`Navigating to next round: ${nextRoundNumber}`);
      navigate(`/test/game/room/${roomId}/round/${nextRoundNumber}`);
    }
    
    // No need to call advanceToNextRound, context handles state
    // setNavigating(false); // Navigation happens, so no need to unset here unless navigation fails
  };

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
  // If result is not yet ready, show a simple loading state. Do NOT redirect.
  if (!resultForLayout) {
    // Skip showing an intermediate page; wait silently until results are ready
    return null;
  }



  // Pass the correctly mapped result to the layout
  return (
    <>
      <ResultsLayout2 
        round={roundNumber}
        totalRounds={images.length}
        loading={navigating}
        error={null} 
        result={resultForLayout}
        avatarUrl={profile?.avatar_image_url || profile?.avatar_url || '/assets/default-avatar.png'}
        nextRoundButton={
          <Button 
            onClick={handleNext} 
            disabled={navigating} 
            className="rounded-xl bg-orange-500 text-white font-semibold text-sm px-8 py-2 shadow-lg hover:bg-orange-500 active:bg-orange-500 transition-colors min-w-[160px]"
          >
            {navigating ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            <span className="ml-2">{roundNumber === images.length ? 'Finish Game' : 'Next Round'}</span>
          </Button>
        }
        homeButton={
          <Button
            variant="outline"
            onClick={() => confirmNavigation(handleNavigateHome)}
            className="h-12 w-12 rounded-full bg-white hover:bg-gray-100 shadow-md text-gray-900"
            aria-label="Go Home"
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
              className="px-2 py-1 h-auto text-xs rounded-md bg-white hover:bg-gray-100 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
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