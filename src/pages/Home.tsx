
import { useState, useEffect } from 'react';
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
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Home() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    isAuthenticated,
    openAuthModal
  } = useAuth();
  const [showPlayWithFriendsDialog, setShowPlayWithFriendsDialog] = useState(false);
  const {
    toast
  } = useToast();

  // Settings for "Play Now" section
  const [soloTimerEnabled, setSoloTimerEnabled] = useState(false);
  const [soloTimerMinutes, setSoloTimerMinutes] = useState(5);
  const [soloHintsEnabled, setSoloHintsEnabled] = useState(false);
  const [soloHintCount, setSoloHintCount] = useState(5);

  // Settings for "Play with Friends" section
  const [friendsTimerEnabled, setFriendsTimerEnabled] = useState(false);
  const [friendsTimerMinutes, setFriendsTimerMinutes] = useState(5);
  const [friendsHintsEnabled, setFriendsHintsEnabled] = useState(false);
  const [friendsHintCount, setFriendsHintCount] = useState(5);

  // Get global settings
  const {
    timerEnabled,
    setTimerEnabled,
    timerMinutes,
    setTimerMinutes,
    hintsEnabled,
    setHintsEnabled,
    hintCount,
    setHintCount
  } = useGameSettings();
  const {
    canPlayDaily,
    todayScore,
    timeUntilNextReset
  } = useDailyLimit();

  // Initialize local state from global settings
  useState(() => {
    setSoloTimerEnabled(timerEnabled);
    setSoloTimerMinutes(timerMinutes);
    setSoloHintsEnabled(hintsEnabled);
    setSoloHintCount(hintCount);
    setFriendsTimerEnabled(timerEnabled);
    setFriendsTimerMinutes(timerMinutes);
    setFriendsHintsEnabled(hintsEnabled);
    setFriendsHintCount(hintCount);
  });
  
  const handlePlayNow = () => {
    // Save solo settings to global game settings
    setTimerEnabled(soloTimerEnabled);
    setTimerMinutes(soloTimerMinutes);
    setHintsEnabled(soloHintsEnabled);
    setHintCount(soloHintCount);
    const gameSettings = {
      timerEnabled: soloTimerEnabled,
      timerMinutes: soloTimerMinutes,
      hintsEnabled: soloHintsEnabled,
      hintCount: soloHintCount
    };
    localStorage.setItem('gameSettings', JSON.stringify(gameSettings));
    navigate('/play');
  };
  
  const handlePlayWithFriends = () => {
    // Save friends settings to global game settings
    setTimerEnabled(friendsTimerEnabled);
    setTimerMinutes(friendsTimerMinutes);
    setHintsEnabled(friendsHintsEnabled);
    setHintCount(friendsHintCount);
    if (isAuthenticated) {
      setShowPlayWithFriendsDialog(true);
    } else {
      openAuthModal();
      toast({
        title: "Login required",
        description: "Please login or create an account to play with friends"
      });
    }
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

  // Prepare the cards data for the carousel
  const gameCards = [
    {
      id: "play-now",
      title: "Play Now",
      description: "Start a new game with multiple rounds",
      color: "bg-orange-400",
      buttonColor: "bg-orange-900 hover:bg-orange-800",
      buttonAction: handlePlayNow,
      buttonText: "Play Now",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="solo-timer-toggle">Timer</Label>
            </div>
            <Switch id="solo-timer-toggle" checked={soloTimerEnabled} onCheckedChange={setSoloTimerEnabled} />
          </div>
          
          {soloTimerEnabled && <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Game duration: {soloTimerMinutes} min</span>
              </div>
              <Slider min={1} max={10} step={1} value={[soloTimerMinutes]} onValueChange={value => setSoloTimerMinutes(value[0])} />
            </div>}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="solo-hints-toggle">Hints</Label>
            </div>
            <Switch id="solo-hints-toggle" checked={soloHintsEnabled} onCheckedChange={setSoloHintsEnabled} />
          </div>
          
          {soloHintsEnabled && <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hint coins: {soloHintCount}</span>
              </div>
              <Slider min={0} max={10} step={1} value={[soloHintCount]} onValueChange={value => setSoloHintCount(value[0])} />
            </div>}
        </div>
      )
    },
    {
      id: "play-with-friends",
      title: "Play with Friends",
      description: "Invite friends and compete together",
      color: "bg-emerald-400",
      buttonColor: "bg-emerald-900 hover:bg-emerald-800",
      buttonAction: handlePlayWithFriends,
      buttonText: (
        <>
          <Users className="mr-2 h-4 w-4" />
          Play with Friends
        </>
      ),
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="friend-timer-toggle">Timer</Label>
            </div>
            <Switch id="friend-timer-toggle" checked={friendsTimerEnabled} onCheckedChange={setFriendsTimerEnabled} />
          </div>
          
          {friendsTimerEnabled && <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Game duration: {friendsTimerMinutes} min</span>
              </div>
              <Slider min={1} max={10} step={1} value={[friendsTimerMinutes]} onValueChange={value => setFriendsTimerMinutes(value[0])} />
            </div>}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="friend-hints-toggle">Hints</Label>
            </div>
            <Switch id="friend-hints-toggle" checked={friendsHintsEnabled} onCheckedChange={setFriendsHintsEnabled} />
          </div>
          
          {friendsHintsEnabled && <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hint coins: {friendsHintCount}</span>
              </div>
              <Slider min={0} max={10} step={1} value={[friendsHintCount]} onValueChange={value => setFriendsHintCount(value[0])} />
            </div>}
        </div>
      )
    },
    {
      id: "daily-challenge",
      title: "Daily Challenge",
      description: "One new challenge every day",
      color: "bg-violet-400",
      buttonColor: "bg-violet-900 hover:bg-violet-800",
      buttonAction: handlePlayDaily,
      buttonText: canPlayDaily ? "Play Today's Challenge" : (
        <>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Already Played Today
        </>
      ),
      buttonDisabled: !canPlayDaily,
      content: canPlayDaily ? (
        <div className="space-y-2 text-center py-2">
          <div className="flex justify-center">
            <Trophy className="h-16 w-16 text-amber-500 py-0 bg-slate-950 rounded-full px-[20px]" />
          </div>
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
            <DailyCountdown score={todayScore || 0} targetDate={new Date(Date.now() + timeUntilNextReset)} className="text-lg font-mono" />
          </div>
        </div>
      )
    }
  ];

  // Apply theme effect
  useEffect(() => {
    const themePref = localStorage.getItem('themeStyle');
    if (themePref === 'glass') {
      document.documentElement.classList.add('glass-theme');
    }
    
    return () => {
      document.documentElement.classList.remove('glass-theme');
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />
      
      <main className="container space-y-8 max-w-6xl mx-auto py-[20px] px-[35px] bg-slate-950">
        <div className="text-center space-y-4 mb-8">
          <p className="text-xl max-w-3xl my-0 text-slate-50 px-0 mx-0">When and where did it happen?</p>
        </div>
        
        {isMobile ? (
          <div className="w-full px-4">
            <Carousel className="w-full">
              <CarouselContent>
                {gameCards.map((card) => (
                  <CarouselItem key={card.id}>
                    <Card className={`h-full ${card.color}`}>
                      <CardHeader className={`space-y-1 ${card.color}`}>
                        <CardTitle className="text-2xl">{card.title}</CardTitle>
                        <CardDescription>
                          {card.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {card.content}
                      </CardContent>
                      <CardFooter>
                        <Button 
                          onClick={card.buttonAction} 
                          className={`w-full ${card.buttonColor}`}
                          disabled={card.buttonDisabled}
                          variant={card.buttonDisabled ? "outline" : "default"}
                        >
                          {card.buttonText}
                        </Button>
                      </CardFooter>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-4">
                <CarouselPrevious className="relative static" />
                <CarouselNext className="relative static" />
              </div>
            </Carousel>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {gameCards.map((card) => (
              <Card key={card.id} className={`md:col-span-1 ${card.color}`}>
                <CardHeader className={`space-y-1 ${card.color}`}>
                  <CardTitle className="text-2xl">{card.title}</CardTitle>
                  <CardDescription>
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {card.content}
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={card.buttonAction} 
                    className={`w-full ${card.buttonColor}`}
                    disabled={card.buttonDisabled}
                    variant={card.buttonDisabled ? "outline" : "default"}
                  >
                    {card.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
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
      
      <PlayWithFriendsDialog open={showPlayWithFriendsDialog} onOpenChange={setShowPlayWithFriendsDialog} />
    </div>
  );
}
