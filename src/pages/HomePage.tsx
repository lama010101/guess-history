import React, { useState, useEffect, useCallback } from 'react';
import { Award, Target, Users, Timer, Lock, Play } from "lucide-react";
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
import FriendsGameModal from '@/components/FriendsGameModal';
import { AuthModal } from '@/components/AuthModal';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from '@/contexts/AuthContext';
import GuestBadge from '@/components/GuestBadge';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { GameModeCard } from "@/components/GameModeCard";
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
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
    const loadUserSettings = async () => {
      if (user) {
        setIsLoadingUserSettings(true);
        try {
          const settings = await fetchUserSettings(user.id);
          setUserSettings(settings);
          const userProfile = await fetchUserProfile(user.id); // Potentially needed for other settings aspects or just to confirm user
          setProfile(userProfile);
          
          // Show guest badge if the user is a guest
          setShowGuestBadge(isGuest);
        } catch (error) {
          console.error("Error fetching user settings for popup:", error);
          // Handle error, maybe set default settings
        }
        setIsLoadingUserSettings(false);
      }
    };
    loadUserSettings();
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
          // The startGame function will handle navigation to the correct route
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
          <div className="w-full max-w-6xl mx-auto">
            {/* Game Mode Selection */}
            
            
            {gameContext ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Practice Mode Card */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-orange-500/20 hover:border-orange-500/40 transition-all">
                  <div className={`${iconContainerStyle} ${practiceColor}`}>
                    <Target className={iconStyle} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-6">Practice</h2>
                  
                  {/* Timer Toggle */}
                  <div className="w-full mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="solo-timer-toggle" 
                          checked={isSoloTimerEnabled}
                          onCheckedChange={setIsSoloTimerEnabled}
                          className="data-[state=checked]:bg-orange-500 h-4 w-8"
                        />
                        <Label htmlFor="solo-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-white">
                          <Timer className="h-3 w-3" />
                          <span>Round Timer</span>
                        </Label>
                      </div>
                      {isSoloTimerEnabled && (
                        <span className="text-sm font-medium text-orange-400">
                          {formatTime(practiceTimerSeconds)}
                        </span>
                      )}
                    </div>
                    
                    {/* Timer Slider */}
                    {isSoloTimerEnabled && (
                      <div className="relative mb-4">
                        <div className="absolute w-full h-6 pointer-events-none" style={{ bottom: '0px' }}>
                          {[5, 60, 120, 180, 240, 300].map((value) => {
                            const position = ((value - minTimerValue) / (maxTimerValue - minTimerValue)) * 100;
                            return (
                              <div 
                                key={value} 
                                className="absolute flex flex-col items-center" 
                                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                              >
                                <span className="text-xs text-gray-400 mb-1">
                                  {value === 5 ? '5s' : 
                                   value === 60 ? '1m' : 
                                   value === 120 ? '2m' : 
                                   value === 180 ? '3m' : 
                                   value === 240 ? '4m' : '5m'}
                                </span>
                                <div className="h-1.5 w-0.5 bg-gray-400" />
                              </div>
                            );
                          })}
                        </div>
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
                  
                  {/* Start Button */}
                  <Button 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white mt-auto flex items-center justify-center gap-2"
                    onClick={() => handleStartGame('classic')}
                    disabled={isLoading}
                  >
                    <Play className="h-4 w-4" />
                    {isLoading ? 'Loading...' : 'Start Practice'}
                  </Button>
                </div>
                
                {/* Friends Mode Card */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-blue-500/20 hover:border-blue-500/40 transition-all relative">
                  {/* Overlay for guest users */}
                  {isGuest && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
                      <div className="text-center p-4">
                        <Lock className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <p className="text-white text-sm">Sign in to challenge your friends and track your wins.</p>
                      </div>
                    </div>
                  )}
                  
                  <div className={`${iconContainerStyle} ${friendsColor}`}>
                    <Users className={iconStyle} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-6">Friends</h2>
                  
                  {/* Timer Toggle */}
                  <div className="w-full mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="friends-timer-toggle" 
                          checked={isFriendsTimerEnabled}
                          onCheckedChange={setIsFriendsTimerEnabled}
                          className="data-[state=checked]:bg-blue-500 h-4 w-8"
                        />
                        <Label htmlFor="friends-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm text-white">
                          <Timer className="h-3 w-3" />
                          <span>Round Timer</span>
                        </Label>
                      </div>
                      {isFriendsTimerEnabled && (
                        <span className="text-sm font-medium text-blue-400">
                          {formatTime(friendsTimerSeconds)}
                        </span>
                      )}
                    </div>
                    
                    {/* Timer Slider */}
                    {isFriendsTimerEnabled && (
                      <div className="relative mb-4">
                        <div className="absolute w-full h-6 pointer-events-none" style={{ bottom: '0px' }}>
                          {[5, 60, 120, 180, 240, 300].map((value) => {
                            const position = ((value - minTimerValue) / (maxTimerValue - minTimerValue)) * 100;
                            return (
                              <div 
                                key={value} 
                                className="absolute flex flex-col items-center" 
                                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                              >
                                <span className="text-xs text-gray-400 mb-1">
                                  {value === 5 ? '5s' : 
                                   value === 60 ? '1m' : 
                                   value === 120 ? '2m' : 
                                   value === 180 ? '3m' : 
                                   value === 240 ? '4m' : '5m'}
                                </span>
                                <div className="h-1.5 w-0.5 bg-gray-400" />
                              </div>
                            );
                          })}
                        </div>
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
                  
                  {/* Start Button */}
                  <Button 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white mt-auto flex items-center justify-center gap-2"
                    onClick={() => handleStartGame('time-attack')}
                    disabled={isLoading || isGuest}
                  >
                    <Play className="h-4 w-4" />
                    {isLoading ? 'Loading...' : 'Play with Friends'}
                  </Button>
                </div>
                
                {/* Challenge Mode Card */}
                <div className="bg-black/40 backdrop-blur-sm rounded-xl p-6 flex flex-col items-center border border-purple-500/20 hover:border-purple-500/40 transition-all relative">
                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl z-10">
                    <div className="text-center p-4">
                      <p className="text-white text-lg font-medium mb-2">Coming Soon</p>
                      <p className="text-gray-300 text-sm">Challenge mode will be available in a future update.</p>
                    </div>
                  </div>
                  
                  <div className={`${iconContainerStyle} ${challengeColor}`}>
                    <Award className={iconStyle} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-6">Challenge</h2>
                  
                  <div className="flex-grow w-full flex items-center justify-center mb-6">
                    <span className="text-sm text-gray-400">Compete against other players in timed challenges</span>
                  </div>
                  
                  {/* Start Button (Disabled) */}
                  <Button 
                    className="w-full bg-purple-500/50 text-white/70 cursor-not-allowed mt-auto flex items-center justify-center gap-2"
                    disabled={true}
                  >
                    <Play className="h-4 w-4" />
                    Coming Soon
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-[450px] bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30">
                      <div className="h-16 w-16 bg-gray-700/50 rounded-full mx-auto mb-6"></div>
                      <div className="h-6 bg-gray-700/50 rounded w-1/3 mx-auto mb-8"></div>
                      <div className="h-4 bg-gray-700/50 rounded w-3/4 mx-auto mb-4"></div>
                      <div className="h-4 bg-gray-700/50 rounded w-2/3 mx-auto mb-8"></div>
                      <div className="h-10 bg-gray-700/50 rounded w-full mx-auto mt-auto"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Loading Popup */}
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-white text-lg font-medium">Loading 5 random images</p>
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