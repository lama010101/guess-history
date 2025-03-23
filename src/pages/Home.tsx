
import { useState, useEffect } from 'react';
import { Globe, Clock, Lightbulb, Users, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';

const Home = () => {
  const [activeTab, setActiveTab] = useState<'compete' | 'play'>('compete');
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true);
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(true);
  const [hintsCount, setHintsCount] = useState<number>(2);
  const [linkCopied, setLinkCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const [dailyPlayed, setDailyPlayed] = useState(false);
  
  // Check if daily challenge was played today
  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed).toDateString();
      const today = new Date().toDateString();
      setDailyPlayed(lastPlayedDate === today);
    }
  }, []);

  const handleStartGame = () => {
    // Save game settings to localStorage
    const gameSettings = {
      timerEnabled,
      timerMinutes: timerMinutes,
      hintsEnabled,
      initialHintCoins: hintsEnabled ? hintsCount : 0,
    };
    
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    // If starting daily challenge, mark it as played today
    if (activeTab === 'compete') {
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
    }
    
    // Navigate to the game page
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
  
  const inviteFriend = () => {
    // This would normally open a friends selection modal
    toast({
      title: "Invite sent!",
      description: "Your friend has been invited to play"
    });
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
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Play today's challenge. Same 5 images as everyone else.</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">One attempt per day</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Timer: 5 minutes</p>
                  </div>
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
              
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Friends Mode</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Challenge your friends with a custom game link.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1 flex items-center gap-2"
                    onClick={copyGameLink}
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {linkCopied ? "Copied!" : "Copy Game Link"}
                  </Button>
                  <Button 
                    className="flex-1 flex items-center gap-2"
                    onClick={inviteFriend}
                  >
                    <Users className="h-4 w-4" />
                    Invite Friends
                  </Button>
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
                  <CardTitle className="text-xl mt-2">Timer</CardTitle>
                  <CardDescription>Race against the clock.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="timer-toggle">Enable Timer</Label>
                      <Switch 
                        id="timer-toggle" 
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
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full inline-flex">
                    <Lightbulb className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl mt-2">Hints</CardTitle>
                  <CardDescription>Enable hints to get help during the game.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="hints-toggle">Enable Hints</Label>
                      <Switch 
                        id="hints-toggle" 
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
                  </div>
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
