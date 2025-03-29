
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/services/auth';
import { useDailyGame } from '@/hooks/useDailyGame';
import Navbar from '@/components/Navbar';
import DailyCountdown from '@/components/DailyCountdown';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dailyCompleted, dailyScore, setDailyGame } = useDailyGame();
  const [showDailyButton, setShowDailyButton] = useState(true);
  
  // Game settings states
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hintCount, setHintCount] = useState(5);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(5);
  
  // Friend game settings states
  const [friendHintsEnabled, setFriendHintsEnabled] = useState(false);
  const [friendHintCount, setFriendHintCount] = useState(5);
  const [friendTimerEnabled, setFriendTimerEnabled] = useState(false);
  const [friendTimerMinutes, setFriendTimerMinutes] = useState(5);

  useEffect(() => {
    setShowDailyButton(!dailyCompleted);
    
    // Load game settings from localStorage
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings) {
          setHintsEnabled(settings.hintsEnabled || false);
          setHintCount(settings.hintCount || 5);
          setTimerEnabled(settings.timerEnabled || false);
          setTimerMinutes(settings.timerMinutes || 5);
          
          setFriendHintsEnabled(settings.friendHintsEnabled || false);
          setFriendHintCount(settings.friendHintCount || 5);
          setFriendTimerEnabled(settings.friendTimerEnabled || false);
          setFriendTimerMinutes(settings.friendTimerMinutes || 5);
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, [dailyCompleted]);

  const saveGameSettings = () => {
    const settings = {
      hintsEnabled,
      hintCount,
      timerEnabled,
      timerMinutes,
      friendHintsEnabled,
      friendHintCount,
      friendTimerEnabled,
      friendTimerMinutes
    };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    localStorage.setItem('initialHintCoins', hintCount.toString());
  };

  const handlePlayNow = () => {
    saveGameSettings();
    navigate('/play');
  };

  const handleDailyChallenge = () => {
    setDailyGame(true);
    navigate('/play');
  };

  const handlePlayWithFriends = () => {
    saveGameSettings();
    navigate('/friends');
  };

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-gray-900 flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <div className="container px-4 py-12 mb-8 mt-auto">
          <div className="max-w-3xl mx-auto">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-primary/5 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-3">Play Now</h2>
                <p className="mb-5 text-muted-foreground">
                  Start a regular game with 5 rounds of historical photos. Test your knowledge of history and geography!
                </p>
                
                <div className="space-y-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="hints" 
                        checked={hintsEnabled} 
                        onCheckedChange={setHintsEnabled}
                      />
                      <Label htmlFor="hints">Hints</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {hintsEnabled ? `${hintCount} hints` : 'Off'}
                    </span>
                  </div>
                  
                  {hintsEnabled && (
                    <Slider 
                      value={[hintCount]} 
                      min={0} 
                      max={10} 
                      step={1} 
                      onValueChange={(value) => setHintCount(value[0])}
                      className="py-2"
                    />
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="timer" 
                        checked={timerEnabled} 
                        onCheckedChange={setTimerEnabled}
                      />
                      <Label htmlFor="timer">Timer</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {timerEnabled ? `${timerMinutes} min` : 'Off'}
                    </span>
                  </div>
                  
                  {timerEnabled && (
                    <Slider 
                      value={[timerMinutes]} 
                      min={1} 
                      max={10} 
                      step={1} 
                      onValueChange={(value) => setTimerMinutes(value[0])}
                      className="py-2"
                    />
                  )}
                </div>
                
                <Button onClick={handlePlayNow} size="lg" className="w-full">
                  Play Now
                </Button>
              </div>
              
              <div className="bg-blue-500/10 dark:bg-blue-500/5 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-3">Play with Friends</h2>
                <p className="mb-5 text-muted-foreground">
                  Challenge your friends to see who has the best knowledge of history and geography!
                </p>
                
                <div className="space-y-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="friend-hints" 
                        checked={friendHintsEnabled} 
                        onCheckedChange={setFriendHintsEnabled}
                      />
                      <Label htmlFor="friend-hints">Hints</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {friendHintsEnabled ? `${friendHintCount} hints` : 'Off'}
                    </span>
                  </div>
                  
                  {friendHintsEnabled && (
                    <Slider 
                      value={[friendHintCount]} 
                      min={0} 
                      max={10} 
                      step={1} 
                      onValueChange={(value) => setFriendHintCount(value[0])}
                      className="py-2"
                    />
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="friend-timer" 
                        checked={friendTimerEnabled} 
                        onCheckedChange={setFriendTimerEnabled}
                      />
                      <Label htmlFor="friend-timer">Timer</Label>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {friendTimerEnabled ? `${friendTimerMinutes} min` : 'Off'}
                    </span>
                  </div>
                  
                  {friendTimerEnabled && (
                    <Slider 
                      value={[friendTimerMinutes]} 
                      min={1} 
                      max={10} 
                      step={1} 
                      onValueChange={(value) => setFriendTimerMinutes(value[0])}
                      className="py-2"
                    />
                  )}
                </div>
                
                <Button 
                  onClick={handlePlayWithFriends} 
                  variant="outline" 
                  size="lg" 
                  className="w-full border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400"
                >
                  Play with Friends
                </Button>
              </div>
              
              <div className="bg-yellow-500/10 dark:bg-yellow-500/5 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-3">Daily Challenge</h2>
                <p className="mb-5 text-muted-foreground">
                  One special challenge every day. Compare your score with friends and climb the leaderboard!
                </p>
                
                {showDailyButton ? (
                  <Button 
                    onClick={handleDailyChallenge} 
                    variant="outline" 
                    size="lg" 
                    className="w-full border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                  >
                    Play Today's Challenge
                  </Button>
                ) : (
                  <DailyCountdown score={dailyScore} />
                )}
              </div>
            </div>
            
            {user?.isGuest && (
              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 text-center rounded-lg">
                <p className="text-blue-600 dark:text-blue-300 mb-2">
                  Sign up to save your progress and compete on the leaderboard!
                </p>
                <Link to="/profile">
                  <Button variant="outline" className="border-blue-300 dark:border-blue-700">
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
