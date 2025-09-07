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
import { BadgeEarnedPopup } from '@/components/badges/BadgeEarnedPopup';
import { checkAndAwardBadges } from '@/utils/badges/badgeService';
import type { Badge as EarnedBadgeType, BadgeRequirementCode } from '@/utils/badges/types';
import { awardGameAchievements } from '@/utils/achievements';
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
import { getLevelUpConstraints } from '@/lib/levelUpConfig';

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
  const awardsSubmittedRef = useRef<boolean>(false);
  
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
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadgeType[]>([]);
  const [activeBadge, setActiveBadge] = React.useState<EarnedBadgeType | null>(null);
  const currentLevelFromPath = React.useMemo(() => {
    if (!location.pathname.startsWith('/level')) return null;
    const match = location.pathname.match(/^\/level(?:\/(\d+))?/);
    return match && match[1] ? parseInt(match[1], 10) : 1;
  }, [location.pathname]);

  // Compute Level Up route and constraints early to keep hooks order stable across renders
  const isLevelUp = location.pathname.includes('/level/');
  const levelConstraints = React.useMemo(() => {
    if (!isLevelUp) return null;
    const lvl = typeof currentLevelFromPath === 'number' ? currentLevelFromPath : 1;
    return getLevelUpConstraints(lvl);
  }, [isLevelUp, currentLevelFromPath]);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // currentLevelFromPath is used for UI text (banner and Continue button)

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
          // round_hints is not part of generated Database types; use expect-error and cast result shape
          // @ts-expect-error round_hints table is not in generated types yet
          const { data: rawRows, error } = await supabase
            .from('round_hints')
            .select('round_id, xpDebt, accDebt')
            .eq('user_id', user.id)
            .in('round_id', roundIds);
          if (error) {
            console.warn('[FinalResults] hint debts query error', error);
          } else if (Array.isArray(rawRows) && rawRows.length) {
            const rows = (rawRows as unknown) as Array<{ round_id: string; xpDebt: number | null; accDebt: number | null }>;
            for (const r of rows) {
              const rid = r.round_id;
              const xd = Number(r.xpDebt) || 0;
              const ad = Number(r.accDebt) || 0;
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
      const perRoundDerived = images.map((img, idx) => {
        const result = roundResults[idx];
        if (!img || !result) return { netPercent: 0, timeNet: 0, locNet: 0 };
        const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
        const locAcc = calculateLocationAccuracy(result.distanceKm || 0);
        const rid = roomId ? makeRoundId(roomId, idx + 1) : (gameId ? makeRoundId(gameId, idx + 1) : '');
        const accDebt = rid ? (perRoundAccDebt[rid] || 0) : 0;
        const netPercent = computeRoundNetPercent(timeAcc, locAcc, accDebt);
        const timeNet = Math.max(0, Math.round(timeAcc - accDebt));
        const locNet = Math.max(0, Math.round(locAcc - accDebt));
        return { netPercent, timeNet, locNet };
      });
      const perRoundNetPercents = perRoundDerived.map(d => d.netPercent);
      const perRoundBestAxisNet = perRoundDerived.map(d => Math.max(d.timeNet, d.locNet));
      const bestAxisNetAfterPenalties = perRoundBestAxisNet.length > 0 ? Math.max(...perRoundBestAxisNet) : 0;
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
            const axisPass = bestAxisNetAfterPenalties >= 70; // Best time or location accuracy (after penalties) ≥ 70%
            const passed = overallPass && axisPass;
            if (import.meta.env.DEV) {
              console.log('[LevelUp] overallPass:', overallPass, 'axisPass:', axisPass, 'passed:', passed);
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
                } else if (gameRow && typeof gameRow.level === 'number') {
                  currentLevel = gameRow.level;
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

      // Award game-level achievements and evaluate/display earned badges once per game
      if (!awardsSubmittedRef.current) {
        try {
          // Upsert achievements for this game/session (deduped by context)
          const actualYears = images.map((img) => img.year || 0);
          await awardGameAchievements({
            userId: user.id,
            contextId: roomId || gameId || null,
            actualYears,
            results: roundResults,
          });

          // Build userMetrics for badge evaluation (game-level)
          const perfectRoundsCount = roundResults.reduce((sum, r, idx) => {
            const img = images[idx];
            if (!img || !r) return sum;
            const timePerfect = typeof r.guessYear === 'number' && typeof img.year === 'number' && Math.abs(r.guessYear - img.year) === 0;
            const locPerfect = r.distanceKm === 0;
            return sum + (timePerfect && locPerfect ? 1 : 0);
          }, 0);

          const yearBullseyeCount = roundResults.reduce((sum, r, idx) => {
            const img = images[idx];
            if (!img || !r) return sum;
            const ok = typeof r.guessYear === 'number' && typeof img.year === 'number' && Math.abs(r.guessYear - img.year) === 0;
            return sum + (ok ? 1 : 0);
          }, 0);

          const locationBullseyeCount = roundResults.reduce((sum, r) => sum + (r && r.distanceKm === 0 ? 1 : 0), 0);

          const userMetrics: Record<BadgeRequirementCode, number> = {
            games_played: 1,
            perfect_rounds: perfectRoundsCount,
            perfect_games: finalPercentNet === 100 ? 1 : 0,
            time_accuracy: Math.round(totalWhenAccuracy),
            location_accuracy: Math.round(totalWhereAccuracy),
            overall_accuracy: Math.round(finalPercentNet),
            win_streak: 0,
            daily_streak: 0,
            xp_total: netFinalXP,
            year_bullseye: yearBullseyeCount,
            location_bullseye: locationBullseyeCount,
          };

          const newlyEarned = await checkAndAwardBadges(user.id, userMetrics);
          if (newlyEarned && newlyEarned.length > 0) {
            setEarnedBadges(newlyEarned);
          }
        } catch (e) {
          console.warn('[FinalResults] exception during awarding game achievements/badges', e);
        } finally {
          awardsSubmittedRef.current = true;
        }
      }
    };

    updateMetricsAndFetchGlobal();
  }, [roundResults, images, gameId, roomId, setProvisionalGlobalMetrics, refreshGlobalMetrics]);

  // Manage active badge popup from queue
  useEffect(() => {
    if (!activeBadge && earnedBadges.length > 0) {
      setActiveBadge(earnedBadges[0]);
    }
  }, [earnedBadges, activeBadge]);

  const handleBadgePopupClose = () => {
    setEarnedBadges((prev) => prev.slice(1));
    setActiveBadge(null);
  };

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

  const handleContinueNextLevel = async () => {
    try {
      resetGame();
      const nextLevel = (typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2);
      await startLevelUpGame(nextLevel);
    } catch (error) {
      console.error('Error in handleContinueNextLevel:', error);
      navigate('/home');
    }
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
    } catch (err: unknown) {
      const name = (typeof err === 'object' && err && 'name' in err) ? (err as { name?: string }).name : undefined;
      if (name !== 'AbortError') {
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
  const perRoundDerived = images.map((img, idx) => {
    const result = roundResults[idx];
    if (!img || !result) return { netPercent: 0, timeNet: 0, locNet: 0 };
    const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
    const locAcc = calculateLocationAccuracy(result.distanceKm || 0);
    const rid = roomId ? makeRoundId(roomId, idx + 1) : (gameId ? makeRoundId(gameId, idx + 1) : '');
    const accDebt = rid ? (accDebtByRound[rid] || 0) : 0;
    const netPercent = computeRoundNetPercent(timeAcc, locAcc, accDebt);
    const timeNet = Math.max(0, Math.round(timeAcc - accDebt));
    const locNet = Math.max(0, Math.round(locAcc - accDebt));
    return { netPercent, timeNet, locNet };
  });
  const perRoundNetPercents: number[] = perRoundDerived.map(d => d.netPercent);
  const finalPercentNet = averagePercent(perRoundNetPercents);
  const perRoundBestAxisNet: number[] = perRoundDerived.map(d => Math.max(d.timeNet, d.locNet));
  const bestAxisNetAfterPenalties = perRoundBestAxisNet.length > 0 ? Math.max(...perRoundBestAxisNet) : 0;
  const netFinalXP = Math.max(0, Math.round(finalXP - (totalXpDebtState || 0)));
  const totalScore = formatInteger(netFinalXP);
  const totalPercentage = formatInteger(finalPercentNet);
  // Compute dynamic targets for current level when in Level Up mode (constraints computed above)
  const overallTarget = levelConstraints?.requiredOverallAccuracy ?? 50;
  const axisTarget = levelConstraints?.requiredRoundAccuracy ?? 70;
  const overallPass = finalPercentNet >= overallTarget;
  const axisPass = bestAxisNetAfterPenalties >= axisTarget; // Best time or location accuracy (after penalties)
  const passed = overallPass && axisPass;
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
              <LevelResultBanner passed={passed} unlockedLevel={passed ? ((typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2)) : undefined} />
              <LevelRequirementCard
                title="Overall net accuracy"
                met={overallPass}
                valuePercent={finalPercentNet}
                targetLabel={`Target > ${overallTarget}%`}
                icon={<Target className="h-5 w-5" />}
              />
              <LevelRequirementCard
                title="Best accuracy"
                met={axisPass}
                valuePercent={bestAxisNetAfterPenalties}
                targetLabel={`Target > ${axisTarget}%`}
                icon={<Zap className="h-5 w-5" />}
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

      {/* Badge unlock popup (game-level) */}
      <BadgeEarnedPopup badge={activeBadge} onClose={handleBadgePopupClose} />

      <footer className="fixed bottom-0 left-0 w-full z-50 bg-black shadow-[0_-2px_12px_rgba(0,0,0,0.5)] px-4 py-3 flex justify-center items-center border-t border-gray-800">
        <div className="w-full max-w-md flex items-center justify-between gap-4">
          <Button
            onClick={handleHome}
            variant="outline"
            aria-label="Home"
            className="rounded-md p-6 bg-white text-black hover:bg-gray-100"
          >
            <Home className="h-5 w-5" />
          </Button>
          {isLevelUp && passed ? (
            <Button onClick={handleContinueNextLevel} className="flex-1 rounded-md bg-orange-500 text-white hover:bg-orange-600 gap-2 py-6 text-base" size="lg">
              <RefreshCw className="h-5 w-5" />
              {`Continue to Level ${typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2}`}
            </Button>
          ) : (
            <Button onClick={handlePlayAgain} className="flex-1 rounded-md bg-orange-500 text-white hover:bg-orange-600 gap-2 py-6 text-base" size="lg">
              <RefreshCw className="h-5 w-5" />
              Play Again
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default FinalResultsPage;