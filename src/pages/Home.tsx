import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import DailyCountdown from '@/components/DailyCountdown';
import { useAuth } from '@/services/auth';
import PlayWithFriendsDialog from '@/components/PlayWithFriendsDialog';
import { useGameSettings } from '@/hooks/useGameSettings';
import { useDailyLimit } from '@/hooks/useDailyLimit';
import { Clock, HelpCircle, Medal, Share2, Trophy, Users, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, openAuthModal } = useAuth();
  const [showPlayWithFriendsDialog, setShowPlayWithFriendsDialog] = useState(false);
  const { toast } = useToast();
  const { 
    timerEnabled, setTimerEnabled, 
    timerMinutes, setTimerMinutes,
    hintsEnabled, setHintsEnabled,
    hintCount, setHintCount
  } = useGameSettings();
  const {
    canPlayDaily,
    todayScore,
    timeUntilNextReset
  } = useDailyLimit();

  const handlePlayNow = () => {
    const gameSettings = {
      timerEnabled,
      timerMinutes,
      hintsEnabled,
      hintCount
    };
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    
    navigate('/play');
  };
  
  const handlePlayDaily = () => {
    if (!canPlayDaily) {
      toast({
        title: "Already played today",
        description: "You've already completed today's challenge. Come back tomorrow for a new one!",
        variant: "destructive"
      });
      return;
    }
    
    navigate('/play?mode=daily');
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-6 space-y-8 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-4xl font-bold">Test Your Historical Knowledge</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Guess when and where historical events happened. How accurate can you be?
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Play Now</CardTitle>
              <CardDescription>
                Start a new game with multiple rounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="timer-toggle">Timer</Label>
                  </div>
                  <Switch 
                    id="timer-toggle" 
                    checked={timerEnabled} 
                    onCheckedChange={setTimerEnabled} 
                  />
                </div>
                
                {timerEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Game duration: {timerMinutes} min</span>
                    </div>
                    <Slider 
                      min={1} 
                      max={10} 
                      step={1} 
                      value={[timerMinutes]} 
                      onValueChange={(value) => setTimerMinutes(value[0])} 
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="hints-toggle">Hints</Label>
                  </div>
                  <Switch 
                    id="hints-toggle" 
                    checked={hintsEnabled} 
                    onCheckedChange={setHintsEnabled} 
                  />
                </div>
                
                {hintsEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Hint coins: {hintCount}</span>
                    </div>
                    <Slider 
                      min={0} 
                      max={10} 
                      step={1} 
                      value={[hintCount]} 
                      onValueChange={(value) => setHintCount(value[0])} 
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handlePlayNow} className="w-full">
                Play Now
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="md:col-span-1">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Play with Friends</CardTitle>
              <CardDescription>
                Invite friends and compete together
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="friend-timer-toggle">Timer</Label>
                  </div>
                  <Switch 
                    id="friend-timer-toggle" 
                    checked={timerEnabled} 
                    onCheckedChange={setTimerEnabled} 
                  />
                </div>
                
                {timerEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Game duration: {timerMinutes} min</span>
                    </div>
                    <Slider 
                      min={1} 
                      max={10} 
                      step={1} 
                      value={[timerMinutes]} 
                      onValueChange={(value) => setTimerMinutes(value[0])} 
                    />
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="friend-hints-toggle">Hints</Label>
                  </div>
                  <Switch 
                    id="friend-hints-toggle" 
                    checked={hintsEnabled} 
                    onCheckedChange={setHintsEnabled} 
                  />
                </div>
                
                {hintsEnabled && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Hint coins: {hintCount}</span>
                    </div>
                    <Slider 
                      min={0} 
                      max={10} 
                      step={1} 
                      value={[hintCount]} 
                      onValueChange={(value) => setHintCount(value[0])} 
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => {
                  if (isAuthenticated) {
                    setShowPlayWithFriendsDialog(true);
                  } else {
                    openAuthModal();
                    toast({
                      title: "Login required",
                      description: "Please login or create an account to play with friends"
                    });
                  }
                }} 
                className="w-full"
              >
                <Users className="mr-2 h-4 w-4" />
                Play with Friends
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="md:col-span-1">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl">Daily Challenge</CardTitle>
              <CardDescription>
                One new challenge every day
              </CardDescription>
            </CardHeader>
            <CardContent>
              {canPlayDaily ? (
                <div className="space-y-2 text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    Each day brings a new event to guess.
                  </p>
                  <div className="flex justify-center">
                    <Trophy className="h-16 w-16 text-amber-500" />
                  </div>
                  <p className="text-sm font-medium">
                    Today's challenge is ready!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="flex justify-center">
                    <Medal className="h-16 w-16 text-emerald-500" />
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium">Today's Score</p>
                    <p className="text-2xl font-bold">{todayScore?.toLocaleString()}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Next challenge in:</p>
                    <DailyCountdown 
                      score={todayScore || 0} 
                      targetDate={new Date(Date.now() + timeUntilNextReset)} 
                      className="text-lg font-mono" 
                    />
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              {canPlayDaily ? (
                <Button 
                  onClick={handlePlayDaily} 
                  variant="outline" 
                  className="w-full"
                >
                  Play Today's Challenge
                </Button>
              ) : (
                <Button 
                  disabled 
                  variant="outline" 
                  className="w-full"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Already Played Today
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        <div className="text-center mt-8">
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/leaderboard">
                <Trophy className="mr-2 h-4 w-4" />
                Leaderboard
              </Link>
            </Button>
            
            <Button variant="outline" onClick={() => setShowPlayWithFriendsDialog(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share Game
            </Button>
          </div>
        </div>
      </main>
      
      <PlayWithFriendsDialog 
        open={showPlayWithFriendsDialog} 
        onOpenChange={setShowPlayWithFriendsDialog} 
      />
    </div>
  );
}
