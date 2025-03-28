
import { useState, useEffect } from 'react';
import { Globe, Clock, Lightbulb, Users, Share2, Copy, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import FriendsInviteDialog from '@/components/friends/FriendsInviteDialog';
import AuthModal from '@/components/auth/AuthModal';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Home = () => {
  const [activeTab, setActiveTab] = useState<'play' | 'compete'>('play');
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(false);
  const [hintsCount, setHintsCount] = useState<number>(2);
  const [linkCopied, setLinkCopied] = useState(false);
  const [useMiles, setUseMiles] = useState<boolean>(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    isAuthenticated
  } = useAuth();
  const [dailyPlayed, setDailyPlayed] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");
  const [timeUntilNextDaily, setTimeUntilNextDaily] = useState("");
  
  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    const dailyCompleted = localStorage.getItem('dailyCompleted');
    
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      const today = new Date();
      setDailyDate(lastPlayedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      const isSameDay = lastPlayedDate.getDate() === today.getDate() && 
                       lastPlayedDate.getMonth() === today.getMonth() && 
                       lastPlayedDate.getFullYear() === today.getFullYear();
      
      setDailyPlayed(isSameDay && dailyCompleted === 'true');
      
      if (isSameDay && dailyCompleted === 'true') {
        const updateTimer = () => {
          const now = new Date();
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          const timeLeftMs = tomorrow.getTime() - now.getTime();
          const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
          const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
          
          setTimeUntilNextDaily(`${hoursLeft}h ${minutesLeft}m`);
        };
        
        updateTimer();
        const timerInterval = setInterval(updateTimer, 60000);
        
        return () => clearInterval(timerInterval);
      }
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
    }
    
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
    
    const gameSettings = localStorage.getItem('gameSettings');
    if (gameSettings) {
      try {
        const settings = JSON.parse(gameSettings);
        if (settings.timerEnabled !== undefined) {
          setTimerEnabled(settings.timerEnabled);
        }
        if (settings.timerMinutes !== undefined) {
          setTimerMinutes(settings.timerMinutes);
        }
        if (settings.hintsEnabled !== undefined) {
          setHintsEnabled(settings.hintsEnabled);
        }
        if (settings.initialHintCoins !== undefined) {
          setHintsCount(settings.initialHintCoins);
        }
      } catch (error) {
        console.error("Error parsing game settings:", error);
      }
    }
  }, []);
  
  const handleStartGame = () => {
    const gameSettings = {
      timerEnabled,
      timerMinutes: timerMinutes,
      timerDuration: timerMinutes * 60,
      hintsEnabled,
      initialHintCoins: hintsEnabled ? hintsCount : 0,
      distanceFormat: useMiles ? 'miles' : 'km'
    };
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    if (activeTab === 'compete') {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        toast({
          title: "Login required",
          description: "You need to be logged in to play the daily challenge"
        });
        return;
      }
      
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
      localStorage.removeItem('dailyCompleted');
      
      const dailySettings = {
        ...gameSettings,
        timerEnabled: true,
        timerMinutes: 5,
        timerDuration: 300
      };
      localStorage.setItem('gameSettings', JSON.stringify(dailySettings));
    }
    
    navigate('/play');
  };
  
  const generateGameLink = () => {
    const gameId = Math.random().toString(36).substring(2, 8);
    return `${window.location.origin}/play?mode=friends&id=${gameId}`;
  };
  
  const copyGameLink = () => {
    const link = generateGameLink();
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({
      title: "Link copied!",
      description: "Game link has been copied to clipboard"
    });
    setTimeout(() => {
      setLinkCopied(false);
    }, 2000);
  };
  
  const handleInviteFriendsAndStart = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      toast({
        title: "Login required",
        description: "You need to be logged in to invite friends"
      });
      return;
    }
    
    toast({
      title: "Invitations sent!",
      description: "Your friends have been invited to join the game"
    });
    handleStartGame();
  };
  
  return <div className="min-h-[100dvh] bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="play" value={activeTab} onValueChange={v => setActiveTab(v as 'play' | 'compete')} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="play">Play</TabsTrigger>
            <TabsTrigger value="compete">Compete</TabsTrigger>
          </TabsList>
          
          <TabsContent value="play" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4 mt-2">
                    <Clock className="h-5 w-5" />
                    <CardTitle className="text-xl">Timer</CardTitle>
                    <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                  </div>
                  <CardDescription>Race against the clock.</CardDescription>
                </CardHeader>
                <CardContent>
                  {timerEnabled && <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <Label>Time Limit: {timerMinutes} minutes</Label>
                      </div>
                      <Slider value={[timerMinutes]} min={1} max={10} step={1} onValueChange={value => setTimerMinutes(value[0])} />
                    </div>}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4 mt-2">
                    <Lightbulb className="h-5 w-5" />
                    <CardTitle className="text-xl">Hints</CardTitle>
                    <Switch checked={hintsEnabled} onCheckedChange={setHintsEnabled} />
                  </div>
                  <CardDescription>Using a hint will deduct 500 points.</CardDescription>
                </CardHeader>
                <CardContent>
                  {hintsEnabled && <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <Label>Hints per game: {hintsCount}</Label>
                      </div>
                      <Slider value={[hintsCount]} min={1} max={10} step={1} onValueChange={value => setHintsCount(value[0])} />
                    </div>}
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={handleStartGame} className="w-full max-w-md">
                Start Game
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="compete" className="mt-6">
            {!isAuthenticated && (
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login required</AlertTitle>
                <AlertDescription>
                  You must be signed in to compete in the daily challenge or with friends.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-8">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">
                  {dailyPlayed ? 'Daily Challenge: Completed' : 'Daily Challenge'}
                </h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Compete with the world on the same set of random images.</p>
                
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="md:mr-4">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">One attempt per day</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Timer: 5 minutes</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Hints available: 2</p>
                  </div>
                  
                  {dailyPlayed ? (
                    <div className="mt-4 md:mt-0 p-4 bg-primary/10 rounded-md text-center w-full md:w-auto">
                      <div className="font-medium text-lg mb-1">Today's score: {dailyScore}</div>
                      <div className="flex items-center justify-center gap-2 text-sm text-primary">
                        <Clock className="h-4 w-4" />
                        <span>Next challenge in: {timeUntilNextDaily}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 md:mt-0 w-full md:w-auto">
                      <Button 
                        onClick={handleStartGame} 
                        className="w-full md:min-w-[200px]"
                        disabled={!isAuthenticated}
                      >
                        Start Daily Challenge
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Friends Mode</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Invite your friends to play together.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Label className="text-sm font-medium" htmlFor="friends-timer-toggle">Timer</Label>
                      <Switch id="friends-timer-toggle" checked={timerEnabled} onCheckedChange={setTimerEnabled} />
                    </div>
                    {timerEnabled && <div>
                        <div className="flex justify-between mb-2">
                          <Label>Time Limit: {timerMinutes} minutes</Label>
                        </div>
                        <Slider value={[timerMinutes]} min={1} max={10} step={1} onValueChange={value => setTimerMinutes(value[0])} />
                      </div>}
                    <p className="text-xs text-muted-foreground">Race against the clock</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <Label className="text-sm font-medium" htmlFor="friends-hints-toggle">Hints</Label>
                      <Switch id="friends-hints-toggle" checked={hintsEnabled} onCheckedChange={setHintsEnabled} />
                    </div>
                    {hintsEnabled && <div>
                        <div className="flex justify-between mb-2">
                          <Label>Hints per game: {hintsCount}</Label>
                        </div>
                        <Slider value={[hintsCount]} min={1} max={10} step={1} onValueChange={value => setHintsCount(value[0])} />
                      </div>}
                    <p className="text-xs text-muted-foreground">Using a hint will deduct 500 points</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center gap-2" 
                    onClick={copyGameLink}
                    disabled={!isAuthenticated}
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy Game Link"}
                  </Button>
                  <FriendsInviteDialog 
                    trigger={
                      <Button 
                        className="flex-1 flex items-center gap-2"
                        disabled={!isAuthenticated}
                      >
                        <Users className="h-4 w-4" />
                        Invite and Start Game
                      </Button>
                    } 
                    onInviteAndStart={handleInviteFriendsAndStart} 
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} autoFocus={false} />
    </div>;
};

export default Home;
