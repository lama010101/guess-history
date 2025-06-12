import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { Share2, Loader, Home, MapPin, Calendar, ArrowLeft, Target, Zap } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from "react";
import Logo from "@/components/Logo";
import { NavProfile } from "@/components/NavProfile";
import { formatInteger } from '@/utils/format';
import { updateUserMetrics } from '@/utils/profile/profileService';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateFinalScore,
  calculateTimeAccuracy,
  calculateLocationAccuracy,
  getTimeDifferenceDescription
} from "@/utils/gameCalculations";

const FinalResultsPage = () => {
  const navigate = useNavigate();
  const { 
    images, 
    isLoading: isContextLoading, 
    error: contextError, 
    startGame,
    resetGame,
    roundResults,
    fetchGlobalMetrics,
    refreshGlobalMetrics,
    globalXP = 0,
    globalAccuracy = 0,
    gameId, // Get gameId from context
    setProvisionalGlobalMetrics // Add this for optimistic updates
  } = useGame();
  const submittedGameIdRef = useRef<string | null>(null);
  
  // Update user metrics and fetch global scores when the final results page is loaded
  useEffect(() => {
    // Immediately fetch global metrics on page load to ensure navbar shows correct values
    refreshGlobalMetrics();
    
    const updateMetricsAndFetchGlobal = async () => {
      if (roundResults.length === 0 || !images.length) {
        console.log('No round results or images to process');
        return;
      }

      console.log('Processing game results to update user metrics...');

      // Calculate raw XP and percentage for each round
      const roundScores = roundResults.map((result, index) => {
        const img = images[index];
        if (!result || !img) return { roundXP: 0, roundPercent: 0 };
        
        const locationXP = calculateLocationAccuracy(result.distanceKm || 0);
        const timeXP = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
        const roundXP = locationXP + timeXP;
        const roundPercent = (roundXP / 200) * 100; // 200 is the max XP per round
        
        console.log(`Round ${index + 1} - Location XP: ${locationXP}, Time XP: ${timeXP}, Total Raw XP: ${roundXP}, Hints Used: ${result.hintsUsed || 0}`);
        
        return { roundXP, roundPercent };
      });

      // Sum up XP from all rounds
      const { finalXP, finalPercent } = calculateFinalScore(roundScores);
      
      // Calculate total hints used and apply penalty (30 XP per hint)
      const HINT_PENALTY = 30;
      const totalHintsUsed = roundResults.reduce((sum, result) => sum + (result.hintsUsed || 0), 0);
      const totalHintPenalty = totalHintsUsed * HINT_PENALTY;
      const netFinalXP = Math.max(0, Math.round(finalXP - totalHintPenalty));
      
      console.log('Final Score Calculation:', {
        totalRounds: roundResults.length,
        rawTotalXP: finalXP,
        totalHintsUsed,
        totalHintPenalty,
        netFinalXP,
        finalPercent
      });
      
      // Check if this was a perfect game
      const isPerfectGame = finalPercent === 100;
      
      // Calculate average location and time accuracy
      const locationAccuracySum = roundResults.reduce((sum, result) => {
        return sum + calculateLocationAccuracy(result.distanceKm || 0);
      }, 0);
      
      const timeAccuracySum = roundResults.reduce((sum, result, index) => {
        const img = images[index];
        return sum + calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
      }, 0);
      
      const avgLocationAccuracy = locationAccuracySum / roundResults.length;
      const avgTimeAccuracy = timeAccuracySum / roundResults.length;
      
      // Check for bullseyes
      const yearBullseye = roundResults.some(result => result.guessYear === images[result.roundIndex]?.year);
      const locationBullseye = roundResults.some(result => (result.distanceKm || 0) < 10);
      
      // Get current user (may be guest or registered)
      let { data: { user } } = await supabase.auth.getUser();
      let userId = user?.id;
      
      // If no user is found, sign in anonymously to ensure guest users have a persistent ID
      if (!userId) {
        console.log('[FinalResultsPage] No user found, creating anonymous session for guest user');
        try {
          // Create an anonymous session
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('[FinalResultsPage] Error creating anonymous session:', error);
          } else if (data?.user) {
            console.log('[FinalResultsPage] Successfully created anonymous session for guest user');
            user = data.user;
            userId = user.id;
          }
        } catch (signInError) {
          console.error('[FinalResultsPage] Exception during anonymous sign-in:', signInError);
        }
      }

      // Double-check that we have a userId after potential anonymous sign-in
      if (!userId) {
        console.error('[FinalResultsPage] Still no user ID available after anonymous sign-in attempt. Cannot update metrics.');
        return; // Exit if still no user ID after anonymous sign-in attempt
      }

      // Prepare metrics update with final XP (after hint penalties)
      const metricsUpdate = {
        gameAccuracy: finalPercent,
        gameXP: netFinalXP, // This is the final XP after hint penalties
        isPerfectGame,
        locationAccuracy: avgLocationAccuracy,
        timeAccuracy: avgTimeAccuracy,
        yearBullseye,
        locationBullseye
      };
      
      console.log('[FinalResultsPage] Preparing to update user metrics with:', {
        metrics: metricsUpdate,
        rawXP: finalXP,
        hintPenalty: totalHintPenalty,
        gameId: gameId || 'N/A',
        userId: userId, // Log the userId being used
        isAnonymous: user?.app_metadata?.provider === 'anonymous' // Log if this is an anonymous user
      });
      
      // Safeguard against multiple submissions for the same gameId
      if (!gameId) {
        console.warn('[FinalResultsPage] gameId is not available. Cannot ensure single submission or set provisional metrics.');
        return; 
      }
      
      if (submittedGameIdRef.current === gameId) {
        console.log(`[FinalResultsPage] Metrics for gameId ${gameId} already submitted or being processed by this instance. Skipping further actions.`);
        return; // Skip update
      }

      // Mark this gameId as being processed by this instance *before* any async calls or UI updates
      submittedGameIdRef.current = gameId;

      // Optimistically update UI with provisional metrics
      // metricsUpdate contains gameXP (netFinalXP) and gameAccuracy (finalPercent)
      console.log(`[FinalResultsPage] Calling setProvisionalGlobalMetrics for gameId: ${gameId} with XP: ${metricsUpdate.gameXP}, Accuracy: ${metricsUpdate.gameAccuracy}`);
      setProvisionalGlobalMetrics(metricsUpdate.gameXP, metricsUpdate.gameAccuracy);
      
      try {
        console.log(`[FinalResultsPage] Calling updateUserMetrics for user: ${userId}, gameId: ${gameId || 'N/A'}`);
        const success = await updateUserMetrics(userId, metricsUpdate, gameId);
        console.log(`[FinalResultsPage] updateUserMetrics result: { success: ${success}, userId: ${userId}, gameId: ${gameId || 'N/A'} }`);

        if (success) {
          // The logic for submittedGameIdRef.current = gameId has been moved earlier, before the try block.
          console.log('[FinalResultsPage] User metrics updated successfully in Supabase.');
          console.log('[FinalResultsPage] Refreshing global metrics to update UI...');
          // Force a refresh of global metrics to update UI
          await refreshGlobalMetrics();
          
          // Try multiple refreshes in case of database replication lag
          setTimeout(async () => {
            await refreshGlobalMetrics();
            console.log('[FinalResultsPage] Global metrics refreshed (first delay refresh).');
            
            // One more refresh after another delay to ensure UI is updated
            setTimeout(async () => {
              await refreshGlobalMetrics();
              console.log('[FinalResultsPage] Global metrics refreshed (second delay refresh).');
            }, 1000);
          }, 1000);
          
          console.log('[FinalResultsPage] Global metrics refresh scheduled.');
        } else {
          console.error(`[FinalResultsPage] Failed to update user metrics in Supabase for user: ${userId}.`);
        }
      } catch (error) {
        console.error(`[FinalResultsPage] Error during metrics update process for user: ${userId}:`, error);
      }
    };
    
    updateMetricsAndFetchGlobal();
  }, [roundResults, images, refreshGlobalMetrics, gameId, setProvisionalGlobalMetrics]);
  
  // Additional effect to ensure global metrics are always refreshed when this page is viewed
  useEffect(() => {
    const refreshMetricsTimer = setInterval(() => {
      refreshGlobalMetrics();
    }, 2000); // Refresh every 2 seconds while on this page
    
    return () => clearInterval(refreshMetricsTimer);
  }, [refreshGlobalMetrics]);

  const handlePlayAgain = async () => {
    resetGame();
    navigate('/test'); // Navigate to the home page first to ensure a clean state
    await startGame();
  };

  const handleHome = () => {
    resetGame();
    navigate("/");
  };

  if (isContextLoading) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-history-primary mx-auto mb-4" />
          <p className="text-lg">Loading final results...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Error Loading Results</h2>
          <p className="mb-6">{contextError}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-history-primary hover:bg-history-primary/90 text-white"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">No game data found for this session.</p>
          <Button onClick={handlePlayAgain}>Start New Game</Button>
        </div>
      </div>
    );
  }

  // Calculate final score using the standardized scoring system
  const roundScores = roundResults.map(result => {
    // If xpWhere and xpWhen are already calculated, use them
    if (result.xpWhere !== undefined && result.xpWhen !== undefined) {
      return {
        roundXP: result.xpWhere + result.xpWhen,
        roundPercent: result.accuracy !== undefined ? result.accuracy : 
          ((result.xpWhere + result.xpWhen) / 200) * 100 // Calculate percentage if not provided
      };
    }
    
    // Otherwise calculate from raw data
    const img = images.find(img => img.id === result.imageId);
    if (!img || result.distanceKm === null || result.guessYear === null) {
      return { roundXP: 0, roundPercent: 0 };
    }
    
    const locationXP = formatInteger(calculateLocationAccuracy(result.distanceKm));
    const timeXP = formatInteger(calculateTimeAccuracy(result.guessYear, img.year));
    
    return {
      roundXP: locationXP + timeXP,
      roundPercent: ((locationXP + timeXP) / 200) * 100
    };
  });
  
  // Calculate final score and percentage
  const { finalXP, finalPercent } = calculateFinalScore(roundScores);
  
  // Use the calculated values
  const totalScore = formatInteger(finalXP);
  const totalPercentage = formatInteger(finalPercent);

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      {/* Navbar from TestLayout - exactly like Home page */}
      <nav className="sticky top-0 z-50 bg-history-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            
            {/* Show global stats outside of games */}
            <div className="flex items-center gap-2">
              <Badge variant="accuracy" className="flex items-center gap-1 text-sm" aria-label={`Global Accuracy: ${Math.round(globalAccuracy || 0)}%`}>
                <Target className="h-4 w-4" />
                <span>{Math.round(globalAccuracy || 0)}%</span>
              </Badge>
              <Badge variant="xp" className="flex items-center gap-1 text-sm" aria-label={`Global XP: ${Math.round(globalXP || 0)}`}>
                <Zap className="h-4 w-4" />
                <span>{Math.round(globalXP || 0)}</span>
              </Badge>
            </div>
            
            <NavProfile />
          </div>
        </div>
      </nav>
      
      <div className="flex-grow p-4 sm:p-6 md:p-8 pb-36"> {/* Add extra bottom padding for sticky footer */}
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-history-primary dark:text-history-light">
              Final Score
            </h1>
            <div className="flex justify-center items-center gap-4 mt-2">
              <Badge variant="accuracy" className="text-lg flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(totalPercentage)}%`}>
                <Target className="h-4 w-4" />
                <span>{formatInteger(totalPercentage)}%</span>
              </Badge>
              <Badge variant="xp" className="text-lg flex items-center gap-1" aria-label={`XP: ${formatInteger(totalScore)}`}>
                <Zap className="h-4 w-4" />
                <span>{formatInteger(totalScore)}</span>
              </Badge>
            </div>
          </div>

        <div className="grid gap-6 mb-8">
          {images.map((image, index) => {
            const result = roundResults?.[index];
            const yearDifference = result?.guessYear && image.year ? 
              Math.abs(result.guessYear - image.year) : 0;
            let roundPercentage = 0;
            if (result?.accuracy !== undefined) {
              roundPercentage = result.accuracy;
            } else if (result?.xpWhere !== undefined && result?.xpWhen !== undefined) {
              roundPercentage = ((result.xpWhere + result.xpWhen) / 200) * 100;
            } else if (result?.distanceKm !== null && result?.guessYear !== null) {
              const locationXP = formatInteger(calculateLocationAccuracy(result.distanceKm || 0));
              const timeXP = formatInteger(calculateTimeAccuracy(result.guessYear || 0, image.year || 0));
              roundPercentage = ((locationXP + timeXP) / 200) * 100;
            }
            // Toggle state for details
            const [open, setOpen] = React.useState(false);
            return (
              <div
                key={image.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={image.url}
                      alt={`Round ${index + 1} - ${image.title}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-4 md:w-2/3">
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className="cursor-pointer w-full"
                        onClick={() => setOpen(!open)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={open}
                        aria-controls={`details-${image.id}`}
                      >
                        <h3 className="text-lg font-bold text-history-primary dark:text-history-light">
                          {image.title || ""}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(roundPercentage)}%`}>
                            <Target className="h-3 w-3" />
                            <span>{formatInteger(roundPercentage)}%</span>
                          </Badge>
                          <Badge variant="xp" className="flex items-center gap-1" aria-label={`XP: ${formatInteger(result?.score || 0)}`}>
                            <Zap className="h-3 w-3" />
                            <span>{formatInteger(result?.score || 0)}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Badge variant="selectedValue" className="text-xs mt-1">
                            {image.location_name} ({image.year})
                          </Badge>
                        </p>
                      </div>
                    </div>
                    {open && (
                      <div className="details" id={`details-${image.id}`}> 
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                            <div className="flex items-center mb-2">
                              <MapPin className="h-4 w-4 mr-1 text-history-primary" />
                              <span className="text-sm font-medium text-history-primary dark:text-history-light">Where</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-history-primary dark:text-history-light">
                                {result?.distanceKm === 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                                ) : (
                                  result?.distanceKm == null ? '? km off' : `${formatInteger(result.distanceKm)} km off`
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="accuracy" className="text-xs flex items-center gap-1" aria-label={`Location Accuracy: ${formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}%`}>
                                  <Target className="h-2 w-2" />
                                  <span>{formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}%</span>
                                </Badge>
                                <Badge variant="xp" className="text-xs flex items-center gap-1" aria-label={`Location XP: ${formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}`}>
                                  <Zap className="h-2 w-2" />
                                  <span>{formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-4 w-4 mr-1 text-history-primary" />
                              <span className="text-sm font-medium text-history-primary dark:text-history-light">When</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-history-primary dark:text-history-light">
                                {yearDifference === 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                                ) : (
                                  yearDifference === 0 ? (<span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>) : (`${formatInteger(yearDifference)} ${yearDifference === 1 ? 'year' : 'years'} off`)
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="accuracy" className="text-xs flex items-center gap-1" aria-label={`Time Accuracy: ${formatInteger(calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}%`}>
                                  <Target className="h-2 w-2" />
                                  <span>{formatInteger(calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}%</span>
                                </Badge>
                                <Badge variant="xp" className="text-xs flex items-center gap-1" aria-label={`Time XP: ${formatInteger(result?.xpWhen ?? calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}`}>
                                  <Zap className="h-2 w-2" />
                                  <span>{formatInteger(result?.xpWhen ?? calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>


      </div>
      {/* Removed the non-sticky Share and Home buttons */}
      </div>
      {/* Sticky Play Again Button with Share and Home icons */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-md flex items-center justify-between gap-4">
          <Button
            onClick={() => {
              // Share functionality would go here
              alert("Share functionality coming soon!");
            }}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-md"
            aria-label="Share"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          
          <Button
            onClick={handlePlayAgain}
            className="flex-1 bg-history-primary hover:bg-history-primary/90 text-white gap-2 py-6 text-base"
            size="lg"
          >
            <Loader size={20} />
            Play Again
          </Button>
          
          <Button
            onClick={handleHome}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-md"
            aria-label="Home"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FinalResultsPage; 