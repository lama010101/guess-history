import React, { useState, useEffect, useCallback } from 'react';
import { Target, Users, Timer, Lock, Play, Moon } from "lucide-react";
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
// FriendsGameModal removed - now using direct lobby navigation
import { AuthModal } from '@/components/AuthModal';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import GuestBadge from '@/components/GuestBadge';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';
import soloIcon from '@/assets/icons/solo.webp';
import friendsIcon from '@/assets/icons/friends.webp';
import lockIcon from '@/assets/icons/lock.webp';

const homePageStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  backgroundImage: 'url("/images/background.jpg")',
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

// Game mode icon styles
const iconContainerStyle = "flex items-center justify-center w-32 h-32 rounded-full mb-4 mx-auto";
const iconStyle = "w-32 h-32";

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
  // FriendsModal state removed - now using direct lobby navigation
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  console.log('[HomePage] Render', { isLoaded, user, isGuest });
  // Timer states
  const [isSoloTimerEnabled, setIsSoloTimerEnabled] = useState(false);
  const [isFriendsTimerEnabled, setIsFriendsTimerEnabled] = useState(false);
  const [practiceTimerSeconds, setPracticeTimerSeconds] = useState(300); // 5 minutes
  const [friendsTimerSeconds, setFriendsTimerSeconds] = useState(180); // 3 minutes
  const navigate = useNavigate();
  const gameContext = useGame();
  const { startGame, isLoading } = gameContext || {};
  
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
          console.log('[HomePage] loadUserData complete, isLoaded:', true);
      }
    };

    loadUserData();
  }, [user, isGuest]);

  const handleSettingsUpdated = () => {
    if (user) {
      fetchUserSettings(user.id).then(setUserSettings);
    }
  };

  const { toast } = useToast();

  const handleStartGame = useCallback(async (mode: string) => {
    console.log('[HomePage] handleStartGame start', mode, { user, isGuest });
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
      // We deliberately avoid the old /test/lobby/:roomId route.
      console.log('[HomePage] Play Friends clicked. Redirecting to /play');
      setShowLoadingPopup(false);
      navigate('/play');
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
              timerSeconds: isSoloTimerEnabled ? practiceTimerSeconds : 0,
              hintsPerGame: 5, // TODO: Make hints configurable
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
  }, [user, gameContext, startGame, isLoading, navigate, toast, setPendingMode, setShowAuthModal, isSoloTimerEnabled, practiceTimerSeconds, isFriendsTimerEnabled, friendsTimerSeconds, isGuest]);
  
  // handleStartFriendsGame removed - now using direct lobby navigation

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
      <div className="absolute inset-0 z-10 w-full h-full overflow-y-auto p-8 box-border backdrop-blur-sm bg-white/75 dark:bg-black/75 flex items-center justify-center min-h-screen">
  {/* Centered logo at 1/3rd of the viewport height */}
  <div className="absolute left-1/2 -translate-x-1/2 z-20" style={{ top: '33vh' }}>
    <Logo />
  </div>
  {isLoaded ? (
    <div className="flex flex-row items-start gap-[1.7rem] md:flex-row md:gap-[2.55rem] md:items-start overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none px-2 -mx-2">
      {/* Solo Card */}
      <div className="flex flex-col items-center justify-center gap-0 py-4 shrink-0 snap-center">
        <div
          className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-yellow-300 via-orange-400 to-orange-600 cursor-pointer"
          onClick={() => handleStartGame('classic')}
        >
          <img src={soloIcon} alt="Solo" className="w-40 h-40 object-contain" />
        </div>
        <div
          className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1 cursor-pointer"
          onClick={() => handleStartGame('classic')}
        >
          SOLO
        </div>
        <div className="w-full mt-4">
          <div className="flex items-center justify-center mb-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="solo-timer-toggle"
                checked={isSoloTimerEnabled}
                onCheckedChange={setIsSoloTimerEnabled}
                className="mr-3 data-[state=checked]:bg-gray-600 h-4 w-8"
              />
              <Label htmlFor="solo-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-black dark:text-white">
                <span>Round Timer</span>
              </Label>
            </div>
            {isSoloTimerEnabled && (
              <span className="text-sm font-bold text-orange-500 ml-4">
                {formatTime(practiceTimerSeconds)}
              </span>
            )}
          </div>
          {isSoloTimerEnabled && (
            <div className="relative mb-4 px-4">
              <div className="pt-2">
                <Slider
                  value={[practiceTimerSeconds]}
                  min={minTimerValue}
                  max={maxTimerValue}
                  step={stepSize}
                  onValueChange={(value) => setPracticeTimerSeconds(value[0])}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-300">
                <span>5s</span>
                <span>5m</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Friends Card */}
      <div
        className={`relative flex flex-col items-center justify-center gap-0 py-4 shrink-0 snap-center ${isGuest ? 'opacity-60' : 'cursor-pointer'}`}
        onClick={() => {
          console.log('[HomePage] Friends card clicked. isGuest:', isGuest);
          if (!isGuest) handleStartGame('friends');
        }}
      >
        {isGuest && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/60 rounded-xl z-10">
            <div className="text-center p-4">
              <img src={lockIcon} alt="Locked" className="h-20 w-20 mx-auto mb-3" />
              <p className="text-black dark:text-white text-sm">Sign in to challenge your friends and track your wins.</p>
              <Button
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                onClick={() => handleStartGame('friends')}
              >
                Sign In
              </Button>
            </div>
          </div>
        )}
        <div className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-cyan-300 via-sky-400 to-sky-600">
          <img src={friendsIcon} alt="Friends" className="w-40 h-40 object-contain" />
        </div>
        <div className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1">
          COMPETE
        </div>
      </div>
      {/* Collaborate Card */}
      <div className="flex flex-col items-center justify-center gap-0 py-4 shrink-0 snap-center">
        <div className="w-[13.5rem] h-[13.5rem] rounded-t-xl overflow-hidden flex items-center justify-center bg-gradient-to-b from-purple-300 via-violet-500 to-purple-700">
          {/* Icon to be provided later */}
        </div>
        <div className="w-[13.5rem] bg-gray-800 text-white text-center font-extrabold uppercase py-3 rounded-b-xl -mt-1">
          COLLABORATE
        </div>
      </div>
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
    </div>
  );
};

export default HomePage;