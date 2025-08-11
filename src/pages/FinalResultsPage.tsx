import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Share2, Loader, Home, MapPin, Calendar, Target, Zap, RefreshCw } from "lucide-react";
import RoundResultCard from '@/components/RoundResultCard';
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from 'react';
import LazyImage from '@/components/ui/LazyImage';
import Logo from "@/components/Logo";
import { NavProfile } from "@/components/NavProfile";
import { formatInteger } from '@/utils/format';
import { updateUserMetrics } from '@/utils/profile/profileService';
import { supabase } from '@/integrations/supabase/client';
import { 
  calculateFinalScore,
  calculateTimeAccuracy,
  calculateLocationAccuracy
} from "@/utils/gameCalculations";
import { HINT_PENALTY } from "@/constants/hints";

const FinalResultsPage = () => {
  const navigate = useNavigate();
  const { 
    images, 
    isLoading: isContextLoading, 
    error: contextError, 
    startGame,
    resetGame,
    roundResults,
    refreshGlobalMetrics,
    globalXP = 0,
    globalAccuracy = 0,
    gameId,
    setProvisionalGlobalMetrics
  } = useGame();
  const submittedGameIdRef = useRef<string | null>(null);
  
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateMetricsAndFetchGlobal = async () => {
      if (roundResults.length === 0 || !images.length || !gameId || submittedGameIdRef.current === gameId) {
        if (submittedGameIdRef.current === gameId) {
          console.log(`Metrics for gameId ${gameId} already submitted`);
        }
        return;
      }

      console.log('Processing game results to update user metrics...');
      submittedGameIdRef.current = gameId;

      const roundScores = roundResults.map((result, index) => {
        const img = images[index];
        if (!result || !img) return { roundXP: 0, roundPercent: 0 };
        
        const locationXP = calculateLocationAccuracy(result.distanceKm || 0);
        const timeXP = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
        const roundXP = locationXP + timeXP;
        const roundPercent = (roundXP / 200) * 100;
        
        return { roundXP, roundPercent };
      });

      const { finalXP, finalPercent } = calculateFinalScore(roundScores);

      let totalHintPenalty = roundResults.reduce((sum, result) => sum + (result.hintsUsed || 0) * HINT_PENALTY.XP, 0);
      const netFinalXP = Math.max(0, Math.round(finalXP - totalHintPenalty));
      
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        try {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) throw error;
          user = data?.user || null;
        } catch (signInError) {
          console.error('Exception during anonymous sign-in:', signInError);
          return;
        }
      }
      
      if (!user) {
        console.error('Still no user ID available after anonymous sign-in attempt');
        return;
      }

      const totalWhenXP = roundResults.reduce((sum, result, index) => {
        const img = images[index];
        return sum + (result && img ? calculateTimeAccuracy(result.guessYear || 0, img.year || 0) : 0);
      }, 0);
      const totalWhereXP = roundResults.reduce((sum, result) => sum + calculateLocationAccuracy(result.distanceKm || 0), 0);
      const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
      const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;

      const metricsUpdate = {
        gameAccuracy: finalPercent,
        gameXP: netFinalXP,
        isPerfectGame: finalPercent === 100,
        locationAccuracy: totalWhereAccuracy,
        timeAccuracy: totalWhenAccuracy,
        yearBullseye: roundResults.some(result => result.guessYear === images.find(img => img.id === result.imageId)?.year),
        locationBullseye: roundResults.some(result => (result.distanceKm || 0) < 10)
      };
      
      setProvisionalGlobalMetrics(netFinalXP, finalPercent);
      
      try {
        const success = await updateUserMetrics(user.id, metricsUpdate, gameId);
        if (success) {
          await refreshGlobalMetrics();
        }
      } catch (error) {
        console.error('Error during metrics update:', error);
      }
    };
    
    updateMetricsAndFetchGlobal();
  }, [roundResults, images, gameId, setProvisionalGlobalMetrics, refreshGlobalMetrics]);

  const handlePlayAgain = async () => {
    resetGame();
    navigate('/test');
    await startGame();
  };

  const handleHome = () => {
    resetGame();
    navigate("/");
  };

  // Share game results via Web Share API with clipboard fallback
  const handleShare = async () => {
    const shareText = `I scored ${totalScore} XP (${totalPercentage}% accuracy) in Guess History! Can you beat my score?`;
    const shareData = {
      title: 'Guess History - My Game Results',
      text: shareText,
      url: window.location.origin
    } as ShareData;

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`);
        alert('Results copied to clipboard!');
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = `${shareText}\n${window.location.origin}`;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Results copied to clipboard!');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Error sharing results:', err);
        alert('Could not share results. Please try again.');
      }
    }
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
          <Button onClick={() => navigate("/")} className="bg-history-primary hover:bg-history-primary/90 text-white">Return to Home</Button>
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

  const roundScores = roundResults.map((result, index) => {
    const img = images[index];
    if (!result || !img) return { roundXP: 0, roundPercent: 0 };
    const locationXP = calculateLocationAccuracy(result.distanceKm || 0);
    const timeXP = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
    const roundXP = locationXP + timeXP;
    const roundPercent = (roundXP / 200) * 100;
    return { roundXP, roundPercent };
  });
  
  const { finalXP, finalPercent } = calculateFinalScore(roundScores);
  
  let whenXpDebt = 0;
  let whereXpDebt = 0;
  let whenAccDebt = 0;
  let whereAccDebt = 0;
  let totalWhenXP = 0;
  let totalWhereXP = 0;

  roundResults.forEach((result, index) => {
    const hintsUsed = result.hintsUsed || 0;
    const whenHints = Math.floor(hintsUsed / 2);
    const whereHints = hintsUsed - whenHints;
    
    whenXpDebt += whenHints * HINT_PENALTY.XP;
    whenAccDebt += whenHints * HINT_PENALTY.ACCURACY_PERCENT;
    whereXpDebt += whereHints * HINT_PENALTY.XP;
    whereAccDebt += whereHints * HINT_PENALTY.ACCURACY_PERCENT;

    const img = images[index];
    if (result && img) {
      totalWhenXP += calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
      totalWhereXP += calculateLocationAccuracy(result.distanceKm || 0);
    }
  });

  const totalHintPenalty = roundResults.reduce((sum, result) => sum + (result.hintsUsed || 0) * HINT_PENALTY.XP, 0);
  const netFinalXP = Math.max(0, Math.round(finalXP - totalHintPenalty));
  const totalScore = formatInteger(netFinalXP);
  const totalPercentage = formatInteger(finalPercent);
  const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
  const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <nav className={`sticky top-0 z-50 text-white transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center gap-4">
  <Badge variant="accuracy" className="flex items-center gap-1 text-lg" aria-label={`Global Accuracy: ${Math.round(globalAccuracy || 0)}%`}>
    <Target className="h-4 w-4" />
    <span>{Math.round(globalAccuracy || 0)}%</span>
  </Badge>
  <Badge variant="xp" className="flex items-center gap-1 text-lg" aria-label={`Global XP: ${Math.round(globalXP || 0)}`}>
    <Zap className="h-4 w-4" />
    <span>{Math.round(globalXP || 0)}</span>
  </Badge>
</div>
            <NavProfile />
          </div>
        </div>
      </nav>

      <main className="flex-grow p-4 sm:p-6 md:p-8 pb-36">
        <div className="max-w-4xl mx-auto w-full">
          <header className="text-center mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-history-primary dark:text-history-light">
              FINAL SCORE
            </h1>
            <div className="flex justify-center items-center gap-4 mt-2">
              <Badge variant="accuracy" className="text-lg flex items-center gap-1" aria-label={`Accuracy: ${totalPercentage}%`}>
                <Target className="h-4 w-4" />
                <span>{totalPercentage}%</span>
              </Badge>
              <Badge variant="xp" className="text-lg flex items-center gap-1" aria-label={`XP: ${totalScore}`}>
                <Zap className="h-4 w-4" />
                <span>{totalScore}</span>
              </Badge>
            </div>
          </header>

          <section className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-history-primary dark:text-history-light">ROUND SUMMARY</h2>
              <button 
                onClick={() => setIsRoundSummaryOpen(!isRoundSummaryOpen)}
                className="text-sm text-gray-600 dark:text-gray-300 flex items-center"
                aria-expanded={isRoundSummaryOpen}
                aria-controls="round-summary-content"
              >
                Details
                <svg 
                  className={`ml-1 h-4 w-4 transition-transform ${isRoundSummaryOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            {isRoundSummaryOpen && (
              <div id="round-summary-content" className="mt-4">
                <div className="flex flex-row justify-center gap-16">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-history-primary dark:text-history-light mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-history-primary" />
                      WHEN
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <Badge variant="accuracy" className="text-sm">{formatInteger(totalWhenAccuracy)}%</Badge>
                        {whenAccDebt > 0 && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">-{formatInteger(whenAccDebt)}%</span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <Badge variant="xp" className="text-sm">{formatInteger(totalWhenXP)} XP</Badge>
                        {whenXpDebt > 0 && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">-{formatInteger(whenXpDebt)} XP</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-history-primary dark:text-history-light mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-history-primary" />
                      WHERE
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <Badge variant="accuracy" className="text-sm">{formatInteger(totalWhereAccuracy)}%</Badge>
                        {whereAccDebt > 0 && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">-{formatInteger(whereAccDebt)}%</span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <Badge variant="xp" className="text-sm">{formatInteger(totalWhereXP)} XP</Badge>
                        {whereXpDebt > 0 && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400 mt-0.5">-{formatInteger(whereXpDebt)} XP</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-6 mb-8">
            {images.map((image, index) => {
              const result = roundResults?.[index];
              if (!result) return null;
              return <RoundResultCard key={image.id} image={image} result={result} index={index} />;
            })}
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-md flex items-center justify-between gap-4">
          <Button onClick={handleShare} variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-md" aria-label="Share your score">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button onClick={handlePlayAgain} className="flex-1 bg-orange-500 text-white hover:bg-orange-600 gap-2 py-6 text-base" size="lg">
            <RefreshCw className="h-5 w-5" />
            Play Again
          </Button>
          <Button onClick={handleHome} variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-md" aria-label="Home">
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default FinalResultsPage;