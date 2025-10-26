import React, { useState, useEffect, useCallback, useRef } from 'react';
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
import { AuthModal } from '@/components/AuthModal';
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import GuestBadge from '@/components/GuestBadge';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useGame } from "@/contexts/GameContext";
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import { useSettingsStore, YEAR_RANGE_MIN, YEAR_RANGE_MAX } from '@/lib/useSettingsStore';

// Dev logging guard
const isDev = (import.meta as any)?.env?.DEV === true;
const devLog = (...args: any[]) => { if (isDev) console.log(...args); };

const homePageStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  backgroundImage: 'url("/images/background.webp")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed',
  backgroundColor: '#121212', // Dark mode background
};

const contentStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
  backdropFilter: 'blur(8px)',
  backgroundColor: 'rgba(255, 255, 255, 0.75)',
  width: '100%',
  height: '100%',
  overflowY: 'auto',
  padding: '2rem 1rem',
  boxSizing: 'border-box',
};

// Game mode colors
const practiceColor = "bg-orange-500/20 text-orange-500";
const friendsColor = "bg-blue-500/20 text-blue-500";
const challengeColor = "bg-purple-500/20 text-purple-500";

const HomePage = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { user, isGuest } = useAuth();
  const [showGuestBadge, setShowGuestBadge] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // For profile specific settings if any, or just user id
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const cardsContainerRef = useRef<HTMLDivElement | null>(null);
  const levelUpCardRef = useRef<HTMLDivElement | null>(null);
  // Removed Coming Soon popup for Compete
  devLog('[HomePage] Render', { isLoaded, user, isGuest });
  // Timer states
  const [isSoloTimerEnabled, setIsSoloTimerEnabled] = useState(false);
  const [showYearRange, setShowYearRange] = useState(false);
  const { timerSeconds, setTimerSeconds, yearRange, setYearRange } = useSettingsStore();
  const [editingYearField, setEditingYearField] = useState<null | 'start' | 'end'>(null);
  const [pendingYearValue, setPendingYearValue] = useState('');
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [pendingTimerValue, setPendingTimerValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const gameContext = useGame();
  const { startGame, isLoading, startLevelUpGame } = gameContext || {};
  const yearInputRef = useRef<HTMLInputElement | null>(null);
  const timerInputRef = useRef<HTMLInputElement | null>(null);

  // Timer range in seconds with 5-second intervals from 5s to 5m (300s)
  const minTimerValue = 5; // 5 seconds
  const maxTimerValue = 300; // 5 minutes
  const stepSize = 5; // 5-second intervals

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m${remainingSeconds}s` : `${minutes}m`;
  };

  const beginTimerEdit = useCallback(() => {
    setIsEditingTimer(true);
    setPendingTimerValue(String(timerSeconds));
  }, [timerSeconds]);

  const cancelTimerEdit = useCallback(() => {
    setIsEditingTimer(false);
    setPendingTimerValue('');
  }, []);

  const commitTimerEdit = useCallback((rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) {
      cancelTimerEdit();
      return;
    }
    const clamped = Math.min(Math.max(parsed, minTimerValue), maxTimerValue);
    const snapped = Math.round(clamped / stepSize) * stepSize;
    const finalValue = Math.min(Math.max(snapped, minTimerValue), maxTimerValue);
    setTimerSeconds(finalValue);
    cancelTimerEdit();
  }, [cancelTimerEdit, maxTimerValue, minTimerValue, setTimerSeconds, stepSize]);

  useEffect(() => {
    if (isEditingTimer && timerInputRef.current) {
      timerInputRef.current.focus();
      timerInputRef.current.select();
    }
  }, [isEditingTimer]);

  const handleYearSliderChange = useCallback((value: number[]) => {
    if (!value || value.length !== 2) return;
    const [start, end] = value[0] <= value[1] ? value : [value[1], value[0]];
    setYearRange([start, end]);
  }, [setYearRange]);

  const beginYearEdit = useCallback((field: 'start' | 'end') => {
    setEditingYearField(field);
    setPendingYearValue(String(field === 'start' ? yearRange[0] : yearRange[1]));
  }, [yearRange]);

  const cancelYearEdit = useCallback(() => {
    setEditingYearField(null);
    setPendingYearValue('');
  }, []);

  const commitYearEdit = useCallback((field: 'start' | 'end', rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) {
      cancelYearEdit();
      return;
    }
    const clamped = Math.min(Math.max(parsed, YEAR_RANGE_MIN), YEAR_RANGE_MAX);
    const nextRange: [number, number] = field === 'start'
      ? [clamped, yearRange[1]]
      : [yearRange[0], clamped];
    setYearRange(nextRange);
    cancelYearEdit();
  }, [cancelYearEdit, setYearRange, yearRange]);

  useEffect(() => {
    if (editingYearField && yearInputRef.current) {
      yearInputRef.current.focus();
      yearInputRef.current.select();
    }
  }, [editingYearField]);

  const renderYearValue = useCallback((field: 'start' | 'end', value: number) => {
    const isEditing = editingYearField === field;
    if (isEditing) {
      return (
        <Input
          ref={yearInputRef}
          value={pendingYearValue}
          onChange={(event) => setPendingYearValue(event.target.value)}
          onBlur={() => editingYearField && commitYearEdit(editingYearField, pendingYearValue)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              editingYearField && commitYearEdit(editingYearField, pendingYearValue);
            }
            if (event.key === 'Escape') {
              cancelYearEdit();
            }
          }}
          className="w-20 text-center text-sm font-semibold text-white bg-black/60 border border-white/40 focus-visible:ring-0 focus-visible:border-white"
          inputMode="numeric"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={() => beginYearEdit(field)}
        className="text-sm font-semibold text-[#f97316] hover:text-[#fb923c] focus:outline-none"
      >
        {value}
      </button>
    );
  }, [beginYearEdit, cancelYearEdit, commitYearEdit, editingYearField, pendingYearValue]);

  const renderTimerValue = useCallback(() => {
    if (isEditingTimer) {
      return (
        <Input
          ref={timerInputRef}
          value={pendingTimerValue}
          onChange={(event) => setPendingTimerValue(event.target.value)}
          onBlur={() => commitTimerEdit(pendingTimerValue)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              commitTimerEdit(pendingTimerValue);
            }
            if (event.key === 'Escape') {
              cancelTimerEdit();
            }
          }}
          className="w-20 text-center text-sm font-semibold text-white bg-black/60 border border-white/40 focus-visible:ring-0 focus-visible:border-white"
          inputMode="numeric"
        />
      );
    }
    return (
      <button
        type="button"
        onClick={beginTimerEdit}
        className="text-sm font-bold text-[#f97316] hover:text-[#fb923c] focus:outline-none"
      >
        {formatTime(timerSeconds)}
      </button>
    );
  }, [beginTimerEdit, cancelTimerEdit, commitTimerEdit, isEditingTimer, pendingTimerValue, timerSeconds]);

  const handleSoloTimerToggle = useCallback((checked: boolean) => {
    setIsSoloTimerEnabled(checked);
    if (!checked) {
      cancelTimerEdit();
    }
  }, [cancelTimerEdit]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        if (user) {
          const [settingsData, profileData] = await Promise.all([
            fetchUserSettings(user.id),
            fetchUserProfile(user.id),
          ]);
          setUserSettings(settingsData);
          setProfile(profileData);
        }
        // Show guest badge if the user is a guest
        setShowGuestBadge(isGuest);
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoaded(true);
        devLog('[HomePage] loadUserData complete, isLoaded:', true);
      }
    };

    loadUserData();
  }, [user, isGuest]);

  useEffect(() => {
    if (!isLoaded) return;
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= 768) return;
    const container = cardsContainerRef.current;
    const levelUpCard = levelUpCardRef.current;
    if (!container || !levelUpCard) return;
    const containerWidth = container.clientWidth;
    const cardWidth = levelUpCard.clientWidth;
    const target = levelUpCard.offsetLeft - Math.max(0, (containerWidth - cardWidth) / 2);
    container.scrollTo({ left: Math.max(0, target), behavior: 'auto' });
  }, [isLoaded]);

  // Refresh profile when other parts of the app update it (e.g., Level Up best level after passing)
  useEffect(() => {
    const onProfileUpdated = () => {
      if (!user) return;
      fetchUserProfile(user.id)
        .then(setProfile)
        .catch((e) => console.warn('[HomePage] profile refresh failed', e));
    };
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => window.removeEventListener('profileUpdated', onProfileUpdated);
  }, [user]);

  useEffect(() => {
    const state = location.state as { requireRegistration?: boolean } | undefined;
    if (state?.requireRegistration && isGuest) {
      setShowAuthModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, isGuest, navigate]);

  const handleSettingsUpdated = () => {
    if (user) {
      fetchUserSettings(user.id).then(setUserSettings);
    }
  };

  const { toast } = useToast();

  const handleStartGame = useCallback(async (mode: string) => {
    devLog('[HomePage] handleStartGame start', mode, { user, isGuest });
    // Check if user is authenticated (either guest or registered)
    if (!user) {
      setPendingMode(mode);
      setShowAuthModal(true);
      return;
    }

    // Guest users can only play Practice mode
    if (isGuest && mode !== 'classic') {
      setPendingMode(null);
      setShowAuthModal(true);
      return;
    }

    setShowLoadingPopup(true);

    if (mode === 'friends') {
      // Route to the unified Play with Friends flow which uses PartyKit lobby at /room/:roomCode
      // We deliberately avoid the old legacy lobby route.
      devLog('[HomePage] Play Friends clicked. Redirecting to /compete');
      setShowLoadingPopup(false);
      navigate('/compete');
      return;
    }

    // Level Up mode: start dedicated flow (separate route prefix)
    if (mode === 'levelup') {
      if (!gameContext) {
        console.error('Game context is not available');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Unable to start Level Up. Please try again.',
        });
        setShowLoadingPopup(false);
        return;
      }
      try {
        // Re-fetch profile to ensure we have the freshest unlocked level
        const latestProfile = user ? await fetchUserProfile(user.id) : null;
        const bestLevel = Math.max(
          1,
          Number(
            (latestProfile as any)?.level_up_best_level ?? (profile as any)?.level_up_best_level ?? 1
          )
        );
        await startLevelUpGame?.(bestLevel);
      } catch (e) {
        console.error('Error starting Level Up game:', e);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to start Level Up. Please try again.',
        });
      } finally {
        setShowLoadingPopup(false);
      }
      return;
    }

    if (!gameContext) {
      console.error('Game context is not available');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to start game. Please try again.",
      });
      setShowLoadingPopup(false);
      return;
    }

    if (!isLoading) {
      try {
        // Pass timer settings to startGame if it's a solo game with timer enabled
        // When timer is disabled, pass timerEnabled: false to ensure it doesn't show in the HUD
        const gameSettings = mode === 'classic'
          ? {
              timerEnabled: isSoloTimerEnabled,
              timerSeconds: isSoloTimerEnabled ? timerSeconds : 0,
              hintsPerGame: 5, // TODO: Make hints configurable
              minYear: yearRange[0],
              maxYear: yearRange[1],
            }
          : {};

        await startGame?.(gameSettings);
        // startGame handles navigation internally
      } catch (error) {
        console.error('Error starting game:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start the game. Please try again.",
        });
      } finally {
        setShowLoadingPopup(false);
      }
    }
  }, [user, gameContext, startGame, startLevelUpGame, isLoading, navigate, toast, setPendingMode, setShowAuthModal, isSoloTimerEnabled, timerSeconds, isGuest, yearRange]);

  useEffect(() => {
    if (user && pendingMode && gameContext && startGame) {
      handleStartGame(pendingMode);
      setPendingMode(null); // Reset pendingMode after attempting to start
    } else if (user && pendingMode && !gameContext) {
      console.error('Game context not available when trying to start game from useEffect');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Game resources not ready. Please try again.",
      });
      setPendingMode(null); // Reset to avoid loops
    }
  }, [user, pendingMode, handleStartGame, gameContext, startGame, toast]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // useEffect will handle starting the game with pendingMode
  };

  const handleGuestContinue = () => {
    setShowAuthModal(false);
  };

  return (
    <div style={homePageStyle}>
      {showGuestBadge && <GuestBadge username={profile?.display_name || 'Guest'} />}
      <div className="absolute inset-0 z-[100] w-full h-full overflow-y-auto p-4 md:p-8 box-border bg-black/80 flex items-start justify-center min-h-screen">
        
        {isLoaded ? (
          <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
            <Logo className="mt-28 md:mt-30 mb-14 md:mb-14 justify-center [&_img]:h-20 md:[&_img]:h-20"/>
            <div ref={cardsContainerRef} className="-mx-0 md:mx-0 md:-mt-0 w-screen md:w-auto flex flex-row items-start gap-[2rem] md:gap-[3rem] overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none no-scrollbar px-0 md:px-2 touch-pan-x overscroll-x-contain pl-0 md:pl-0">
              {/* Mobile left spacer to center first card */}
              <div className="shrink-0 w-[calc((100vw-13.5rem)/2)] md:hidden" aria-hidden="true" />
              {/* Solo Card */}
              <div className="flex flex-col items-center justify-center gap-0 py-2 md:py-2 shrink-0 snap-center">
                <div
                  className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,_#fcd34d_0%,_#f97316_60%,_#ea580c_100%)] cursor-pointer"
                  onClick={() => handleStartGame('classic')}
                >
                  <div className="flex items-center justify-center w-full h-full">
                    <img src="/icons/solo.webp" alt="Practice" className="w-[66%] h-[66%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>
                <div
                  className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1 cursor-pointer"
                  onClick={() => handleStartGame('classic')}
                >
                  PRACTICE
                </div>
                {isSoloTimerEnabled && (
                  <div className="w-full mt-2 text-center text-xs font-semibold text-gray-200">
                    Round Timer: {formatTime(timerSeconds)}
                  </div>
                )}
                {/* Pegged Solo Timer Controls */}
                <div className="w-[13.5rem] mt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="solo-timer-toggle"
                        checked={isSoloTimerEnabled}
                        onCheckedChange={handleSoloTimerToggle}
                        className="mr-3 h-4 w-8"
                      />
                      <Label htmlFor="solo-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-white">
                        <span>  Round Timer</span>
                      </Label>
                    </div>
                    {isSoloTimerEnabled && renderTimerValue()}
                  </div>
                  {isSoloTimerEnabled && (
                    <div className="relative mt-[28px]">
                      <Slider
                        value={[timerSeconds]}
                        min={minTimerValue}
                        max={maxTimerValue}
                        step={stepSize}
                        onValueChange={(value) => setTimerSeconds(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-300 mt-1">
                        <span>5s</span>
                        <span>5m</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-8">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-200">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="year-range-toggle"
                          checked={showYearRange}
                          onCheckedChange={setShowYearRange}
                          className="mr-3 h-4 w-8"
                        />
                        <Label
                          htmlFor="year-range-toggle"
                          className="flex items-center gap-1 cursor-pointer text-sm text-white"
                        >
                          <span>Years</span>
                        </Label>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
                        {renderYearValue('start', yearRange[0])}
                        <span>—</span>
                        {renderYearValue('end', yearRange[1])}
                      </div>
                    </div>
                    {showYearRange && (
                      <div className="mt-[28px]">
                        <Slider
                          value={yearRange}
                          min={YEAR_RANGE_MIN}
                          max={YEAR_RANGE_MAX}
                          step={5}
                          onValueChange={handleYearSliderChange}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                          <span>{YEAR_RANGE_MIN}</span>
                          <span>{YEAR_RANGE_MAX}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Level Up Card */}
              <div ref={levelUpCardRef} className="relative flex flex-col items-center justify-center gap-0 py-2 md:py-4 shrink-0 snap-center">
                {isGuest && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                        <img src="/icons/lock.webp" alt="Locked" className="h-3.5 w-3.5" />
                      </div>
                      <span>Sign up to unlock</span>
                    </div>
                  </div>
                )}
                <div
                  className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-pink-300 via-fuchsia-400 to-purple-600 cursor-pointer"
                  onClick={() => handleStartGame('levelup')}
                >
                  <div className="relative w-full h-full flex items-center justify-center">
                   <img src="/icons/level.webp" alt="Level Up" className="w-[66%] h-[66%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded">
                      Lv {Math.max(1, Number((profile as any)?.level_up_best_level || 1))}
                    </div>
                  </div>
                </div>
                <div
                  className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1 cursor-pointer"
                  onClick={() => handleStartGame('levelup')}
                >
                  LEVEL UP
                </div>
              </div>
              {/* Compete Card (purple) */}
              <div
                className="relative flex flex-col items-center justify-center gap-0 py-2 md:py-2 shrink-0 snap-center cursor-pointer"
                onClick={() => handleStartGame('friends')}
              >
                {isGuest && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-black/80 px-3 py-1 text-xs font-semibold text-white">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
                        <img src="/icons/lock.webp" alt="Locked" className="h-3.5 w-3.5" />
                      </div>
                      <span>Sign up to unlock</span>
                    </div>
                  </div>
                )}
                <div className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-[linear-gradient(180deg,_#45fff0_0%,_#00adc1_100%)]">
                  <div className="flex items-center justify-center w-full h-full">
                    <img src="/icons/compete.webp" alt="Compete" className="w-[66%] h-[66%] object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.5)]" />
                  </div>
                </div>
                <div className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1">
                  COMPETE
                </div>
              </div>
            </div>
            {/* Timer controls moved into the Solo card above */}
          </div>
        ) : (
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-black dark:text-white text-lg font-medium mt-2">Loading...</p>
          </div>
        )}
      </div>

      {/* Loading Popup */}
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-gray-200/20 dark:border-gray-800/20 hover:border-gray-300/40 dark:hover:border-gray-700/40 transition-all">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-white text-lg font-medium">Loading 5 random events</p>
          </div>
        </div>
      )}
      
      <GlobalSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsUpdated={handleSettingsUpdated}
      />
      
      {/* FriendsGameModal removed - now using direct lobby navigation */}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingMode(null);
        }}
        onAuthSuccess={handleAuthSuccess}
        onGuestContinue={handleGuestContinue}
      />
      {/* Coming Soon modal removed */}
    </div>
  );
};

export default HomePage;