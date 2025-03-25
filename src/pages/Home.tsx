
import { useState, useEffect } from 'react';
import { Globe, Clock, Lightbulb, Users, Share2, Copy, Check } from 'lucide-react';
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

const Home = () => {
  const [activeTab, setActiveTab] = useState<'compete' | 'play'>('compete');
  const [timerEnabled, setTimerEnabled] = useState<boolean>(false);
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(false);
  const [hintsCount, setHintsCount] = useState<number>(2);
  const [linkCopied, setLinkCopied] = useState(false);
  const [useMiles, setUseMiles] = useState<boolean>(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [dailyPlayed, setDailyPlayed] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");
  const [timeUntilNextDaily, setTimeUntilNextDaily] = useState("");
  
  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      const today = new Date();
      
      setDailyDate(lastPlayedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      const isSameDay = 
        lastPlayedDate.getDate() === today.getDate() &&
        lastPlayedDate.getMonth() === today.getMonth() &&
        lastPlayedDate.getFullYear() === today.getFullYear();
      
      setDailyPlayed(isSameDay);
      
      if (isSameDay) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const hoursLeft = Math.floor((tomorrow.getTime() - today.getTime()) / (1000 * 60 * 60));
        const minutesLeft = Math.floor(((tomorrow.getTime() - today.getTime()) % (1000 * 60 * 60)) / (1000 * 60));
        
        setTimeUntilNextDaily(`${hoursLeft}h ${minutesLeft}m`);
      }
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
    }
    
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
  }, []);

  const handleStartGame = () => {
    const gameSettings = {
      timerEnabled,
      timerMinutes: timerMinutes,
      hintsEnabled,
      initialHintCoins: hintsEnabled ? hintsCount : 0,
      distanceFormat: useMiles ? 'miles' : 'km',
    };
    
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    if (activeTab === 'compete') {
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
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
    toast({
      title: "Invitations sent!",
      description: "Your friends have been invited to join the game"
    });
    
    handleStartGame();
  };

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="compete" value={activeTab} onValueChange={(v) => setActiveTab(v as 'compete' | 'play')} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="compete">Compete</TabsTrigger>
            <TabsTrigger value="play">Play</TabsTrigger>
          </TabsList>
          
          <TabsContent value="compete" className="mt-6">
            <div className="space-y-8">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Daily Challenge</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Same 5 images as everyone else.</p>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">One attempt per day</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Timer: 5 minutes</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Hints available: 2</p>
                    
                    {/* Daily score and countdown always visible when played */}
                    {dailyPlayed && (
                      <div className="mt-2 p-2 bg-primary/10 rounded-md">
                        <p className="font-medium">Today's score: {dailyScore}</p>
                        <p className="text-sm text-neutral-500">Next challenge in: {timeUntilNextDaily}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 md:mt-0">
                    <Button 
                      onClick={() => {
                        if (isAuthenticated) {
                          handleStartGame();
                        } else {
                          toast({
                            title: "Login required",
                            description: "You need to be logged in to play the daily challenge"
                          });
                        }
                      }}
                      disabled={dailyPlayed}
                    >
                      {dailyPlayed ? "Already Played Today" : "Start Daily Challenge"}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Friends Mode</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Invite your registered friends here or share the link.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Label className="text-sm font-medium" htmlFor="friends-timer-toggle">Timer</Label>
                      <Switch 
                        id="friends-timer-toggle" 
                        checked={timerEnabled} 
                        onCheckedChange={setTimerEnabled} 
                      />
                    </div>
                    {timerEnabled && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>Time Limit: {timerMinutes} minutes</Label>
                        </div>
                        <Slider 
                          value={[timerMinutes]} 
                          min={1} 
                          max={10} 
                          step={1} 
                          onValueChange={(value) => setTimerMinutes(value[0])}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Race against the clock</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <Label className="text-sm font-medium" htmlFor="friends-hints-toggle">Hints</Label>
                      <Switch 
                        id="friends-hints-toggle" 
                        checked={hintsEnabled} 
                        onCheckedChange={setHintsEnabled} 
                      />
                    </div>
                    {hintsEnabled && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <Label>Hints per game: {hintsCount}</Label>
                        </div>
                        <Slider 
                          value={[hintsCount]} 
                          min={1} 
                          max={10} 
                          step={1} 
                          onValueChange={(value) => setHintsCount(value[0])}
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Using a hint will deduct 500 points</p>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center gap-2"
                    onClick={copyGameLink}
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy Game Link"}
                  </Button>
                  <FriendsInviteDialog 
                    trigger={
                      <Button 
                        className="flex-1 flex items-center gap-2"
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
          
          <TabsContent value="play" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full inline-flex">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                      Timer
                    </CardTitle>
                    <Switch 
                      checked={timerEnabled}
                      onCheckedChange={setTimerEnabled}
                    />
                  </div>
                  <CardDescription>Race against the clock.</CardDescription>
                </CardHeader>
                <CardContent>
                  {timerEnabled && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <Label>Time Limit: {timerMinutes} minutes</Label>
                      </div>
                      <Slider 
                        value={[timerMinutes]} 
                        min={1} 
                        max={10} 
                        step={1} 
                        onValueChange={(value) => setTimerMinutes(value[0])}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full inline-flex">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <CardTitle className="text-xl flex items-center gap-2">
                      Hints
                    </CardTitle>
                    <Switch 
                      checked={hintsEnabled}
                      onCheckedChange={setHintsEnabled}
                    />
                  </div>
                  <CardDescription>Using a hint will deduct 500 points.</CardDescription>
                </CardHeader>
                <CardContent>
                  {hintsEnabled && (
                    <div className="mt-4">
                      <div className="flex justify-between mb-2">
                        <Label>Hints per game: {hintsCount}</Label>
                      </div>
                      <Slider 
                        value={[hintsCount]} 
                        min={1} 
                        max={10} 
                        step={1} 
                        onValueChange={(value) => setHintsCount(value[0])}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Button size="lg" onClick={handleStartGame} className="w-full max-w-md">
                Start Game
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
