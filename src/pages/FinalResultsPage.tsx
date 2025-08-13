import React from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { Share2, Loader, Home, Target, Zap, RefreshCw } from "lucide-react";
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
  const provisionalAppliedRef = useRef<boolean>(false);
  
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = React.useState(true);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const updateMetricsAndFetchGlobal = async () => {
      // Need results and images to compute provisional values
      if (roundResults.length === 0 || !images.length) {
        return;
      }

      // Compute game totals immediately and set provisional navbar metrics synchronously
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
      const totalHintPenalty = roundResults.reduce((sum, result) => sum + (result.hintsUsed || 0) * HINT_PENALTY.XP, 0);
      const netFinalXP = Math.max(0, Math.round(finalXP - totalHintPenalty));

      // Set provisional global metrics BEFORE any network/auth calls to update navbar instantly
      // Guard so we only apply once per mount to avoid additive increases
      if (!provisionalAppliedRef.current) {
        setProvisionalGlobalMetrics(netFinalXP, finalPercent);
        provisionalAppliedRef.current = true;
      }

      // If no gameId (yet) or already submitted, skip persistence but keep provisional values
      if (!gameId || submittedGameIdRef.current === gameId) {
        if (submittedGameIdRef.current === gameId) {
          console.log(`Metrics for gameId ${gameId} already submitted`);
        }
        return;
      }

      console.log('Processing game results to update user metrics...');
      submittedGameIdRef.current = gameId;

      // Compute breakdown accuracies for persistence
      const totalWhenXP = roundResults.reduce((sum, result, index) => {
        const img = images[index];
        return sum + (result && img ? calculateTimeAccuracy(result.guessYear || 0, img.year || 0) : 0);
      }, 0);
      const totalWhereXP = roundResults.reduce((sum, result) => sum + calculateLocationAccuracy(result.distanceKm || 0), 0);
      const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
      const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;

      // Ensure we have a user (anonymous or registered)
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

      const metricsUpdate = {
        gameAccuracy: finalPercent,
        gameXP: netFinalXP,
        isPerfectGame: finalPercent === 100,
        locationAccuracy: totalWhereAccuracy,
        timeAccuracy: totalWhenAccuracy,
        yearBullseye: roundResults.some(result => result.guessYear === images.find(img => img.id === result.imageId)?.year),
        locationBullseye: roundResults.some(result => (result.distanceKm || 0) < 10)
      };

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
  
  const totalWhenXP = roundResults.reduce((sum, result, index) => {
    const img = images[index];
    return sum + (result && img ? calculateTimeAccuracy(result.guessYear || 0, img.year || 0) : 0);
  }, 0);
  const totalWhereXP = roundResults.reduce((sum, result) => {
    return sum + calculateLocationAccuracy(result.distanceKm || 0);
  }, 0);

  const totalHintPenalty = roundResults.reduce((sum, result) => sum + (result.hintsUsed || 0) * HINT_PENALTY.XP, 0);
  const netFinalXP = Math.max(0, Math.round(finalXP - totalHintPenalty));
  const totalScore = formatInteger(netFinalXP);
  const totalPercentage = formatInteger(finalPercent);
  const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
  const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;
  const totalHintsUsed = roundResults.reduce((sum, r) => sum + (r.hintsUsed || 0), 0);
  const { avgYearsOff, avgKmAway } = (() => {
    let yearDiffSum = 0;
    let kmSum = 0;
    let count = 0;
    roundResults.forEach((r, idx) => {
      const img = images[idx];
      if (!r || !img) return;
      if (typeof r.guessYear === 'number' && typeof img.year === 'number') {
        yearDiffSum += Math.abs(r.guessYear - img.year);
      }
      kmSum += Math.max(0, r.distanceKm || 0);
      count += 1;
    });
    return {
      avgYearsOff: count ? Math.round(yearDiffSum / count) : 0,
      avgKmAway: count ? Math.round((kmSum / count) * 10) / 10 : 0,
    };
  })();

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <nav className={`sticky top-0 z-50 text-white transition-all duration-300 ${isScrolled ? 'bg-white/90 dark:bg-gray-900/90 backdrop-blur shadow-lg' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center select-none">
              <Link to="/" aria-label="Home" className="text-xl font-bold">
                <span className="text-white">G-</span>
                <span className="text-orange-500">H</span>
              </Link>
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
          <div className="max-w-md mx-auto bg-[#333333] rounded-lg p-6 text-white mb-8 sm:mb-12">
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-center">FINAL SCORE</h1>
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

            {/* Detailed metrics */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#2b2b2b] rounded-md p-3">
                <div className="text-gray-300">Time Accuracy</div>
                <div className="font-semibold">{formatInteger(totalWhenAccuracy)}%</div>
              </div>
              <div className="bg-[#2b2b2b] rounded-md p-3">
                <div className="text-gray-300">Location Accuracy</div>
                <div className="font-semibold">{formatInteger(totalWhereAccuracy)}%</div>
              </div>
              <div className="bg-[#2b2b2b] rounded-md p-3">
                <div className="text-gray-300">Avg Years Off</div>
                <div className="font-semibold">{formatInteger(avgYearsOff)}</div>
              </div>
              <div className="bg-[#2b2b2b] rounded-md p-3">
                <div className="text-gray-300">Avg Km Away</div>
                <div className="font-semibold">{avgKmAway}</div>
              </div>
              <div className="bg-[#2b2b2b] rounded-md p-3 col-span-2 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-gray-300">Hints Used</div>
                  <div className="font-semibold">{totalHintsUsed}</div>
                </div>
                <div>
                  <div className="text-gray-300">Penalty Cost</div>
                  <div className="font-semibold text-red-400">-{formatInteger(totalHintPenalty)} XP</div>
                </div>
              </div>
            </div>

            {/* Share Results button under score card */}
            <div className="mt-6 flex justify-center">
              <Button onClick={handleShare} className="gap-2 bg-white text-black hover:bg-gray-100">
                <Share2 className="h-5 w-5" />
                Share Results
              </Button>
            </div>
          </div>

          {/* GAME SUMMARY removed per new design; metrics are now in the final score card */}

          <h2 className="text-lg font-bold text-history-primary dark:text-history-light mb-4 pl-4">BREAKDOWN</h2>

          <section className="grid gap-6 mb-8">
            {images.map((image, index) => {
              const result = roundResults?.[index];
              if (!result) return null;
              return (
                <div key={image.id} className="bg-[#333333] rounded-lg p-2">
                  <RoundResultCard image={image} result={result} index={index} />
                </div>
              );
            })}
          </section>
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-md flex items-center justify-between gap-4">
          <Button onClick={handleHome} variant="outline" className="gap-2 bg-white text-black hover:bg-gray-100 dark:bg-white dark:hover:bg-gray-100 dark:text-black shadow-md">
            <Home className="h-5 w-5" />
            Home
          </Button>
          <Button onClick={handlePlayAgain} className="flex-1 bg-orange-500 text-white hover:bg-orange-600 gap-2 py-6 text-base" size="lg">
            <RefreshCw className="h-5 w-5" />
            Play Again
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default FinalResultsPage;