import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import { Share2, Loader, Home, Target, Zap, RefreshCw, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { NavProfile } from "@/components/NavProfile";
import { formatInteger, kmToMi } from '@/utils/format';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { updateUserMetrics } from '@/utils/profile/profileService';
import { supabase } from '@/integrations/supabase/client';
import RoundResultCard from '@/components/RoundResultCard';
import { useGame } from "@/contexts/GameContext";
import { useAuth } from '@/contexts/AuthContext';
import { useLobbyChat } from '@/hooks/useLobbyChat';
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
import FinalScoreboard from '@/components/scoreboard/FinalScoreboard';

const FinalResultsPage = () => {
  const distanceUnit = useSettingsStore(s => s.distanceUnit);
  const yearRange = useSettingsStore(s => s.yearRange);
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
    roomId,
    syncRoomId,
    roundTimerSec,
    timerEnabled
  } = useGame();
  const { roomId: routeRoomId } = useParams<{ roomId?: string }>();
  const effectiveRoomId = React.useMemo(() => roomId || routeRoomId || null, [roomId, routeRoomId]);
  const submittedGameIdRef = useRef<string | null>(null);
  const provisionalAppliedRef = useRef<boolean>(false);
  const awardsSubmittedRef = useRef<boolean>(false);
  // In-flight guard for starting the next level; resets on failure so user can retry
  const isContinuingRef = useRef<boolean>(false);
  const restartSeedRef = useRef<string | null>(null);
  const chatListRef = React.useRef<HTMLDivElement | null>(null);
  const [chatInput, setChatInput] = React.useState('');
  const [chatCollapsed, setChatCollapsed] = React.useState(false);
  
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

  useEffect(() => {
    const isCompeteRoute = location.pathname.includes('/compete/');
    if (isCompeteRoute) {
      document.body.classList.add('mode-compete');
    }
    return () => {
      document.body.classList.remove('mode-compete');
    };
  }, [location.pathname]);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isRoundSummaryOpen, setIsRoundSummaryOpen] = React.useState(true);
  const [totalXpDebtState, setTotalXpDebtState] = React.useState(0);
  const [accDebtByRound, setAccDebtByRound] = React.useState<Record<string, number>>({});
  const [xpDebtByRound, setXpDebtByRound] = React.useState<Record<string, number>>({});
  const [accDebtWhenByRound, setAccDebtWhenByRound] = React.useState<Record<string, number>>({});
  const [accDebtWhereByRound, setAccDebtWhereByRound] = React.useState<Record<string, number>>({});
  const [xpDebtWhenByRound, setXpDebtWhenByRound] = React.useState<Record<string, number>>({});
  const [xpDebtWhereByRound, setXpDebtWhereByRound] = React.useState<Record<string, number>>({});
  const [earnedBadges, setEarnedBadges] = React.useState<EarnedBadgeType[]>([]);
  const [activeBadge, setActiveBadge] = React.useState<EarnedBadgeType | null>(null);
  const currentLevelFromPath = React.useMemo(() => {
    if (!location.pathname.startsWith('/level')) return null;
    const match = location.pathname.match(/^\/level(?:\/(\d+))?/);
    return match && match[1] ? parseInt(match[1], 10) : 1;
  }, [location.pathname]);

  // Compute Level Up route and constraints early to keep hooks order stable across renders
  const isLevelUp = location.pathname.includes('/level/');
  const isSyncCompeteRoute = React.useMemo(() => location.pathname.startsWith('/compete/sync/'), [location.pathname]);
  const { user } = useAuth();
  const { messages: lobbyMessages, sendMessage: sendLobbyMessage, status: lobbyStatus } = useLobbyChat({
    roomCode: isSyncCompeteRoute && effectiveRoomId ? effectiveRoomId : null,
    displayName: 'Player',
    userId: user?.id,
    enabled: Boolean(isSyncCompeteRoute && effectiveRoomId),
  });
  const levelConstraints = React.useMemo(() => {
    if (!isLevelUp) return null;
    const lvl = typeof currentLevelFromPath === 'number' ? currentLevelFromPath : 1;
    return getLevelUpConstraints(lvl);
  }, [isLevelUp, currentLevelFromPath]);

  const resolveLocationAccuracy = React.useCallback(
    (distanceKm: number | null | undefined): number => {
      return typeof distanceKm === 'number' ? calculateLocationAccuracy(distanceKm) : 0;
    },
  []);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatChatTime = React.useCallback((iso: string) => {
    try {
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, []);

  const handleSendChat = React.useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    const sent = sendLobbyMessage(trimmed);
    if (sent) {
      setChatInput('');
    }
  }, [chatInput, sendLobbyMessage]);

  React.useEffect(() => {
    if (chatCollapsed) return;
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lobbyMessages, chatCollapsed]);

  // Listen for restart messages from lobby chat to auto-start a new synced game
  useEffect(() => {
    if (!isSyncCompeteRoute || !effectiveRoomId) return;
    if (!Array.isArray(lobbyMessages) || lobbyMessages.length === 0) return;
    const last = lobbyMessages[lobbyMessages.length - 1];
    if (!last || typeof last.message !== 'string') return;
    if (!last.message.startsWith('restart|')) return;
    const parts = last.message.split('|');
    // Format: restart|seed|dur|enabled(1|0)|minYear|maxYear
    if (parts.length < 6) return;
    const seed = parts[1];
    if (!seed || (restartSeedRef.current && restartSeedRef.current === seed)) return;
    const dur = Number.parseInt(parts[2] || '0', 10);
    const enabled = parts[3] === '1';
    const minYear = Number.parseInt(parts[4] || '');
    const maxYear = Number.parseInt(parts[5] || '');
    restartSeedRef.current = seed;
    (async () => {
      try {
        resetGame();
        await startGame({ roomId: effectiveRoomId!, seed, competeVariant: 'sync', timerSeconds: Number.isFinite(dur) ? dur : undefined, timerEnabled: enabled, minYear: Number.isFinite(minYear) ? minYear : undefined, maxYear: Number.isFinite(maxYear) ? maxYear : undefined });
      } catch (e) {
        console.error('[FinalResultsPage] restart via chat failed', e);
      }
    })();
  }, [lobbyMessages, isSyncCompeteRoute, effectiveRoomId, resetGame, startGame]);

  React.useEffect(() => {
    if (!isSyncCompeteRoute) return;
    if (!routeRoomId) return;
    syncRoomId(routeRoomId);
  }, [isSyncCompeteRoute, routeRoomId, syncRoomId]);
  // currentLevelFromPath is used for UI text (banner and Continue button)

  React.useEffect(() => {
    const updateMetricsAndFetchGlobal = async () => {
      // Need results and images to compute provisional values
      if (roundResults.length === 0 || !images.length) {
        return;
      }

      // Compute game totals immediately and set provisional navbar metrics synchronously
      const roundScores = roundResults.map((result, index) => {
        const img = images[index];
        if (!result || !img) return { roundXP: 0, roundPercent: 0 };
        const locationXP = resolveLocationAccuracy(result?.distanceKm);
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
      const perRoundXpDebt: Record<string, number> = {};
      const perRoundAccDebtWhen: Record<string, number> = {};
      const perRoundAccDebtWhere: Record<string, number> = {};
      const perRoundXpDebtWhen: Record<string, number> = {};
      const perRoundXpDebtWhere: Record<string, number> = {};
      if ((effectiveRoomId || gameId) && images.length > 0) {
        const roomRoundIds = effectiveRoomId ? images.map((_, idx) => makeRoundId(effectiveRoomId, idx + 1)) : [];
        const gameRoundIds = !effectiveRoomId && gameId ? images.map((_, idx) => makeRoundId(gameId, idx + 1)) : [];
        const roundIds = roomRoundIds.length > 0 ? roomRoundIds : gameRoundIds;
        try {
          // round_hints is not part of generated Database types; use a loosely-typed client
          const sb: any = supabase;
          const { data: rawRows, error } = await sb
            .from('round_hints')
            .select('round_id, xpDebt, accDebt, hint_type')
            .eq('user_id', user.id)
            .in('round_id', roundIds);
          if (error) {
            console.warn('[FinalResults] hint debts query error', error);
          } else if (Array.isArray(rawRows) && rawRows.length) {
            const rows = (rawRows as unknown) as Array<{ round_id: string; xpDebt: number | null; accDebt: number | null; hint_type?: string | null }>;
            for (const r of rows) {
              const rid = r.round_id;
              const xd = Number(r.xpDebt) || 0;
              const ad = Number(r.accDebt) || 0;
              totalXpDebt += xd;
              perRoundAccDebt[rid] = (perRoundAccDebt[rid] || 0) + ad;
              perRoundXpDebt[rid] = (perRoundXpDebt[rid] || 0) + xd;
              const t = (r.hint_type || '').toLowerCase();
              if (t === 'when') {
                perRoundAccDebtWhen[rid] = (perRoundAccDebtWhen[rid] || 0) + ad;
                perRoundXpDebtWhen[rid] = (perRoundXpDebtWhen[rid] || 0) + xd;
              } else if (t === 'where') {
                perRoundAccDebtWhere[rid] = (perRoundAccDebtWhere[rid] || 0) + ad;
                perRoundXpDebtWhere[rid] = (perRoundXpDebtWhere[rid] || 0) + xd;
              }
            }
          }
        } catch (e) {
          console.warn('[FinalResults] hint debts fetch exception', e);
        }
      }

      // Persist debts to state for render usage
      setTotalXpDebtState(totalXpDebt);
      setAccDebtByRound(perRoundAccDebt);
      setXpDebtByRound(perRoundXpDebt);
      setAccDebtWhenByRound(perRoundAccDebtWhen);
      setAccDebtWhereByRound(perRoundAccDebtWhere);
      setXpDebtWhenByRound(perRoundXpDebtWhen);
      setXpDebtWhereByRound(perRoundXpDebtWhere);

      // Compute net final XP and net final accuracy using debts
      const netFinalXP = Math.max(0, Math.round(finalXP - totalXpDebt));
      const perRoundDerived = images.map((img, idx) => {
        const result = roundResults[idx];
        if (!img || !result) return { netPercent: 0, timeNet: 0, locNet: 0 };
        const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
        const locAcc = resolveLocationAccuracy(result?.distanceKm);
        const rid = effectiveRoomId ? makeRoundId(effectiveRoomId, idx + 1) : (gameId ? makeRoundId(gameId, idx + 1) : '');
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
          const sb: any = supabase;
          const { data: profile, error: profileErr } = await sb
            .from('profiles')
            .select('is_guest, level_up_best_level')
            .eq('id', user.id)
            .single();
          if (profileErr) {
            console.warn('[LevelUp] profile fetch error', profileErr);
          }

          // Determine targets for the current level using canonical constraints
          const currentLevel = (typeof currentLevelFromPath === 'number' ? currentLevelFromPath : 1);
          const constraints = getLevelUpConstraints(currentLevel);
          const overallTarget = constraints?.requiredOverallAccuracy ?? 50;
          const axisTarget = constraints?.requiredRoundAccuracy ?? 70;

          const overallPass = finalPercentNet >= overallTarget;
          const axisPass = bestAxisNetAfterPenalties >= axisTarget; // Best time or location accuracy (after penalties)
          const passed = overallPass && axisPass;
          if (import.meta.env.DEV) {
            console.log('[LevelUp] overallPass:', overallPass, 'axisPass:', axisPass, 'passed:', passed, { overallTarget, axisTarget, currentLevel });
          }

          if (passed) {
            const newLevel = currentLevel + 1;

            // Update profiles.level_up_best_level if improved
            const bestLevel = typeof profile?.level_up_best_level === 'number' ? profile.level_up_best_level : 0;
            if (newLevel > bestLevel) {
              try {
                const sb4: any = supabase;
                const { error: profileUpdateErr } = await sb4
                  .from('profiles')
                  .update({ level_up_best_level: newLevel })
                  .eq('id', user.id);
                if (profileUpdateErr) {
                  console.warn('[LevelUp] update profiles.level_up_best_level error', profileUpdateErr);
                } else if (import.meta.env.DEV) {
                  console.log('[LevelUp] profiles.level_up_best_level updated to', newLevel);
                }
                try {
                  // Notify listeners (e.g., MainNavbar/HomePage) that profile changed
                  window.dispatchEvent(new Event('profileUpdated'));
                } catch {}
              } catch (e) {
                console.warn('[LevelUp] exception updating profiles.level_up_best_level', e);
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
      const totalWhereXP = roundResults.reduce((sum, result) => sum + resolveLocationAccuracy(result?.distanceKm), 0);
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
        const path = location.pathname || '';
        const mode: 'solo' | 'level' | 'compete' | 'collaborate' =
          path.includes('/level/') ? 'level' :
          path.includes('/compete/') ? 'compete' :
          path.includes('/collaborate/') ? 'collaborate' : 'solo';
        const success = await updateUserMetrics(user.id, metricsUpdate, gameId, mode);
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
            contextId: effectiveRoomId || gameId || null,
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
  }, [roundResults, images, gameId, effectiveRoomId, setProvisionalGlobalMetrics, refreshGlobalMetrics]);

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
        // Compete mode
        const variant = path.includes('/compete/async/') ? 'async' : 'sync';
        if (variant === 'sync' && effectiveRoomId) {
          // Reuse same room/players. Broadcast a restart seed so all clients sync to the same images.
          const seed = Date.now().toString(36);
          restartSeedRef.current = seed;
          const dur = Number(roundTimerSec || 0);
          const [minY, maxY] = Array.isArray(yearRange) ? yearRange : [undefined, undefined];
          try { sendLobbyMessage?.(`restart|${seed}|${dur}|${timerEnabled ? 1 : 0}|${minY ?? ''}|${maxY ?? ''}`); } catch {}
          await startGame({ roomId: effectiveRoomId, seed, competeVariant: 'sync', timerSeconds: dur, timerEnabled, minYear: (minY as number | undefined), maxYear: (maxY as number | undefined) });
        } else {
          // Async or no roomId: fallback to creating a new room
          const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const seed = Date.now().toString(36);
          await startGame({ roomId: newRoomId, seed, competeVariant: variant, timerSeconds: Number(roundTimerSec || 0), timerEnabled, minYear: (yearRange?.[0] as number | undefined), maxYear: (yearRange?.[1] as number | undefined) });
        }
      } else if (path.startsWith('/collaborate/')) {
        // Collaborate mode - create new room with sync variant
        const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const seed = Date.now().toString(36);
        await startGame({ roomId: newRoomId, seed, competeVariant: 'sync', timerSeconds: Number(roundTimerSec || 0), timerEnabled, minYear: (yearRange?.[0] as number | undefined), maxYear: (yearRange?.[1] as number | undefined) });
      } else {
        // Default to starting a new solo game if no specific mode is detected
        await startGame({ timerSeconds: Number(roundTimerSec || 0), timerEnabled, minYear: (yearRange?.[0] as number | undefined), maxYear: (yearRange?.[1] as number | undefined) });
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

  // Shared helper to start the next Level Up game. Uses an in-flight guard and resets on failure.
  const startNextLevel = React.useCallback(async () => {
    if (isContinuingRef.current) return;
    isContinuingRef.current = true;
    try {
      resetGame();
      const nextLevel = (typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2);
      await startLevelUpGame(nextLevel);
    } catch (e) {
      console.warn('[LevelUp] startNextLevel failed', e);
    } finally {
      // Always release the guard so user can retry via the button if something failed
      isContinuingRef.current = false;
    }
  }, [currentLevelFromPath, resetGame, startLevelUpGame]);

  const handleContinueNextLevel = async () => {
    try {
      await startNextLevel();
    } catch (error) {
      console.error('Error in handleContinueNextLevel:', error);
      navigate('/home');
    }
  };

  // Share game results via Web Share API with clipboard fallback
  const handleShare = async () => {
    const shareText = `I achieved ${totalPercentage}% accuracy (${totalScore} XP) in Guess-History! Can you beat my score?`;
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

  // Note: Do not early-return before all hooks above have run; render guards are handled below in JSX

  const safeImages = Array.isArray(images) ? images : [];
  const roundScores = roundResults.map((result, index) => {
    const img = safeImages[index];
    if (!result || !img) return { roundXP: 0, roundPercent: 0 };
    const locationXP = resolveLocationAccuracy(result?.distanceKm);
    const timeXP = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
    const roundXP = locationXP + timeXP;
    const roundPercent = (roundXP / 200) * 100;
    return { roundXP, roundPercent };
  });
  
  const { finalXP, finalPercent } = calculateFinalScore(roundScores);
  
  const totalWhenXP = roundResults.reduce((sum, result, index) => {
    const img = safeImages[index];
    return sum + (result && img ? calculateTimeAccuracy(result.guessYear || 0, img.year || 0) : 0);
  }, 0);
  const totalWhereXP = roundResults.reduce((sum, result) => {
    return sum + resolveLocationAccuracy(result?.distanceKm);
  }, 0);

  // Compute net values using aggregated debts (from DB)
  const perRoundDerived = safeImages.map((img, idx) => {
    const result = roundResults[idx];
    if (!img || !result) return { netPercent: 0, timeNet: 0, locNet: 0 };
    const timeAcc = calculateTimeAccuracy(result.guessYear || 0, img.year || 0);
    const locAcc = resolveLocationAccuracy(result?.distanceKm);
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
  const { avgYearsOff, avgDistanceValue, avgDistanceUnit } = (() => {
    let yearDiffSum = 0;
    let kmSum = 0;
    let count = 0;
    roundResults.forEach((r, idx) => {
      const img = safeImages[idx];
      if (!r || !img) return;
      if (typeof r.guessYear === 'number' && typeof img.year === 'number') {
        yearDiffSum += Math.abs(r.guessYear - img.year);
      }
      kmSum += Math.max(0, r.distanceKm || 0);
      count += 1;
    });
    const avgKm = count ? (kmSum / count) : 0;
    const unit = distanceUnit === 'mi' ? 'mi' : 'km';
    const value = unit === 'mi' ? kmToMi(avgKm) : avgKm;
    // Show 1 decimal for final score card
    const rounded = Math.round(value * 10) / 10;
    return {
      avgYearsOff: count ? Math.round(yearDiffSum / count) : 0,
      avgDistanceValue: rounded,
      avgDistanceUnit: unit as 'km' | 'mi',
    };
  })();

  // Note: Auto-advance to the next Level Up is disabled.
  // Users must click the "Continue to Level {n}" button to proceed manually.

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

      {isContextLoading ? (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center">
            <Loader className="h-12 w-12 animate-spin text-history-primary mx-auto mb-4" />
            <p className="text-lg">Loading final results...</p>
          </div>
        </div>
      ) : contextError ? (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4">Error Loading Results</h2>
            <p className="mb-6">{contextError}</p>
            <Button onClick={() => navigate("/")} className="bg-history-primary hover:bg-history-primary/90 text-white">Return to Home</Button>
          </div>
        </div>
      ) : (!images || images.length === 0) ? (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center">
            <p className="mb-4">No game data found for this session.</p>
            <Button onClick={handlePlayAgain}>Start New Game</Button>
          </div>
        </div>
      ) : (
        <>
          <main className="flex-grow p-4 sm:p-6 md:p-8 pb-36">
            <div className="max-w-6xl mx-auto w-full">
              {isLevelUp && (
                <div className="bg-[#333333] rounded-lg p-4 sm:p-6 mb-6">
                  <div className="space-y-3">
                    <LevelResultBanner passed={passed} unlockedLevel={passed ? ((typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2)) : undefined} />
                    <LevelRequirementCard
                      title="Overall net accuracy"
                      met={overallPass}
                      valuePercent={finalPercentNet}
                      targetLabel={`Target > ${overallTarget}%`}
                    />
                    <LevelRequirementCard
                      title="Best accuracy"
                      met={axisPass}
                      valuePercent={bestAxisNetAfterPenalties}
                      targetLabel={`Target > ${axisTarget}%`}
                    />
                  </div>
                </div>
              )}
              <div className="bg-[#333333] rounded-lg p-6 text-white mb-8 sm:mb-12">
                <div className="hidden lg:block text-center mb-3">
                  <h1 className="text-3xl font-bold">FINAL SCORE</h1>
                </div>
                <div className="hidden lg:flex items-center justify-center mb-4">
                  <div className="flex flex-wrap items-center justify-center gap-4">
                    <Badge variant="accuracy" className="text-lg flex items-center gap-1" aria-label={`Accuracy: ${totalPercentage}%`}>
                      <Target className="h-4 w-4" />
                      <span>{totalPercentage}%</span>
                    </Badge>
                    <Badge variant="xp" className="text-lg flex items-center gap-1" aria-label={`XP: ${totalScore}`}>
                      <Zap className="h-4 w-4" />
                      <span>{totalScore}</span>
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)] lg:items-start lg:gap-10">
                  <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
                    <div className="flex flex-col items-center gap-2 lg:items-start">
                      <h1 className="text-2xl sm:text-3xl font-bold lg:hidden">FINAL SCORE</h1>
                      <div className="flex flex-wrap items-center justify-center gap-4 lg:hidden">
                        <Badge variant="accuracy" className="text-lg flex items-center gap-1" aria-label={`Accuracy: ${totalPercentage}%`}>
                          <Target className="h-4 w-4" />
                          <span>{totalPercentage}%</span>
                        </Badge>
                        <Badge variant="xp" className="text-lg flex items-center gap-1" aria-label={`XP: ${totalScore}`}>
                          <Zap className="h-4 w-4" />
                          <span>{totalScore}</span>
                        </Badge>
                      </div>
                    </div>

                    <div className="grid w-full gap-4 sm:grid-cols-2" role="group" aria-label="Accuracy breakdown">
                      <div className="rounded-lg border border-transparent bg-transparent p-2 sm:p-4">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-300">
                          <span>Time Accuracy</span>
                          <span>{formatInteger(totalWhenAccuracy)}%</span>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                          <div
                            className="h-full bg-history-secondary"
                            style={{ width: `${Math.max(0, Math.min(100, Math.round(totalWhenAccuracy)))}%` }}
                            aria-label={`Time accuracy ${formatInteger(totalWhenAccuracy)}%`}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-transparent bg-transparent p-2 sm:p-4">
                        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-gray-300">
                          <span>Location Accuracy</span>
                          <span>{formatInteger(totalWhereAccuracy)}%</span>
                        </div>
                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                          <div
                            className="h-full bg-history-secondary"
                            style={{ width: `${Math.max(0, Math.min(100, Math.round(totalWhereAccuracy)))}%` }}
                            aria-label={`Location accuracy ${formatInteger(totalWhereAccuracy)}%`}
                          />
                        </div>
                      </div>
                      <div className="hidden lg:flex col-span-2 justify-end">
                        <Button onClick={handleShare} variant="hintGradient" className="gap-2">
                          <Share2 className="h-5 w-5" />
                          Share Results
                        </Button>
                      </div>
                    </div>
                  </div>

                  <aside className="w-full bg-transparent p-5">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
                      <span>Session Stats</span>
                      <span>{roundResults.length} rounds</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-neutral-800/80 bg-[#1f1f1f] p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-400">Avg Years Off</div>
                        <div className="mt-1 text-lg font-semibold text-white">{formatInteger(avgYearsOff)}</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800/80 bg-[#1f1f1f] p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-400">Avg {avgDistanceUnit.toUpperCase()} Away</div>
                        <div className="mt-1 text-lg font-semibold text-white">{avgDistanceValue}</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800/80 bg-[#1f1f1f] p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-400">Hints Used</div>
                        <div className="mt-1 text-lg font-semibold text-white">{totalHintsUsed}</div>
                      </div>
                      <div className="rounded-lg border border-neutral-800/80 bg-[#1f1f1f] p-3">
                        <div className="text-xs uppercase tracking-wide text-neutral-400">Hint Penalties</div>
                        {totalAccDebtPercent > 0 || (totalXpDebtState ?? 0) > 0 ? (
                          <div className="mt-1 flex flex-wrap items-baseline gap-2 text-lg font-semibold text-white">
                            {totalAccDebtPercent > 0 ? <span>-{totalAccDebtPercent}%</span> : null}
                            {(totalXpDebtState ?? 0) > 0 ? <span>-{formatInteger(totalXpDebtState || 0)} XP</span> : null}
                          </div>
                        ) : (
                          <div className="mt-1 text-lg font-semibold text-white">0</div>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
                <div className="mt-6 flex w-full justify-center lg:hidden">
                  <Button onClick={handleShare} variant="hintGradient" className="gap-2">
                    <Share2 className="h-5 w-5" />
                    Share Results
                  </Button>
                </div>
              </div>

              {/* SYNC Compete: show final leaderboard for all participants */}
              {isSyncCompeteRoute && effectiveRoomId ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,3.5fr)_minmax(320px,1.5fr)]">
                  <FinalScoreboard roomId={effectiveRoomId} className="h-full" />
                  <div className="w-full rounded-xl border border-neutral-800 bg-[#333333] p-4 text-white flex flex-col">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-white" />
                        <h3 className="text-base font-semibold text-white">Chat</h3>
                        <span className="text-xs text-neutral-400">
                          {lobbyMessages.length} message{lobbyMessages.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-xs text-neutral-500">· Status: {lobbyStatus}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChatCollapsed((prev) => !prev)}
                        className="text-neutral-300 transition-colors hover:text-white"
                        aria-label={chatCollapsed ? 'Expand chat' : 'Collapse chat'}
                      >
                        {chatCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    </div>
                    {!chatCollapsed && (
                      <div className="mt-4 flex flex-1 flex-col gap-4">
                        <div
                          ref={chatListRef}
                          className="flex-1 overflow-y-auto rounded-xl border border-neutral-800 bg-black/40 px-4 py-3"
                          aria-label="Chat messages"
                        >
                          {lobbyMessages.length === 0 ? (
                            <div className="text-sm text-neutral-400">No messages yet…</div>
                          ) : (
                            lobbyMessages.map((msg) => (
                              <div key={msg.id} className="pb-3 last:pb-0">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="max-w-[70%] truncate text-sm font-semibold text-[#22d3ee]">{msg.from}</span>
                                  <span className="text-[10px] text-neutral-400">{formatChatTime(msg.timestamp)}</span>
                                </div>
                                <div className="mt-1 text-sm text-neutral-200 whitespace-pre-wrap break-words">{msg.message}</div>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendChat();
                              }
                            }}
                            placeholder={lobbyStatus === 'open' ? 'Type a message…' : 'Connecting…'}
                            className="rounded-lg border border-neutral-800 bg-black/40 text-white"
                            aria-label="Type a chat message"
                            disabled={lobbyStatus !== 'open'}
                          />
                          <Button
                            onClick={handleSendChat}
                            disabled={lobbyStatus !== 'open' || !chatInput.trim()}
                            className="bg-[#22d3ee] px-4 text-black hover:bg-[#1cbfdb] disabled:opacity-40"
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* GAME SUMMARY removed per new design; metrics are now in the final score card */}

              <h2 className="mt-12 text-lg font-bold text-history-primary dark:text-history-light mb-3">BREAKDOWN</h2>

              <section className="grid gap-6 mb-8">
                {images.map((image, index) => {
                  const result = roundResults?.[index];
                  if (!result) return null;
                  const rid = effectiveRoomId ? makeRoundId(effectiveRoomId, index + 1) : (gameId ? makeRoundId(gameId, index + 1) : '');
                  const accDebt = rid ? (accDebtByRound[rid] || 0) : 0;
                  const xpDebt = rid ? (xpDebtByRound[rid] || 0) : 0;
                  const accDebtWhen = rid ? (accDebtWhenByRound[rid] || 0) : 0;
                  const accDebtWhere = rid ? (accDebtWhereByRound[rid] || 0) : 0;
                  const xpDebtWhen = rid ? (xpDebtWhenByRound[rid] || 0) : 0;
                  const xpDebtWhere = rid ? (xpDebtWhereByRound[rid] || 0) : 0;
                  return (
                    <div key={image.id} className="bg-[#333333] rounded-lg p-2">
                      <RoundResultCard image={image} result={result} index={index} accDebt={accDebt} xpDebt={xpDebt} accDebtWhen={accDebtWhen} accDebtWhere={accDebtWhere} xpDebtWhen={xpDebtWhen} xpDebtWhere={xpDebtWhere} />
                    </div>
                  );
                })}
              </section>
            </div>
          </main>

          {/* Badge unlock popup (game-level) */}
          {activeBadge && (
            <BadgeEarnedPopup badge={activeBadge} onClose={handleBadgePopupClose} />
          )}

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
                <Button onClick={handleContinueNextLevel} className="flex-1 rounded-md bg-history-secondary text-white hover:bg-history-secondary/90 gap-2 py-6 text-base" size="lg">
                  <RefreshCw className="h-5 w-5" />
                  {`Continue to Level ${typeof currentLevelFromPath === 'number' ? currentLevelFromPath + 1 : 2}`}
                </Button>
              ) : (
                <Button onClick={handlePlayAgain} className="flex-1 rounded-md bg-history-secondary text-white hover:bg-history-secondary/90 gap-2 py-6 text-base" size="lg">
                  <RefreshCw className="h-5 w-5" />
                  Play Again
                </Button>
              )}
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default FinalResultsPage;