import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Award, User, Timer } from "lucide-react";
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
import FriendsGameModal from '@/components/FriendsGameModal';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { GameModeCard } from "@/components/GameModeCard";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  width: '90%',
  maxWidth: '1200px',
  height: '90%',
  overflowY: 'auto',
  padding: '2rem',
  boxSizing: 'border-box',
  borderRadius: '0.5rem',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const HomePage = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // For profile specific settings if any, or just user id
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSoloTimerEnabled, setIsSoloTimerEnabled] = useState(false);
  const [soloTimerSeconds, setSoloTimerSeconds] = useState(300); // Default to 5 minutes
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
        } catch (error) {
          console.error("Error fetching user settings for popup:", error);
          // Handle error, maybe set default settings
        }
        setIsLoadingUserSettings(false);
      }
    };
    loadUserSettings();
  }, [user]);

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

    if (mode === 'time-attack') {
      setIsFriendsModalOpen(true);
      return;
    }
    
    if (!gameContext) {
      console.error('Game context is not available');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to start game. Please try again.",
      });
      return;
    }
    
    if (!isLoading) {
      try {
        // Pass timer settings to startGame if it's a solo game with timer enabled
        // When timer is disabled, pass timerEnabled: false to ensure it doesn't show in the HUD
        const gameSettings = mode === 'classic'
          ? isSoloTimerEnabled 
              ? { timerSeconds: soloTimerSeconds, timerEnabled: true }
              : { timerEnabled: false }
          : {};
          
        await startGame?.(gameSettings);
        navigate('/game');
      } catch (error) {
        console.error('Error starting game:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start the game. Please try again.",
        });
      }
    }
  }, [user, gameContext, startGame, isLoading, navigate, toast, isSoloTimerEnabled, soloTimerSeconds, setPendingMode, setShowAuthModal, setIsFriendsModalOpen]);
  
  const handleStartFriendsGame = useCallback(async (settings: { timerSeconds: number; hintsPerGame: number }) => {
    setIsFriendsModalOpen(false);
    
    // Check if user is authenticated (either guest or registered)
    if (!user) {
      setPendingMode('time-attack');
      setShowAuthModal(true);
      return;
    }
    
    if (!gameContext) {
      console.error('Game context is not available');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Unable to start game. Please try again.",
      });
      return;
    }
    
    if (!isLoading) {
      try {
        // Call startGame without parameters since it doesn't accept any
        await startGame?.();
        navigate('/game');
      } catch (error) {
        console.error('Error starting friends game:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start the game. Please try again.",
        });
      }
    }
  }, [user, gameContext, startGame, isLoading, navigate, toast, setPendingMode, setShowAuthModal, setIsFriendsModalOpen]);


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
    // useEffect will handle starting the game with pendingMode
  };


  return (
    <div style={homePageStyle}>
      <div style={contentStyle}>
        <div className="container mx-auto px-4 py-12">
          {/* Game instructions, settings, etc. */}
          <div className="my-4"></div>
          
          {gameContext ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <GameModeCard
                title="Solo"
                description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
                mode="classic"
                icon={User}
                onStartGame={handleStartGame}
                isLoading={isLoading}
              >
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="solo-timer-toggle" 
                        checked={isSoloTimerEnabled}
                        onCheckedChange={setIsSoloTimerEnabled}
                        className="data-[state=checked]:bg-orange-500 h-4 w-8"
                      />
                      <Label htmlFor="solo-timer-toggle" className="flex items-center gap-1 cursor-pointer text-sm">
                        <Timer className="h-3 w-3" />
                        <span>Round Timer</span>
                      </Label>
                    </div>
                    {isSoloTimerEnabled && (
                      <span className="text-sm font-medium text-orange-400">
                        {formatTime(soloTimerSeconds)}
                      </span>
                    )}
                  </div>
                  {isSoloTimerEnabled && (
                    <div className="relative mb-6 mt-4">
                      {/* Calculate positions for markers based on their values */}
                      <div className="absolute w-full h-6 pointer-events-none" style={{ bottom: '0px' }}>
                        {[5, 60, 120, 180, 240, 300].map((value) => {
                          // Calculate position percentage based on value
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
                          value={[soloTimerSeconds]}
                          min={minTimerValue}
                          max={maxTimerValue}
                          step={stepSize}
                          onValueChange={(value) => setSoloTimerSeconds(value[0])}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </GameModeCard>
              
              <GameModeCard
                title="Friends"
                description="Race against the clock! Make quick decisions about historical events."
                mode="time-attack"
                icon={Clock}
                onStartGame={handleStartGame}
                isLoading={isLoading}
              />
              
              <GameModeCard
                title="Challenge"
                description="Compete with others in daily challenges and earn achievements."
                mode="challenge"
                icon={Award}
                onStartGame={handleStartGame}
                isLoading={isLoading}
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow">
                      <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto mb-4"></div>
                      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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

export default HomePage; // Export with new name 