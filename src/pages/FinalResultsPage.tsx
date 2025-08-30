import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";

import { Share2, Loader, Home, Target, Zap, RefreshCw } from "lucide-react";
import { NavProfile } from "@/components/NavProfile";
import { formatInteger } from '@/utils/format';
import { updateUserMetrics } from '@/utils/profile/profileService';
import { supabase } from '@/integrations/supabase/client';
import RoundResultCard from '@/components/RoundResultCard';
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef } from 'react';
import { 
  calculateFinalScore,
  calculateTimeAccuracy,
  calculateLocationAccuracy,
  computeRoundNetPercent,
  averagePercent
} from "@/utils/gameCalculations";
import { makeRoundId } from "@/utils/roomState";
import LevelResultBanner from '@/components/levelup/LevelResultBanner';
import LevelRequirementCard from '@/components/levelup/LevelRequirementCard';

const FinalResultsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    images, 
    isLoading: isContextLoading, 
    error: contextError, 
    startGame,
    resetGame,
    startLevelUpGame,
    roundResults,
    refreshGlobalMetrics,
    globalXP = 0,
    globalAccuracy = 0,
    gameId,
    setProvisionalGlobalMetrics,
    roomId
  } = useGame();
  const submittedGameIdRef = useRef<string | null>(null);
  const provisionalAppliedRef = useRef<boolean>(false);
  
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
  
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = React.useState(true);
  const [totalXpDebtState, setTotalXpDebtState] = React.useState(0);
  const [accDebtByRound, setAccDebtByRound] = React.useState<Record<string, number>>({});

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

      // Set provisional global metrics ASAP (raw totals, pre-debt) to update navbar immediately
      if (!provisionalAppliedRef.current) {
        setProvisionalGlobalMetrics(finalXP, finalPercent);
        provisionalAppliedRef.current = true;
      }

      // Ensure we have a user (anonymous or registered) BEFORE fetching debts
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

      // Fetch actual debts across all rounds for this game/user
      let totalXpDebt = 0;
      const perRoundAccDebt: Record<string, number> = {};
      if ((roomId || gameId) && images.length > 0) {
        const roomRoundIds = roomId ? images.map((_, idx) => makeRoundId(roomId, idx + 1)) : [];
        const gameRoundIds = !roomId && gameId ? images.map((_, idx) => makeRoundId(gameId, idx + 1)) : [];
        const roundIds = roomRoundIds.length > 0 ? roomRoundIds : gameRoundIds;
        try {
          const { data: hintRows, error } = await supabase
            .from('round_hints')
            .select('round_id, cost_xp, cost_accuracy')
            .eq('user_id', user.id)
            .in('round_id', roundIds as any);
          if (error) {
            console.warn('[FinalResults] hint debts query error', error);
          } else if (hintRows && hintRows.length) {
            for (const r of hintRows as any[]) {
              const rid = r.round_id as string;
              const xd = Number(r.cost_xp) || 0;
              const ad = Number(r.cost_accuracy) || 0;
              totalXpDebt += xd;
              perRoundAccDebt[rid] = (perRoundAccDebt[rid] || 0) + ad;
            }
          }
        } catch (e) {
          console.warn('[FinalResults] hint debts fetch exception', e);
        }
      }

      // Persist debts to state for render usage
      setTotalXpDebtState(totalXpDebt);
      setAccDebtByRound(perRoundAccDebt);

      // Compute net final XP and net final accuracy using debts
      const netFinalXP = Math.max(0, Math.round(finalXP - totalXpDebt));
      const perRoundNetPercents: number[] = images.map((img, idx) => {
        const result = roundResults[idx];
        if (!img || !result) return 0;
        const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
        const locAcc = calculateLocationAccuracy(result.distanceKm || 0);
        const rid = roomId ? makeRoundId(roomId, idx + 1) : (gameId ? makeRoundId(gameId, idx + 1) : '');
        const accDebt = rid ? (perRoundAccDebt[rid] || 0) : 0;
        return computeRoundNetPercent(timeAcc, locAcc, accDebt);
      });
      const finalPercentNet = averagePercent(perRoundNetPercents);

      // Do not update provisional again here; refreshGlobalMetrics after persistence will sync UI

      // If no gameId (yet) or already submitted, skip persistence but keep provisional values
      if (!gameId || submittedGameIdRef.current === gameId) {
        if (submittedGameIdRef.current === gameId) {
          console.log(`Metrics for gameId ${gameId} already submitted`);
        }
        return;
      }

      console.log('Processing game results to update user metrics...');
      submittedGameIdRef.current = gameId;

      // Level Up pass/fail gate and progress persistence (run once per game after submission guard)
      try {
        const isLevelUpGame = location.pathname.includes('/level/');
        if (isLevelUpGame) {
          if (import.meta.env.DEV) {
            console.log('[LevelUp] Detected Level Up route. Evaluating pass/fail...', { finalPercentNet, perRoundNetPercents });
          }

          // Fetch profile to check guest and current best level
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('is_guest, level_up_best_level')
            .eq('id', user.id)
            .single();
          if (profileErr) {
            console.warn('[LevelUp] profile fetch error', profileErr);
          }

          const isGuest = profile?.is_guest === true;
          if (isGuest) {
            if (import.meta.env.DEV) console.log('[LevelUp] Guest user; skipping Level Up progress updates.');
          } else {
            const overallPass = finalPercentNet >= 50;
            const roundPass = perRoundNetPercents.some((p) => p >= 70);
            const passed = overallPass && roundPass;
            if (import.meta.env.DEV) {
              console.log('[LevelUp] overallPass:', overallPass, 'roundPass:', roundPass, 'passed:', passed);
            }

            if (passed) {
              // Determine current game level from games table (default 1 if missing)
              let currentLevel = 1;
              try {
                const { data: gameRow, error: gameErr } = await supabase
                  .from('games')
                  .select('level')
                  .eq('id', gameId)
                  .maybeSingle();
                if (gameErr) {
                  console.warn('[LevelUp] games level fetch error', gameErr);
                } else if (gameRow && typeof (gameRow as any).level === 'number') {
                  currentLevel = (gameRow as any).level;
                }
              } catch (e) {
                console.warn('[LevelUp] exception fetching game level', e);
              }

              const newLevel = currentLevel + 1;

              // Update games.level
              try {
                const { error: gameUpdateErr } = await supabase
                  .from('games')
                  .update({ level: newLevel })
                  .eq('id', gameId);
                if (gameUpdateErr) {
                  console.warn('[LevelUp] update games.level error', gameUpdateErr);
                } else if (import.meta.env.DEV) {
                  console.log('[LevelUp] games.level updated to', newLevel);
                }
              } catch (e) {
                console.warn('[LevelUp] exception updating games.level', e);
              }

              // Update profiles.level_up_best_level if improved
              const bestLevel = typeof profile?.level_up_best_level === 'number' ? profile.level_up_best_level : 0;
              if (newLevel > bestLevel) {
                try {
                  const { error: profileUpdateErr } = await supabase
                    .from('profiles')
                    .update({ level_up_best_level: newLevel })
                    .eq('id', user.id);
                  if (profileUpdateErr) {
                    console.warn('[LevelUp] update profiles.level_up_best_level error', profileUpdateErr);
                  } else if (import.meta.env.DEV) {
                    console.log('[LevelUp] profiles.level_up_best_level updated to', newLevel);
                  }
                } catch (e) {
                  console.warn('[LevelUp] exception updating profiles.level_up_best_level', e);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[LevelUp] exception during evaluation', e);
      }

      // Compute breakdown accuracies for persistence
      const totalWhenXP = roundResults.reduce((sum, result, index) => {
        const img = images[index];
        return sum + (result && img ? calculateTimeAccuracy(result.guessYear || 0, img.year || 0) : 0);
      }, 0);
      const totalWhereXP = roundResults.reduce((sum, result) => sum + calculateLocationAccuracy(result.distanceKm || 0), 0);
      const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
      const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;

      const metricsUpdate = {
        gameAccuracy: finalPercentNet,
        gameXP: netFinalXP,
        isPerfectGame: finalPercentNet === 100,
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
  }, [roundResults, images, gameId, roomId, setProvisionalGlobalMetrics, refreshGlobalMetrics]);

  const handlePlayAgain = async () => {
    try {
      resetGame();
      const path = location.pathname || '';
      
      // Handle different game modes based on the current path
      if (path.startsWith('/level/')) {
        // Level Up mode - preserve the current level
        const levelMatch = path.match(/^\/level(?:\/(\d+))?/);
        const level = levelMatch && levelMatch[1] ? parseInt(levelMatch[1], 10) : 1;
        await startLevelUpGame(level);
      } else if (path.startsWith('/compete/')) {
        // Compete mode - preserve variant (sync/async) and create new room
        const variant = path.includes('/compete/async/') ? 'async' : 'sync';
        const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const seed = Date.now().toString(36);
        await startGame({ roomId: newRoomId, seed, competeVariant: variant });
      } else if (path.startsWith('/collaborate/')) {
        // Collaborate mode - create new room with sync variant
        const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const seed = Date.now().toString(36);
        await startGame({ roomId: newRoomId, seed, competeVariant: 'sync' });
      } else {
        // Default to starting a new solo game if no specific mode is detected
        await startGame();
      }
    } catch (error) {
      console.error('Error in handlePlayAgain:', error);
      // Fallback to home page if there's an error
      navigate('/home');
    }
  };

  const handleHome = () => {
    resetGame();
    navigate("/home");
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

  // Compute net values using aggregated debts (from DB)
  const perRoundNetPercents: number[] = images.map((img, idx) => {
    const result = roundResults[idx];
    if (!img || !result) return 0;
    const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
    const locAcc = calculateLocationAccuracy(result.distanceKm || 0);
    const rid = roomId ? makeRoundId(roomId, idx + 1) : (gameId ? makeRoundId(gameId, idx + 1) : '');
    const accDebt = rid ? (accDebtByRound[rid] || 0) : 0;
    return computeRoundNetPercent(timeAcc, locAcc, accDebt);
  });
  const finalPercentNet = averagePercent(perRoundNetPercents);
  const netFinalXP = Math.max(0, Math.round(finalXP - (totalXpDebtState || 0)));
  const totalScore = formatInteger(netFinalXP);
  const totalPercentage = formatInteger(finalPercentNet);
  const isLevelUp = location.pathname.includes('/level/');
  const overallPass = finalPercentNet >= 50;
  const bestRoundNet = perRoundNetPercents.length > 0 ? Math.max(...perRoundNetPercents) : 0;
  const roundPass = perRoundNetPercents.some((p) => p >= 70);
  const passed = overallPass && roundPass;
  const totalWhenAccuracy = totalWhenXP > 0 ? (totalWhenXP / (roundResults.length * 100)) * 100 : 0;
  const totalWhereAccuracy = totalWhereXP > 0 ? (totalWhereXP / (roundResults.length * 100)) * 100 : 0;
  const totalHintsUsed = roundResults.reduce((sum, r) => sum + (r.hintsUsed || 0), 0);
  const totalAccDebtPercent = Object.values(accDebtByRound).reduce((sum, debt) => sum + debt, 0);
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
          {isLevelUp && (
            <div className="space-y-3 mb-6">
              <LevelResultBanner passed={passed} />
              <LevelRequirementCard
                title="Overall net accuracy ≥ 50%"
                met={overallPass}
                currentLabel={`Current: ${formatInteger(finalPercentNet)}%`}
                targetLabel="Target: ≥ 50%"
              />
              <LevelRequirementCard
                title="Any round ≥ 70% net"
                met={roundPass}
                currentLabel={`Best round: ${formatInteger(bestRoundNet)}%`}
                targetLabel="Target: ≥ 70%"
              />
            </div>
          )}
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

            {/* Accuracy progress bars */}
            <div className="mt-4 space-y-3" role="group" aria-label="Accuracy breakdown">
              <div>
                <div className="text-sm text-gray-300 mb-1 flex items-center justify-between">
                  <span>Time Accuracy</span>
                  <span>{formatInteger(totalWhenAccuracy)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(totalWhenAccuracy)))}%` }}
                    aria-label={`Time accuracy ${formatInteger(totalWhenAccuracy)}%`}
                  />
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-1 flex items-center justify-between">
                  <span>Location Accuracy</span>
                  <span>{formatInteger(totalWhereAccuracy)}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(totalWhereAccuracy)))}%` }}
                    aria-label={`Location accuracy ${formatInteger(totalWhereAccuracy)}%`}
                  />
                </div>
              </div>
            </div>

            {/* Detailed metrics */}
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
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
                  <div className="text-gray-300">Hint Penalties</div>
                  <div className="font-semibold text-red-400">
                    {totalAccDebtPercent > 0 && <span>-{totalAccDebtPercent}%</span>}
                    <span className={totalAccDebtPercent > 0 ? "ml-2" : ""}>-{formatInteger(totalXpDebtState || 0)} XP</span>
                  </div>
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

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-black shadow-[0_-2px_12px_rgba(0,0,0,0.5)] px-4 py-3 flex justify-center items-center border-t border-gray-800">
        <div className="w-full max-w-md flex items-center justify-between gap-4">
          <Button
            onClick={handleHome}
            variant="outline"
            className="rounded-full px-6 py-6 text-lg font-semibold bg-white text-black hover:bg-gray-100"
          >
            <Home className="h-5 w-5 mr-2" /> Home
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