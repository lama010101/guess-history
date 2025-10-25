import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, type CSSProperties } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader, MapPin, MessageCircle, X, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useToast } from "@/components/ui/use-toast";
import { setCurrentRoundInSession, getCurrentRoundFromSession, upsertSessionProgress, getSessionProgress } from '@/utils/roomState';
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
import { useGameLocalCountdown } from '@/gameTimer/useGameLocalCountdown';
import { buildTimerId } from '@/lib/timerId';
import { getLevelUpConstraints, setLevelUpOldestYear } from '@/lib/levelUpConfig';
import { supabase } from '@/integrations/supabase/client';
import { useRoundPeers } from '@/hooks/useRoundPeers';
import { useLobbyChat, type SubmissionBroadcast, type RoundCompleteBroadcast } from '@/hooks/useLobbyChat';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useGame } from '@/contexts/GameContext';
import type { GuessCoordinates } from '@/types';

// Cache the global minimum year to avoid repeated queries in a session
let __globalMinYearCache: number | null = null;

const GameRoundPage: React.FC = () => {
  // --- Hint system V2 ---
  const navigate = useNavigate();
  const [historyLocked, setHistoryLocked] = useState(false);
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>();
  const location = useLocation();
  const historyLockIdRef = useRef(0);
  const lockedUrlRef = useRef<string | null>(null);
  // Derive base mode path (everything before '/game/') to keep navigation inside the current mode (e.g., /level, /solo, /compete/sync)
  const modeBasePath = useMemo(() => {
    const path = location.pathname;
    const idx = path.indexOf('/game/');
    return idx > 0 ? path.slice(0, idx) : '/solo';
  }, [location.pathname]);
  const isCompeteMode = useMemo(() => modeBasePath.startsWith('/compete'), [modeBasePath]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isCompeteMode) {
      document.body.classList.add('mode-compete');
    } else {
      document.body.classList.remove('mode-compete');
    }
    return () => {
      document.body.classList.remove('mode-compete');
    };
  }, [isCompeteMode]);
  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1;
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
  const { isLoading: authLoading, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const rushAudioRef = useRef<HTMLAudioElement | null>(null);
  const { soundEnabled, vibrateEnabled, yearRange: settingsYearRange } = useSettingsStore();
  const avatarClusterRef = useRef<HTMLDivElement | null>(null);
  const [chatPanelStyle, setChatPanelStyle] = useState<CSSProperties | null>(null);
  const [waitingForPeers, setWaitingForPeers] = useState(false);
  const [submittedCounts, setSubmittedCounts] = useState<{ submitted: number; total: number }>({ submitted: 0, total: 0 });
  const [hasSubmittedThisRound, setHasSubmittedThisRound] = useState(false);
  const hasNavigatedToResultsRef = useRef(false);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const submissionNoticeTimeoutRef = useRef<number | null>(null);
  const [flashActive, setFlashActive] = useState(false);
  const flashTimeoutRef = useRef<number | null>(null);
  const pendingClampRef = useRef(false);
  const hasClampedThisRound = useRef(false);
  const timerEnabledRef = useRef(false);
  const timerReadyRef = useRef(false);
  const remainingTimeRef = useRef(0);
  const clampRemainingRef = useRef<(seconds: number) => void>(() => {});
  const submittedPeerIdsRef = useRef<Set<string>>(new Set());
  const awaitingSubmissionAckRef = useRef(false);
  const recentSubmitterIdsRef = useRef<Record<string, boolean>>({});
  const [recentSubmitterIds, setRecentSubmitterIds] = useState<Record<string, boolean>>({});
  const [peerProfileCache, setPeerProfileCache] = useState<Record<string, { displayName: string; avatarUrl: string | null }>>({});
  const [cachedPeerRoster, setCachedPeerRoster] = useState<Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isSelf: boolean;
    submitted: boolean;
    recentlySubmitted: boolean;
  }>>([]);
  const [lobbyRoster, setLobbyRoster] = useState<Array<{ id: string; name: string; ready: boolean; host: boolean }>>([]);
  const makeRosterId = useCallback((userId?: string | null, fallbackName?: string | null) => {
    if (userId && userId.trim().length > 0) {
      return userId;
    }
    if (fallbackName && fallbackName.trim().length > 0) {
      return `name:${fallbackName.trim().toLowerCase()}`;
    }
    return '';
  }, []);

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
    syncRoomId,
    authoritativeTimer,
    setAuthoritativeTimer,
  } = useGame();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!historyLocked) return;

    const lockId = ++historyLockIdRef.current;
    lockedUrlRef.current = window.location.href;

    const restoreLockedUrl = () => {
      if (historyLockIdRef.current !== lockId) return;
      const targetUrl = lockedUrlRef.current ?? window.location.href;
      try {
        if (window.location.href !== targetUrl) {
          window.history.replaceState(null, '', targetUrl);
        } else {
          window.history.pushState(null, '', targetUrl);
        }
      } catch {}
    };

    // Prime the history stack so the first back press keeps the user on the page.
    try {
      window.history.pushState(null, '', lockedUrlRef.current);
    } catch {}

    const handlePop = (event: PopStateEvent) => {
      if (historyLockIdRef.current !== lockId) return;
      event.preventDefault?.();
      event.stopImmediatePropagation?.();
      // Restore immediately to prevent rapid back presses from slipping through,
      // then schedule a follow-up to outlast router updates.
      restoreLockedUrl();
      setTimeout(restoreLockedUrl, 0);
    };

    window.addEventListener('popstate', handlePop);

    return () => {
      historyLockIdRef.current += 1;
      window.removeEventListener('popstate', handlePop);
    };
  }, [historyLocked]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!historyLocked) return;
    lockedUrlRef.current = window.location.href;
    try {
      window.history.replaceState(null, '', lockedUrlRef.current);
    } catch {}
  }, [historyLocked, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!roomId) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [roomId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key || '';
      const lower = key.toLowerCase();
      const isF5 = key === 'F5';
      const isSoftRefresh = (event.ctrlKey || event.metaKey) && lower === 'r';
      const isHardRefresh = (event.ctrlKey || event.metaKey) && event.shiftKey && lower === 'r';
      if (isF5 || isSoftRefresh || isHardRefresh) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const verifyAndResync = useCallback(async () => {
    try {
      if (!roomId) return;
      await syncRoomId(roomId);
      if (!images || images.length === 0) {
        await hydrateRoomImages(roomId);
      }

      const [serverRound, session] = await Promise.all([
        getCurrentRoundFromSession(roomId),
        getSessionProgress(roomId),
      ]);

      if (typeof serverRound === 'number' && Number.isFinite(serverRound) && serverRound > 0 && serverRound !== roundNumber) {
        navigate(`${modeBasePath}/game/room/${roomId}/round/${serverRound}`, { replace: true });
        return;
      }

      if (session?.current_route && session.current_route !== location.pathname) {
        navigate(session.current_route, { replace: true });
      }
    } catch (err) {
      console.warn('[GameRoundPage] verifyAndResync failed', err);
    }
  }, [roomId, syncRoomId, hydrateRoomImages, images, roundNumber, navigate, modeBasePath, location.pathname]);

  useEffect(() => {
    void verifyAndResync();
  }, [verifyAndResync]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePageShow = (event: Event) => {
      const pageEvent = event as PageTransitionEvent;
      if ((pageEvent as any)?.persisted) {
        void verifyAndResync();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [verifyAndResync]);
  const registerRecentSubmitter = useCallback((userId?: string | null, fallbackName?: string | null) => {
    const rosterId = makeRosterId(userId, fallbackName);
    if (!rosterId) return;
    setRecentSubmitterIds((prev) => {
      if (prev[rosterId]) return prev;
      const next = { ...prev, [rosterId]: true };
      recentSubmitterIdsRef.current = next;
      return next;
    });
  }, [makeRosterId]);

  const triggerFlash = useCallback(() => {
    if (flashTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(flashTimeoutRef.current);
    }
    setFlashActive(true);
    if (typeof window !== 'undefined') {
      flashTimeoutRef.current = window.setTimeout(() => {
        setFlashActive(false);
        flashTimeoutRef.current = null;
      }, 450);
    }
  }, []);

  const showSubmissionNotice = useCallback((message: string) => {
    if (submissionNoticeTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(submissionNoticeTimeoutRef.current);
    }
    setSubmissionNotice(message);
    if (typeof window !== 'undefined') {
      submissionNoticeTimeoutRef.current = window.setTimeout(() => {
        setSubmissionNotice(null);
        submissionNoticeTimeoutRef.current = null;
      }, 3000);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      rushAudioRef.current = new Audio('/sounds/countdown-beep.mp3');
      rushAudioRef.current.preload = 'auto';
    }

    return () => {
      if (rushAudioRef.current) {
        rushAudioRef.current.pause();
        rushAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        const userProfile = await fetchUserProfile(user.id);
        setProfile(userProfile);
      }
    };
    loadProfile();
  }, [user]);

  const triggerCountdownRushFeedback = useCallback(() => {
    if (soundEnabled && rushAudioRef.current) {
      try {
        const burst = rushAudioRef.current.cloneNode() as HTMLAudioElement;
        burst.volume = 1.0;
        burst.play().catch(() => {});
      } catch {}
    }
    if (
      vibrateEnabled &&
      typeof navigator !== 'undefined' &&
      typeof (navigator as any).vibrate === 'function'
    ) {
      try { (navigator as any).vibrate([120, 60, 120]); } catch {}
    }
  }, [soundEnabled, vibrateEnabled]);

  const applyCountdownRush = useCallback(() => {
    if (!timerEnabledRef.current) return;
    if (hasClampedThisRound.current) return;

    const clampTarget = 15;

    hasClampedThisRound.current = true;

    if (timerReadyRef.current) {
      clampRemainingRef.current(clampTarget);
    } else {
      pendingClampRef.current = true;
    }

    setRemainingTime((prev) => (prev > clampTarget ? clampTarget : prev));
    triggerCountdownRushFeedback();
  }, [triggerCountdownRushFeedback]);

  const displayName = useMemo(() => {
    const derived = profile?.display_name || user?.user_metadata?.display_name || user?.email || 'Anonymous';
    return String(derived ?? '').trim() || 'Anonymous';
  }, [profile?.display_name, user?.user_metadata?.display_name, user?.email]);

  const handleSubmissionBroadcast = useCallback((payload: SubmissionBroadcast) => {
    if (!isCompeteMode) return;
    if (!Number.isFinite(roundNumber) || payload.roundNumber !== roundNumber) return;

    setSubmittedCounts((prev) => ({
      submitted: Math.max(prev.submitted, payload.submittedCount),
      total: Math.max(prev.total, payload.totalPlayers),
    }));

    const totalPlayers = payload.totalPlayers;
    const submittedCount = payload.submittedCount;
    const currentUserId = user?.id ?? null;
    const isSelf = !!currentUserId && payload.userId && payload.userId === currentUserId;
    if (!isSelf) {
      const name = payload.from?.trim() ? payload.from : 'Another player';
      const progressLabel = totalPlayers > 0 ? ` (${submittedCount}/${totalPlayers})` : '';
      showSubmissionNotice(`${name} submitted${progressLabel}`);
      registerRecentSubmitter(payload.userId ?? null, payload.from ?? null);
      triggerFlash();

      if (timerEnabledRef.current && submittedCount === 1 && remainingTimeRef.current > 15) {
        applyCountdownRush();
      }
    }

    if (!hasSubmittedThisRound && currentUserId && payload.userId && payload.userId === currentUserId) {
      setHasSubmittedThisRound(true);
      setWaitingForPeers(true);
    }
  }, [
    isCompeteMode,
    roundNumber,
    roomId,
    navigate,
    modeBasePath,
    user?.id,
    hasSubmittedThisRound,
    showSubmissionNotice,
    applyCountdownRush,
    registerRecentSubmitter,
  ]);

  const handleRoundCompleteBroadcast = useCallback((payload: RoundCompleteBroadcast) => {
    if (!isCompeteMode) return;
    if (!Number.isFinite(roundNumber) || payload.roundNumber !== roundNumber) return;

    const reportedTotal = Math.max(
      0,
      payload.totalPlayers ?? 0,
      payload.lobbySize ?? 0,
    );
    const submittedCount = payload.submittedCount ?? 0;
    const allSubmitted = reportedTotal > 0 && submittedCount >= reportedTotal;

    setSubmittedCounts((prev) => ({
      submitted: Math.max(prev.submitted, submittedCount),
      total: Math.max(prev.total, reportedTotal),
    }));
    setWaitingForPeers(!allSubmitted);

    if (allSubmitted && roomId && !hasNavigatedToResultsRef.current) {
      hasNavigatedToResultsRef.current = true;
      navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
    }
  }, [isCompeteMode, roundNumber, roomId, navigate, modeBasePath]);

  const {
    messages: chatMessages,
    sendMessage: sendChatMessage,
    status: chatStatus,
    resetChat,
    sendPayload: sendLobbyPayload,
  } = useLobbyChat({
    roomCode: isCompeteMode ? roomId : null,
    displayName,
    userId: user?.id,
    enabled: isCompeteMode && !!roomId,
    onSubmission: handleSubmissionBroadcast,
    onRoundComplete: handleRoundCompleteBroadcast,
    onRoster: (players) => {
      const deduped = new Map<string, {
        id: string;
        name: string;
        ready: boolean;
        host: boolean;
        userId?: string | null;
        avatarUrl?: string | null;
      }>();

      (players || []).forEach((player) => {
        if (!player) return;
        const raw = player as Record<string, unknown>;
        const id = typeof player.id === 'string' ? player.id.trim() : '';
        const name = typeof player.name === 'string' ? player.name.trim() : '';
        const normalizedKey = name.toLowerCase() || id;
        if (!normalizedKey) return;
        if (!deduped.has(normalizedKey)) {
          const userId = typeof raw.userId === 'string' ? raw.userId.trim() : undefined;
          const avatarPayload = typeof raw.avatar === 'string' ? raw.avatar.trim() : '';
          const avatarUrl = avatarPayload.length > 0
            ? avatarPayload
            : (typeof raw.avatarUrl === 'string' ? raw.avatarUrl.trim() : undefined);
          deduped.set(normalizedKey, {
            id: id || normalizedKey,
            name,
            ready: !!player.ready,
            host: !!player.host,
            userId,
            avatarUrl: avatarUrl && avatarUrl.length > 0 ? avatarUrl : undefined,
          });
        }
      });

      const nextRoster = Array.from(deduped.values());
      setLobbyRoster(nextRoster);

      if (nextRoster.length > 0) {
        setPeerProfileCache((prev) => {
          let updated = prev;
          let changed = false;

          (players || []).forEach((player) => {
            const raw = player as Record<string, unknown>;
            const trimmedName = typeof player.name === 'string' ? player.name.trim() : '';
            const rosterId = makeRosterId(
              typeof raw.userId === 'string' ? raw.userId : null,
              player.name || null,
            );
            const avatarPrimary = typeof raw.avatar === 'string' ? raw.avatar.trim() : '';
            const avatarFallback = typeof raw.avatarUrl === 'string' ? raw.avatarUrl.trim() : '';
            const avatarSource = avatarPrimary.length > 0
              ? avatarPrimary
              : (avatarFallback.length > 0 ? avatarFallback : null);
            const cacheKeys: string[] = rosterId
              ? [rosterId]
              : (trimmedName ? [`name:${trimmedName.toLowerCase()}`] : []);

            cacheKeys.forEach((key) => {
              const existing = updated[key];
              const nextDisplay = trimmedName || existing?.displayName || '';
              const nextAvatar = avatarSource ?? existing?.avatarUrl ?? null;

              if (nextDisplay === '' && nextAvatar === null) {
                return;
              }

              if (!existing || existing.displayName !== nextDisplay || existing.avatarUrl !== nextAvatar) {
                if (!changed) {
                  updated = { ...prev };
                  changed = true;
                }
                updated[key] = {
                  displayName: nextDisplay,
                  avatarUrl: nextAvatar,
                };
              }
            });
          });

          return changed ? updated : prev;
        });
      }
    },
  });

  useEffect(() => {
    if (!isChatOpen) return;
    const container = document.getElementById('game-chat-scroller');
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [chatMessages, isChatOpen]);

  const handleSendChat = useCallback(() => {
    const success = sendChatMessage(chatInput);
    if (success) {
      setChatInput('');
    }
  }, [chatInput, sendChatMessage]);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    try { localStorage.setItem('gh:lastChatRoom', roomId ?? ''); } catch {}
  }, [roomId]);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      const next = !prev;
      if (!next) {
        try { localStorage.setItem('gh:lastChatRoom', roomId ?? ''); } catch {}
      }
      return next;
    });
  }, [roomId]);

  const updateChatPanelPosition = useCallback(() => {
    const clusterEl = avatarClusterRef.current;
    const fallback: CSSProperties = {
      position: 'fixed',
      right: 16,
      bottom: 96,
      width: 320,
    };

    if (!clusterEl) {
      setChatPanelStyle(fallback);
      return;
    }

    const rect = clusterEl.getBoundingClientRect();
    const width = 320;
    const gap = 12;
    let left = rect.left + rect.width - width;
    left = Math.min(Math.max(left, 16), window.innerWidth - width - 16);
    const top = Math.max(gap, rect.top - gap);

    setChatPanelStyle({
      position: 'fixed',
      top,
      left,
      width,
      transform: 'translateY(-100%)',
    });
  }, []);

  useLayoutEffect(() => {
    if (!isChatOpen) return;
    updateChatPanelPosition();
  }, [isChatOpen, updateChatPanelPosition]);

  useEffect(() => {
    if (!isChatOpen) return;
    const handleUpdate = () => updateChatPanelPosition();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);
    return () => {
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isChatOpen, updateChatPanelPosition]);

  useEffect(() => {
    return () => {
      resetChat();
    };
  }, [resetChat]);

  const handleNavigateHome = useCallback(() => {
    console.log("Attempting to navigate to /home");
    navigate('/home', { replace: true });
    console.log("Called navigate('/home')");
  }, [navigate]);

  const confirmNavigation = useCallback((navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      setHistoryLocked(false);
      lockedUrlRef.current = null;
      setTimeout(() => {
        pendingNavigation();
      }, 0);
    }
  }, [pendingNavigation]);

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
  const authoritativeTimerRef = useRef<boolean>(false);
  useEffect(() => {
    authoritativeTimerRef.current = authoritativeTimer === true;
  }, [authoritativeTimer]);
  // Track how the Level Up intro was opened: automatically (round 1) or manually from HUD
  const [introSource, setIntroSource] = useState<'auto' | 'hub'>('auto');

  // Level Up guarantee: timer must be enabled even on refresh/navigation directly into Level Up routes
  useEffect(() => {
    if (isLevelUpRoute && !timerEnabled) {
      setTimerEnabled(true);
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] Enforcing timerEnabled=true for Level Up route'); } catch {}
      }
    }
  }, [isLevelUpRoute, timerEnabled, setTimerEnabled]);

  // For Level Up: auto-show intro ONLY at round 1 and gate timer start until Start is pressed
  useEffect(() => {
    if (!isLevelUpRoute) {
      setRoundStarted(true);
      return;
    }

    if (roundNumber === 1) {
      setIntroSource('auto');
      setShowIntro(true);
      setRoundStarted(false);
      setIsTimerActive(false);
      if (import.meta.env.DEV) {
        try { console.debug('[GameRoundPage] Level Up gating: auto intro (round 1) & pause timer', { roundNumber }); } catch {}
      }
    } else {
      // No auto modal beyond round 1; ensure round is considered started
      setRoundStarted(true);
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
  // Global year bounds for Solo mode (min from DB, max = current year)
  const [globalMinYear, setGlobalMinYear] = useState<number | null>(null);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Server-authoritative countdown integration
  const timerId = useMemo(() => {
    // Prefer roomId for stability across refresh: gh:{roomId}:{roundIndex}; fallback to gameId
    try {
      const baseId = roomId || gameId;
      if (!baseId || isNaN(currentRoundIndex)) return '';
      return buildTimerId(baseId, currentRoundIndex);
    } catch {
      return '';
    }
  }, [roomId, gameId, currentRoundIndex]);

  const autoStart = useMemo(() => {
    // Start local timer when timer is enabled, round began, and we are responsible for local countdown
    const expectsLocalTimer = !authoritativeTimerRef.current;
    return !!(timerEnabled && roundStarted && timerId && expectsLocalTimer);
  }, [timerEnabled, roundStarted, timerId]);
  useEffect(() => {
    if (import.meta.env.DEV) {
      try { console.debug('[GameRoundPage] timer:config', { timerId, roundTimerSec, timerEnabled, showIntro, autoStart }); } catch {}
    }
  }, [timerId, roundTimerSec, timerEnabled, showIntro, autoStart]);

  // Detailed gating breakdown for autoStart
  const autoStartMissing = useMemo(() => {
    const missing: string[] = [];
    if (!timerEnabled) missing.push('timerEnabled=false');
    if (!roundStarted) missing.push('roundStarted=false');
    if (!timerId) missing.push('timerId=empty');
    if (authoritativeTimerRef.current) missing.push('authoritativeTimer=true');
    return missing;
  }, [timerEnabled, roundStarted, timerId]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      try {
        if (!autoStart) {
          console.debug('[GameRoundPage] timer:autoStart:gating:false', {
            timerEnabled,
            roundStarted,
            hasTimerId: !!timerId,
            missing: autoStartMissing,
          });
        } else {
          console.debug('[GameRoundPage] timer:autoStart:gating:true');
        }
      } catch {}
    }
    try {
      (window as any).__gh_timer_gate = {
        timerEnabled,
        roundStarted,
        timerId,
        missing: autoStartMissing,
        ts: new Date().toISOString(),
      };
    } catch {}
  }, [autoStart, timerEnabled, roundStarted, timerId, autoStartMissing]);

  const {
    ready: timerReady,
    expired: timerExpired,
    remainingSec,
    clampRemaining,
    start: startLocalTimer,
  } = useGameLocalCountdown({
    timerId,
    durationSec: roundTimerSec,
    autoStart,
    onExpire: () => {
      if (import.meta.env.DEV) console.debug('[GameRoundPage] Timer expired');
      handleTimeComplete();
    },
  });

  useEffect(() => {
    timerEnabledRef.current = timerEnabled;
  }, [timerEnabled]);

  useEffect(() => {
    timerReadyRef.current = timerReady;
  }, [timerReady]);

  useEffect(() => {
    remainingTimeRef.current = remainingTime;
  }, [remainingTime]);

  useEffect(() => {
    clampRemainingRef.current = clampRemaining;
  }, [clampRemaining]);

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

  useEffect(() => {
    if (!autoStart || timerReady) return;
    const t = setTimeout(() => {
      try { startLocalTimer(); } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [autoStart, timerReady, startLocalTimer]);

  // Local timer does not require refetch/hydration

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
      if (persistedRound == null || isNaN(persistedRound)) return;
      // Forward-only: only redirect if the persisted round is AHEAD of the URL round.
      // This avoids racing against setCurrentRoundInSession when advancing to the next round,
      // which previously caused a bounce back to the prior round.
      if (persistedRound > roundNumber) {
        redirectedRef.done = true;
        navigate(`${modeBasePath}/game/room/${roomId}/round/${persistedRound}`);
      }
    })();
  }, [roomId, roundNumber, modeBasePath, navigate, redirectedRef]);

  // Route guard: if a result already exists for this user+room/game+round, redirect to results to prevent re-entry
  const submittedRedirectRef = useMemo(() => ({ done: false }), []);
  useEffect(() => {
    (async () => {
      try {
        if (submittedRedirectRef.done) return;
        if (isCompeteMode) return;
        if (awaitingSubmissionAckRef.current) return;
        if (!user || !user.id) return;
        if (isNaN(currentRoundIndex)) return;

        if (!roomId) {
          setHistoryLocked(false);
          return;
        }

        setHistoryLocked(true);

        const session = await getSessionProgress(roomId);
        if (session?.current_route && session.current_route !== location.pathname) {
          submittedRedirectRef.done = true;
          setHistoryLocked(false);
          navigate(session.current_route, { replace: true });
          return;
        }

        let found = false;
        // Prefer room-scoped uniqueness
        if (roomId) {
          const { data, error } = await (supabase as any)
            .from('round_results')
            .select('id')
            .eq('user_id', user.id)
            .eq('room_id', roomId)
            .eq('round_index', currentRoundIndex)
            .maybeSingle();
          if (!error && data) found = true;
        }

        // Fallback for legacy schema without room_id
        if (!found && gameId) {
          const { data, error } = await (supabase as any)
            .from('round_results')
            .select('id')
            .eq('user_id', user.id)
            .eq('game_id', gameId)
            .eq('round_index', currentRoundIndex)
            .maybeSingle();
          if (!error && data) found = true;
        }

        if (found) {
          submittedRedirectRef.done = true;
          if (import.meta.env.DEV) {
            try { console.debug('[GameRoundPage] Guard: existing result found; redirecting to results', { roundNumber, roomId, gameId }); } catch {}
          }
          navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
          setHistoryLocked(false);
        } else if (import.meta.env.DEV) {
          try { console.debug('[GameRoundPage] Guard: no existing result; allow entry', { roundNumber, roomId, gameId }); } catch {}
        }

        if (!found) {
          setHistoryLocked(true);
        }
      } catch (e) {
        try { console.warn('[GameRoundPage] Guard check failed (proceeding without redirect):', e); } catch {}
      }
    })();
  }, [user, roomId, gameId, currentRoundIndex, navigate, roundNumber, modeBasePath, submittedRedirectRef, isCompeteMode, awaitingSubmissionAckRef, location.pathname]);

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

  const effectiveRoundNumber = Number.isFinite(roundNumber) ? roundNumber : null;
  const { peers: roundPeers } = useRoundPeers(
    isCompeteMode && roomId ? roomId : null,
    isCompeteMode ? effectiveRoundNumber : null
  );

  useEffect(() => {
    if (!isCompeteMode || !roomId) {
      setSubmittedCounts({ submitted: 0, total: 0 });
      return;
    }

    const currentPlayerKey = user?.id ?? (displayName ? `name:${displayName.trim().toLowerCase()}` : null);

    const expectedTotal = Math.max(
      roundPeers.length,
      submittedCounts.total,
      submittedCounts.submitted,
      lobbyRoster.length,
    );
    const submitted = roundPeers.filter((peer) => peer.submitted).length;
    // Fallback: if we locally submitted but our DB row hasn't appeared yet,
    // treat self as submitted for the purpose of progressing to results.
    const selfId = user?.id || null;
    const selfPeer = roundPeers.find((p) => p.userId === selfId) || null;
    const submittedAdj = submitted + (hasSubmittedThisRound && (!selfPeer || selfPeer.submitted !== true) ? 1 : 0);
    const allSubmitted = expectedTotal > 0 && submittedAdj >= expectedTotal;
    setSubmittedCounts({ submitted, total: expectedTotal });

    const otherSubmitters = roundPeers.filter((peer) => {
      if (!peer.submitted) return false;
      const peerKey = peer.userId ?? (peer.displayName ? `name:${peer.displayName.trim().toLowerCase()}` : null);
      if (!peerKey) return true;
      if (currentPlayerKey && peerKey === currentPlayerKey) return false;
      return true;
    });
    const newSubmitterNames: string[] = [];

    otherSubmitters.forEach((peer) => {
      const peerKey = peer.userId
        ?? (peer.displayName ? `name:${peer.displayName.trim().toLowerCase()}` : null)
        ?? (peer.guessLat != null && peer.guessLng != null ? `coords:${peer.guessLat}:${peer.guessLng}` : `score:${peer.score}:${peer.accuracy}`);
      if (!submittedPeerIdsRef.current.has(peerKey)) {
        submittedPeerIdsRef.current.add(peerKey);
        newSubmitterNames.push(peer.displayName?.trim() || 'Another player');
        registerRecentSubmitter(peer.userId ?? null, peer.displayName ?? null);
      }
    });

    if (newSubmitterNames.length > 0) {
      const progressLabel = expectedTotal > 0 ? ` (${submitted}/${expectedTotal})` : '';
      const submitterLabel = newSubmitterNames.length === 1 ? newSubmitterNames[0] : `${newSubmitterNames.length} players`;
      showSubmissionNotice(`${submitterLabel} submitted${progressLabel}`);
      
      if (timerEnabledRef.current && !hasClampedThisRound.current && remainingTimeRef.current > 15) {
        applyCountdownRush();
      }
    }

    if (!hasSubmittedThisRound) {
      if (isCompeteMode) {
        setWaitingForPeers(false);
      }
      return;
    }

    if (isCompeteMode) {
      setWaitingForPeers(!allSubmitted);
      if (!allSubmitted && timerEnabledRef.current) {
        setIsTimerActive(true);
      }
    } else if (allSubmitted && !hasNavigatedToResultsRef.current) {
      hasNavigatedToResultsRef.current = true;
      setWaitingForPeers(false);
      navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
    }
  }, [
    roundPeers,
    waitingForPeers,
    roomId,
    modeBasePath,
    navigate,
    roundNumber,
    isCompeteMode,
    hasSubmittedThisRound,
    showSubmissionNotice,
    applyCountdownRush,
    registerRecentSubmitter,
    submittedCounts,
    lobbyRoster,
  ]);

  useEffect(() => {
    if (!isCompeteMode) return;
    if (!roundPeers || roundPeers.length === 0) return;

    setPeerProfileCache((prev) => {
      let nextRef = prev;
      let changed = false;

      roundPeers.forEach((peer) => {
        const displayNameSafe = (peer.displayName ?? '').trim() || 'Player';
        const avatarUrl = peer.avatarUrl ?? null;
        const keys: string[] =
          (typeof peer.userId === 'string' && peer.userId.trim().length > 0)
            ? [peer.userId.trim()]
            : (peer.displayName && peer.displayName.trim().length > 0)
              ? [`name:${peer.displayName.trim().toLowerCase()}`]
              : [];

        keys.forEach((key) => {
          const existing = nextRef[key];
          if (!existing || existing.displayName !== displayNameSafe || existing.avatarUrl !== avatarUrl) {
            if (!changed) {
              nextRef = { ...prev };
              changed = true;
            }
            nextRef[key] = {
              displayName: displayNameSafe,
              avatarUrl,
            };
          }
        });
      });

      return changed ? nextRef : prev;
    });
  }, [isCompeteMode, roundPeers]);

  useEffect(() => {
    setWaitingForPeers(false);
    setSubmittedCounts({ submitted: 0, total: 0 });
    setHasSubmittedThisRound(false);
    hasNavigatedToResultsRef.current = false;
    setSubmissionNotice(null);
    setFlashActive(false);
    pendingClampRef.current = false;
    hasClampedThisRound.current = false;
    submittedPeerIdsRef.current.clear();
    recentSubmitterIdsRef.current = {};
    awaitingSubmissionAckRef.current = false;
    setRecentSubmitterIds({});
    setCachedPeerRoster([]);
  }, [roomId, roundNumber]);

  useEffect(() => {
    if (!timerEnabled) {
      pendingClampRef.current = false;
      return;
    }
    if (pendingClampRef.current && timerReady) {
      pendingClampRef.current = false;
      clampRemainingRef.current(15);
    }
  }, [timerEnabled, timerReady]);

  useEffect(() => {
    if (!isCompeteMode || !roomId || typeof roundNumber !== 'number' || Number.isNaN(roundNumber)) {
      return;
    }
    setRoundStarted((prev) => prev || !isLevelUpRoute || roundNumber > 1);
    sendLobbyPayload?.({ type: 'progress', roundNumber, substep: 'round-start' });
  }, [isCompeteMode, roomId, roundNumber, sendLobbyPayload, isLevelUpRoute]);

  useEffect(() => {
    if (!awaitingSubmissionAckRef.current) {
      return;
    }
    if (!isCompeteMode || !roomId) {
      awaitingSubmissionAckRef.current = false;
      return;
    }
    const peerSelf = roundPeers.find((peer) => peer.userId === (user?.id || null));
    if (peerSelf && peerSelf.submitted) {
      awaitingSubmissionAckRef.current = false;
      pendingClampRef.current = false;
      if (!hasClampedThisRound.current && timerEnabledRef.current && remainingTimeRef.current > 15) {
        applyCountdownRush();
      }
    }
  }, [roundPeers, user?.id, isCompeteMode, roomId, applyCountdownRush]);

  useEffect(() => {
    let cancelled = false;
    if (!isCompeteMode || !roomId || !hasSubmittedThisRound || !waitingForPeers) return;
    const run = async () => {
      try {
        const { data: players } = await supabase
          .from('session_players')
          .select('user_id')
          .eq('room_id', roomId);
        const participantCount = Array.isArray(players) ? players.length : 0;
        const { data: results } = await supabase
          .from('round_results')
          .select('user_id')
          .eq('room_id', roomId)
          .eq('round_index', currentRoundIndex);
        const submittedCount = Array.isArray(results) ? new Set(results.map((r: any) => r.user_id)).size : 0;
        if (!cancelled && participantCount > 0 && submittedCount >= participantCount) {
          setWaitingForPeers(false);
          if (roomId && !hasNavigatedToResultsRef.current) {
            hasNavigatedToResultsRef.current = true;
            navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
          }
        }
      } catch {}
    };
    const t = setTimeout(run, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [isCompeteMode, roomId, hasSubmittedThisRound, waitingForPeers, currentRoundIndex, modeBasePath, navigate, roundNumber]);

  const peerMarkers = useMemo(() => {
    if (!isCompeteMode) {
      return [] as Array<{ id: string; lat: number; lng: number; avatarUrl?: string | null; displayName?: string | null }>;
    }
    return (roundPeers || [])
      .filter((peer) => peer.userId !== (user?.id || null) && peer.guessLat != null && peer.guessLng != null)
      .map((peer) => ({
        id: peer.userId,
        lat: peer.guessLat as number,
        lng: peer.guessLng as number,
        avatarUrl: peer.avatarUrl ?? null,
        displayName: peer.displayName ?? 'Player',
      }));
  }, [isCompeteMode, roundPeers, user?.id]);

  const computedPeerRoster = useMemo(() => {
    if (!isCompeteMode) {
      return [] as Array<{
        id: string;
        displayName: string;
        avatarUrl: string | null;
        isSelf: boolean;
        submitted: boolean;
        recentlySubmitted: boolean;
      }>;
    }

    const selfRosterId = makeRosterId(user?.id ?? null, displayName) || null;

    // Prefer DB-backed peers when available
    const mappedDbPeers = (roundPeers || [])
      .map((peer, index) => {
        const rosterIdBase = makeRosterId(peer.userId, peer.displayName ?? null);
        const rosterId = rosterIdBase || (peer.userId ? `anon:${peer.userId}:${index}` : `anon:${index}`);
        const submitted = peer.submitted === true;
        const isSelf = (peer.userId ?? '') === (user?.id ?? '');
        const displayLabel = (peer.displayName && peer.displayName.trim().length > 0)
          ? peer.displayName
          : (peer.userId === user?.id ? displayName || 'You' : 'Player');

        const cacheKeys: string[] = [];
        if (peer.userId && peer.userId.trim().length > 0) {
          cacheKeys.push(peer.userId.trim());
        }
        if (peer.displayName && peer.displayName.trim().length > 0) {
          cacheKeys.push(`name:${peer.displayName.trim().toLowerCase()}`);
        }
        const cachedEntry = cacheKeys.map((key) => peerProfileCache[key]).find((entry) => !!entry);
        const resolvedAvatar = peer.avatarUrl ?? cachedEntry?.avatarUrl ?? null;

        return {
          id: rosterId,
          displayName: cachedEntry?.displayName?.trim().length ? cachedEntry.displayName : displayLabel,
          avatarUrl: resolvedAvatar,
          isSelf,
          submitted,
          recentlySubmitted: submitted || !!recentSubmitterIds[rosterId],
        };
      })
      .filter((entry) => entry.id.trim().length > 0 && !entry.isSelf);

    if (mappedDbPeers.length > 0) return mappedDbPeers;

    // Fallback to PartyKit lobby roster when DB peers are unavailable
    const selfNameLc = (displayName || '').trim().toLowerCase();
    const mappedLobby = (lobbyRoster || [])
      .filter((p) => (p?.name || '').trim().length > 0)
      .map((p) => {
        const trimmedName = (p.name || '').trim();
        const nameKey = trimmedName ? `name:${trimmedName.toLowerCase()}` : '';
        const cached = nameKey ? peerProfileCache[nameKey] : undefined;
        return {
          id: `conn:${p.id}`,
          displayName: cached?.displayName ?? trimmedName,
          avatarUrl: cached?.avatarUrl ?? null,
          isSelf: trimmedName.toLowerCase() === selfNameLc,
          submitted: false,
          recentlySubmitted: !!recentSubmitterIds[nameKey],
        };
      })
      .filter((entry) => !entry.isSelf);

    if (mappedLobby.length > 0) return mappedLobby;

    // Final fallback: build roster from cached profiles (by name AND userId keys)
    const cachedMap = new Map<string, { id: string; displayName: string; avatarUrl: string | null; isNameKey: boolean }>();
    Object.entries(peerProfileCache).forEach(([key, val]) => {
      const display = (val?.displayName ?? '').trim();
      if (!display) return;
      // Prefer userId key when possible for stable IDs, otherwise use the name key
      const isNameKey = key.startsWith('name:');
      const id = key;
      if (!cachedMap.has(id)) {
        cachedMap.set(id, { id, displayName: display, avatarUrl: val?.avatarUrl ?? null, isNameKey });
      }
    });

    const activeIds = new Set<string>();
    (roundPeers || []).forEach((peer, index) => {
      const rosterIdBase = makeRosterId(peer.userId, peer.displayName ?? null);
      const rosterId = rosterIdBase || (peer.userId ? `anon:${peer.userId}:${index}` : `anon:${index}`);
      if (rosterId) activeIds.add(rosterId);
      if (peer.userId) activeIds.add(peer.userId);
      if (peer.displayName && peer.displayName.trim().length > 0) {
        activeIds.add(`name:${peer.displayName.trim().toLowerCase()}`);
      }
    });
    (lobbyRoster || []).forEach((player) => {
      if (player?.id) activeIds.add(`conn:${player.id}`);
      if (player?.name && player.name.trim().length > 0) {
        activeIds.add(`name:${player.name.trim().toLowerCase()}`);
      }
    });

    const deduped = new Map<string, { entry: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
      isSelf: boolean;
      submitted: boolean;
      recentlySubmitted: boolean;
    }; priority: number }>();

    Array.from(cachedMap.values()).forEach((row) => {
      if (activeIds.size > 0) {
        const normalized = row.displayName.trim().toLowerCase();
        const matchesId = row.id && activeIds.has(row.id);
        const matchesName = normalized.length > 0 && activeIds.has(`name:${normalized}`);
        if (!matchesId && !matchesName) {
          return;
        }
      }

      const normalizedName = row.displayName.trim().toLowerCase();
      const nameKey = normalizedName ? `name:${normalizedName}` : '';
      const entry = {
        id: row.id,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        isSelf: row.id === selfRosterId || (normalizedName.length > 0 && normalizedName === selfNameLc),
        submitted: false,
        recentlySubmitted: !!recentSubmitterIds[row.id] || (!!nameKey && !!recentSubmitterIds[nameKey]),
      };

      if (entry.isSelf) {
        return;
      }

      const priority = row.isNameKey ? 0 : 1; // prefer userId-derived cache entries over name-based ones
      const dedupeKey = priority > 0 && row.id.trim().length > 0
        ? row.id
        : (normalizedName.length > 0 ? normalizedName : row.id);
      const existing = deduped.get(dedupeKey);
      if (!existing || existing.priority < priority) {
        deduped.set(dedupeKey, { entry, priority });
      }
    });

    return Array.from(deduped.values()).map(({ entry }) => entry);
  }, [isCompeteMode, roundPeers, user?.id, displayName, makeRosterId, recentSubmitterIds, lobbyRoster, peerProfileCache]);

  useEffect(() => {
    if (!isCompeteMode) {
      setCachedPeerRoster([]);
      return;
    }

    if (computedPeerRoster.length > 0) {
      setCachedPeerRoster((prev) => {
        const sameLength = prev.length === computedPeerRoster.length;
        if (sameLength) {
          const allMatch = prev.every((entry, index) => {
            const next = computedPeerRoster[index];
            return next && entry.id === next.id && entry.submitted === next.submitted && entry.recentlySubmitted === next.recentlySubmitted && entry.avatarUrl === next.avatarUrl && entry.displayName === next.displayName;
          });
          if (allMatch) {
            return prev;
          }
        }
        return computedPeerRoster;
      });
    }
  }, [isCompeteMode, computedPeerRoster]);

  const peerRoster = useMemo(() => {
    if (!isCompeteMode) return [] as typeof cachedPeerRoster;
    const base = computedPeerRoster.length > 0 ? computedPeerRoster : cachedPeerRoster;
    const deduped = new Map<string, typeof base[number]>();
    base.forEach((peer, index) => {
      if (peer.isSelf) return;
      const id = (peer.id || '').trim();
      const nameLc = (peer.displayName || '').trim().toLowerCase();
      // For transient connection-backed entries (conn:*), dedupe by name instead of connection id
      const key = (id.startsWith('conn:') && nameLc)
        ? `name:${nameLc}`
        : (id || (nameLc ? `name:${nameLc}` : `idx:${index}`));

      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, peer);
        return;
      }

      // Prefer stable ids over conn ids, then prefer entries with avatar, then submitted/recent flags
      const preferNew = (
        (existing.id.startsWith('conn:') && !id.startsWith('conn:')) ||
        (!existing.avatarUrl && !!peer.avatarUrl) ||
        (!existing.submitted && !!peer.submitted) ||
        (!existing.recentlySubmitted && !!peer.recentlySubmitted)
      );
      if (preferNew) {
        deduped.set(key, peer);
      }
    });
    return Array.from(deduped.values());
  }, [isCompeteMode, computedPeerRoster, cachedPeerRoster]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[GameRoundPage] imageForRound', { roundNumber, hasImage: !!imageForRound });
      if (isCompeteMode) {
        console.debug('[GameRoundPage] peerMarkers', peerMarkers);
        console.debug('[GameRoundPage] peerRoster', peerRoster);
      }
    }
  }, [roundNumber, imageForRound, peerMarkers, peerRoster, isCompeteMode]);

  // Fetch global minimum event year once and cache it for the session
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        if (__globalMinYearCache !== null) {
          if (isMounted) setGlobalMinYear(__globalMinYearCache);
          try { setLevelUpOldestYear(__globalMinYearCache); } catch {}
          return;
        }
        const { data, error } = await (supabase as any)
          .from('images')
          .select('year')
          .not('year', 'is', null)
          .order('year', { ascending: true })
          .limit(1)
          .maybeSingle();
        const min = (!error && data && typeof data.year === 'number') ? data.year : 1850;
        __globalMinYearCache = min;
        if (isMounted) setGlobalMinYear(min);
        try { setLevelUpOldestYear(min); } catch {}
      } catch (e) {
        try { console.warn('[GameRoundPage] Failed to fetch global min year; using defaults', e); } catch {}
      }
    };
    // Always fetch once; reused for Solo mode range
    load();
    return () => { isMounted = false; };
  }, []);

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
  const handleSubmitGuess = useCallback(async () => {
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

    // Require WebSocket connection + user ID so PartyKit receives submission
    if (!sendLobbyPayload || !user?.id) {
      console.warn('[GameRoundPage] Submission aborted: missing lobby connection or user ID');
      toast({
        title: 'Connection issue',
        description: 'Waiting for lobby connection. Please try again in a moment.',
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
    if (!(isCompeteMode && timerEnabled)) {
      setIsTimerActive(false);
    }

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
      await recordRoundResult(resultData, currentRoundIndex);
      if (isCompeteMode && roomId) {
        awaitingSubmissionAckRef.current = true;
        const sent = sendLobbyPayload({ type: 'submission', roundNumber });
        if (!sent) {
          console.warn('[GameRoundPage] Failed to send submission payload after manual submit');
          pendingClampRef.current = true;
          toast({
            title: 'Connection issue',
            description: 'Trying again… hold on a moment, we will retry automatically.',
            variant: 'destructive',
          });
          awaitingSubmissionAckRef.current = false;
          setIsSubmitting(false);
          return;
        }
      }
      console.log('[GameRoundPage] recordRoundResult resolved, navigating to results');

      setCurrentGuess(null);
      if (roomId) {
        try {
          await upsertSessionProgress({
            roomId,
            roundNumber,
            currentRoute: `${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`,
            substep: 'results',
            timerEnabled,
            durationSec: timerEnabled ? roundTimerSec : null,
          });
        } catch (error) {
          console.error('Error during session progress upsert:', error);
        }
      }
      setHasSubmittedThisRound(true);
      if (isCompeteMode) {
        setWaitingForPeers(true);
        if (timerEnabled) {
          setIsTimerActive(true);
        }
      } else if (roomId) {
        navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
      }
    } catch (error) {
      console.error('Error during guess submission:', error);
      pendingClampRef.current = true;
      awaitingSubmissionAckRef.current = false;
      toast({
        title: 'Saving your guess…',
        description: 'We lost connection momentarily. Retrying submission in the background.',
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
    purchasedHints.length,
    xpDebt,
    accDebt,
    recordRoundResult,
    currentRoundIndex,
    setCurrentGuess,
    navigate,
    roomId,
    timerEnabled,
    roundTimerSec,
    modeBasePath,
    sendLobbyPayload,
    isCompeteMode,
  ]);

  useEffect(() => {
    if (!roomId) return;
    upsertSessionProgress({
      roomId,
      roundNumber,
      currentRoute: location.pathname,
      substep: showIntro ? 'intro' : (roundStarted ? 'active' : 'waiting'),
      startedAt: roundStarted ? new Date().toISOString() : null,
      durationSec: timerEnabled ? roundTimerSec : null,
      timerEnabled,
    }).catch(() => {});
  }, [roomId, roundNumber, location.pathname, showIntro, roundStarted, roundTimerSec, timerEnabled]);

  // Handle timer completion
  const handleTimeComplete = useCallback(async () => {
    if (!timerEnabled) return;
    console.log("Timer completed - auto submitting");
    setHasTimedOut(true);
    if (!(isCompeteMode && roomId)) {
      setIsTimerActive(false);
    }
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

    const emitSubmission = () => {
      if (!isCompeteMode || !roomId || !sendLobbyPayload || !user?.id) return;
      const sent = sendLobbyPayload({ type: 'submission', roundNumber });
      if (!sent) {
        console.warn('[GameRoundPage] Failed to send submission payload after timeout submit');
      }
    };

    try {
      if (!hasGuessedLocation) {
        await recordRoundResult(
          {
            guessCoordinates: null,
            distanceKm: null,
            score: 0,
            guessYear: null,
            xpWhere: 0,
            xpWhen: 0,
            accuracy: 0,
            hintsUsed: purchasedHints.length,
          },
          currentRoundIndex,
        );
        emitSubmission();

        toast({
          title: "Time's Up!",
          description: "No location was selected. Your score for this round is 0.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
        if (!isCompeteMode && roomId) {
          navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
          setIsSubmitting(false);
          return;
        }
        if (isCompeteMode) {
          setHasSubmittedThisRound(true);
          setWaitingForPeers(true);
          setIsSubmitting(false);
          return;
        }
      }

      if (selectedYear === null) {
        await recordRoundResult(
          {
            guessCoordinates: currentGuess,
            distanceKm: null,
            score: 0,
            guessYear: null,
            xpWhere: 0,
            xpWhen: 0,
            accuracy: 0,
            hintsUsed: purchasedHints.length,
          },
          currentRoundIndex,
        );
        emitSubmission();

        toast({
          title: "Time's Up!",
          description: "No year was selected. Your score for this round is 0.",
          variant: "info",
          className: "bg-white/70 text-black border border-gray-200",
        });
        if (!isCompeteMode && roomId) {
          navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
          setIsSubmitting(false);
          return;
        }
      }

      const distance = currentGuess
        ? calculateDistanceKm(
            currentGuess.lat,
            currentGuess.lng,
            imageForRound.latitude,
            imageForRound.longitude,
          )
        : null;

      const timeXP = selectedYear != null ? calculateTimeXP(selectedYear, imageForRound.year) : 0;
      const locationXP = distance !== null ? calculateLocationXP(distance) : 0;
      const roundXPBeforePenalty = timeXP + locationXP;
      const finalScore = Math.max(0, roundXPBeforePenalty - xpDebt);
      const percentBeforePenalty = (roundXPBeforePenalty / (100 + 100)) * 100;
      const roundPercent = Math.max(0, Math.round(percentBeforePenalty - accDebt));

      await recordRoundResult(
        {
          guessCoordinates: currentGuess,
          distanceKm: distance,
          score: finalScore,
          guessYear: selectedYear,
          xpWhere: locationXP,
          xpWhen: timeXP,
          accuracy: roundPercent,
          hintsUsed: purchasedHints.length,
        },
        currentRoundIndex,
      );
      emitSubmission();

      toast({
        title: "Time's Up!",
        description: "Submitting your current guess automatically.",
        variant: "info",
        className: "bg-white/70 text-black border border-gray-200",
      });

      if (!isCompeteMode && roomId) {
        setTimeout(() => {
          navigate(`${modeBasePath}/game/room/${roomId}/round/${roundNumber}/results`);
          setIsSubmitting(false);
        }, 2000);
      } else {
        if (isCompeteMode) {
          setHasSubmittedThisRound(true);
          setWaitingForPeers(true);
        }
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("Error recording timeout result:", error);
      setIsSubmitting(false);
    }
  }, [
    timerEnabled,
    setHasTimedOut,
    setIsTimerActive,
    setIsSubmitting,
    imageForRound,
    toast,
    isCompeteMode,
    roomId,
    sendLobbyPayload,
    roundNumber,
    hasGuessedLocation,
    recordRoundResult,
    purchasedHints.length,
    currentRoundIndex,
    navigate,
    modeBasePath,
    selectedYear,
    currentGuess,
  ]);

  const handleMapGuess = (lat: number, lng: number) => {
    console.log(`Guess placed at: Lat ${lat}, Lng ${lng}`);
    setCurrentGuess({ lat, lng });
    setHasGuessedLocation(true);
  };

  const chatEnabled = false;

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

  // Decide slider bounds props: Level Up uses level constraints; Solo uses global DB -> current year when available
  const [settingsMinYear, settingsMaxYear] = settingsYearRange ?? [];
  const minYearProp = isLevelUpRoute
    ? levelUpConstraints?.levelYearRange.start
    : (typeof settingsMinYear === 'number'
      ? settingsMinYear
      : (typeof globalMinYear === 'number' ? globalMinYear : undefined));
  const maxYearProp = isLevelUpRoute
    ? levelUpConstraints?.levelYearRange.end
    : (typeof settingsMaxYear === 'number'
      ? settingsMaxYear
      : (typeof globalMinYear === 'number' ? currentYear : undefined));

  const layoutGameMode = isCompeteMode ? 'compete' : (isLevelUpRoute ? 'levelup' : 'solo');

  // Render the layout and the separate submit button
  return (
    // Use relative positioning to allow absolute positioning for the button
    <div className="relative w-full min-h-screen flex flex-col">
      {flashActive && <div className="submission-flash" />}
      {/* Progress bar at the very top */}
      <div className="w-full bg-history-primary absolute top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <SegmentedProgressBar current={roundNumber} total={ROUNDS_PER_GAME} className="w-full" />
        </div>
      </div>

      {/* Main game content */}
      <GameLayout1
        onComplete={handleSubmitGuess}
        gameMode={layoutGameMode}
        currentRound={roundNumber}
        image={imageForRound}
        onMapGuess={handleMapGuess}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        remainingTime={remainingTime}
        setRemainingTime={setRemainingTime}
        isTimerActive={isTimerActive}
        timerEnabled={timerEnabled}
        roundTimerSec={roundTimerSec}
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
        minYear={minYearProp}
        maxYear={maxYearProp}
        levelLabel={isLevelUpRoute ? `Level ${levelUpLevel ?? 1}` : undefined}
        onOpenLevelIntro={() => { setIntroSource('hub'); setShowIntro(true); }}
        peerMarkers={peerMarkers}
        peerRoster={isCompeteMode ? peerRoster : peerRoster}
        onOpenChat={chatEnabled ? toggleChat : undefined}
        isChatOpen={chatEnabled ? isChatOpen : false}
        chatMessageCount={chatEnabled ? chatMessages.length : 0}
        avatarClusterRef={avatarClusterRef}
        waitingForPeers={waitingForPeers}
        submittedCount={submittedCounts.submitted}
        totalParticipants={submittedCounts.total}
        submissionNotice={submissionNotice}
      />
      
      {/* Level Up Intro overlay BEFORE starting Round 1 (Level Up only) */}
      {isLevelUpRoute && showIntro && createPortal(
        <div className="fixed inset-0 z-[11000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
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
            showStart={introSource === 'auto'}
            showClose={introSource === 'hub'}
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

      {isCompeteMode && roomId && isChatOpen && (
        <div
          className="pointer-events-none z-[1500]"
          style={chatPanelStyle ?? { position: 'fixed', right: 16, bottom: 96, width: 320 }}
        >
          <div className="pointer-events-auto w-[320px] max-h-[60vh] rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-emerald-300" />
                <div className="text-sm font-semibold text-white">Room Chat</div>
                <div className="text-xs text-white/60">{chatMessages.length} msg</div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="text-white/70 hover:text-white" aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div id="game-chat-scroller" className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {chatMessages.length === 0 ? (
                <div className="text-xs text-white/50">No messages yet. Say hi!</div>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="text-xs text-white/90">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate max-w-[65%]">{msg.from}</span>
                      <span className="text-[10px] text-white/50">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-white/80 whitespace-pre-wrap break-words">{msg.message}</div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendChat();
                  }
                }}
                placeholder={chatStatus === 'open' ? 'Type a message…' : chatStatus === 'connecting' ? 'Connecting…' : 'Chat unavailable'}
                disabled={chatStatus !== 'open'}
                className="flex-1 rounded-lg bg-white/10 text-white placeholder:text-white/40 border border-white/20 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="button"
                onClick={handleSendChat}
                disabled={chatStatus !== 'open' || !chatInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-400 text-sm font-semibold text-black disabled:bg-white/20 disabled:text-white/50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HUD chat button replaces legacy floating toggle */}
    </div>
  );
};

export default GameRoundPage; 