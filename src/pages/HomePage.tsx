import React, { useState, useEffect, useCallback } from 'react';
import { Target, Users, Timer, Lock, Play } from "lucide-react";
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
import FriendsGameModal from '@/components/FriendsGameModal';
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
const iconContainerStyle = "flex items-center justify-center w-16 h-16 rounded-full mb-4 mx-auto";
const iconStyle = "w-8 h-8";

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
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
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

    if (mode === 'time-attack') {
      // For friends mode, use the friends timer settings
      if (isFriendsTimerEnabled) {
        try {
          await startGame?.({ timerSeconds: friendsTimerSeconds, timerEnabled: true });
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
        return;
      } else {
        setShowLoadingPopup(false);
        setIsFriendsModalOpen(true);
        return;
      }
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
  }, [user, gameContext, startGame, isLoading, navigate, toast, setPendingMode, setShowAuthModal, setIsFriendsModalOpen, isSoloTimerEnabled, practiceTimerSeconds, isFriendsTimerEnabled, friendsTimerSeconds]);
  
  const handleStartFriendsGame = useCallback(async (settings: { timerSeconds: number; hintsPerGame: number }) => {
    setIsFriendsModalOpen(false);
    setShowLoadingPopup(true);
    
    // Check if user is authenticated (either guest or registered)
    if (!user) {
      setPendingMode('time-attack');
      setShowAuthModal(true);
      setShowLoadingPopup(false);
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
        await startGame?.(settings);
        // startGame handles navigation internally
      } catch (error) {
        console.error('Error starting friends game:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start the game. Please try again.",
        });
      } finally {
        setShowLoadingPopup(false);
      }
    }
  }, [user, gameContext, startGame, isLoading, toast]);

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
      <div style={contentStyle} className="flex items-center justify-center min-h-screen">
        <div className="container mx-auto px-4">
          {/* Game Mode Selection */}
          {isLoaded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Practice Mode Card */}
              <div className="bg-white dark:bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-gray-200/20 dark:border-gray-700/20 hover:border-gray-300/40 dark:hover:border-gray-600/40 transition-all">
                <div className={`${iconContainerStyle} ${practiceColor}`}>
                  <Target className={iconStyle} />
                </div>
                <h2 className="text-xl font-bold text-black dark:text-white mb-6">Practice</h2>
                <div className="w-full mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="solo-timer-toggle"
                        checked={isSoloTimerEnabled}
                        onCheckedChange={setIsSoloTimerEnabled}
                        className="data-[state=checked]:bg-gray-600 h-4 w-8"
                      />
                      <Label htmlFor="solo-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-black dark:text-white">
                        <Timer className="h-3 w-3" />
                        <span>Round Timer</span>
                      </Label>
                    </div>
                    {isSoloTimerEnabled && (
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-300">
                        {formatTime(practiceTimerSeconds)}
                      </span>
                    )}
                  </div>
                  {isSoloTimerEnabled && (
                    <div className="relative mb-4">
                       <div className="pt-6">
                        <Slider
                          value={[practiceTimerSeconds]}
                          min={minTimerValue}
                          max={maxTimerValue}
                          step={stepSize}
                          onValueChange={(value) => setPracticeTimerSeconds(value[0])}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white mt-auto flex items-center justify-center gap-2"
                  onClick={() => handleStartGame('classic')}
                  disabled={isLoading}
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? 'Loading...' : 'Start Practice'}
                </Button>
              </div>

              {/* Friends Mode Card */}
              <div className="bg-white dark:bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-gray-200/20 dark:border-gray-800/20 hover:border-gray-300/40 dark:hover:border-gray-700/40 transition-all relative">
                {isGuest && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-black/60 rounded-xl z-10">
                    <div className="text-center p-4">
                      <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                      <p className="text-black dark:text-white text-sm">Sign in to challenge your friends and track your wins.</p>
                      <Button
                        className="mt-3 bg-amber-500 hover:bg-amber-600 text-black text-sm"
                        onClick={() => handleStartGame('friends')}
                      >
                        Sign In
                      </Button>
                    </div>
                  </div>
                )}
                <div className={`${iconContainerStyle} ${friendsColor}`}>
                  <Users className={iconStyle} />
                </div>
                <h2 className="text-xl font-bold text-black dark:text-white mb-6">Friends</h2>
                <div className="w-full mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="friends-timer-toggle"
                        checked={isFriendsTimerEnabled}
                        onCheckedChange={setIsFriendsTimerEnabled}
                        className="data-[state=checked]:bg-gray-600 h-4 w-8"
                      />
                      <Label htmlFor="friends-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-black dark:text-white">
                        <Timer className="h-3 w-3" />
                        <span>Round Timer</span>
                      </Label>
                    </div>
                    {isFriendsTimerEnabled && (
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-300">
                        {formatTime(friendsTimerSeconds)}
                      </span>
                    )}
                  </div>
                  {isFriendsTimerEnabled && (
                    <div className="relative mb-4">
                      <div className="pt-6">
                        <Slider
                          value={[friendsTimerSeconds]}
                          min={minTimerValue}
                          max={maxTimerValue}
                          step={stepSize}
                          onValueChange={(value) => setFriendsTimerSeconds(value[0])}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white mt-auto flex items-center justify-center gap-2"
                  onClick={() => handleStartGame('friends')}
                  disabled={isLoading || isGuest}
                >
                  <Play className="h-4 w-4" />
                  {isLoading ? 'Loading...' : 'Play with Friends'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-white text-lg font-medium">Loading...</p>
            </div>
          )}
        </div>
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
      
      <FriendsGameModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        onStartGame={handleStartFriendsGame}
        isLoading={isLoading}
      />
      
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