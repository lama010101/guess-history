
// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { useAuth } from '@/services/auth';
import { useDailyGame } from '@/hooks/useDailyGame';
import DailyCountdown from '@/components/DailyCountdown';
import PlayWithFriendsDialog from '@/components/PlayWithFriendsDialog';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showPlayOptions, setShowPlayOptions] = useState(false);
  const [showFriendsDialog, setShowFriendsDialog] = useState(false);
  
  const { 
    dailyCompleted, 
    dailyScore, 
    dailyDate, 
    countdown, 
    setDailyGame 
  } = useDailyGame();

  // Check if this is the user's first visit
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('hasSeenInstructions');
    if (!hasSeenInstructions) {
      setShowInstructions(true);
    }
  }, []);

  const handleStartGame = () => {
    setDailyGame(false); // Not a daily game
    navigate('/play');
  };

  const handleStartDailyChallenge = () => {
    setDailyGame(true); // Set as a daily game
    navigate('/play');
  };

  const handleCloseInstructions = () => {
    localStorage.setItem('hasSeenInstructions', 'true');
    setShowInstructions(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <Hero />
        
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
              {/* Regular Game Card */}
              <div className="glass-card p-6 rounded-xl shadow-md border border-border/50 hover:border-primary/30 transition-all">
                <h2 className="text-2xl font-bold mb-4">Play Now</h2>
                <p className="text-muted-foreground mb-6">
                  Test your knowledge of historical events with a series of 
                  random images. Guess the location and year to score points!
                </p>
                <Button 
                  size="lg" 
                  onClick={() => setShowPlayOptions(true)}
                  className="w-full"
                >
                  Start Game
                </Button>
              </div>
              
              {/* Daily Challenge Card */}
              <div className="glass-card p-6 rounded-xl shadow-md border border-border/50 hover:border-primary/30 transition-all">
                <h2 className="text-2xl font-bold mb-4">Daily Challenge</h2>
                
                {dailyCompleted ? (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      You've completed today's challenge on {dailyDate}
                    </p>
                    
                    <div className="bg-primary/10 p-4 rounded-lg text-center">
                      <p className="text-lg font-medium">Your score</p>
                      <p className="text-3xl font-bold">{dailyScore.toLocaleString()}</p>
                    </div>
                    
                    <DailyCountdown 
                      hours={countdown.hours}
                      minutes={countdown.minutes}
                      seconds={countdown.seconds}
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-6">
                      Take on today's challenge! Everyone gets the same 5 images.
                      Compare your scores with friends.
                    </p>
                    <Button 
                      variant="default" 
                      size="lg" 
                      onClick={handleStartDailyChallenge}
                      className="w-full"
                    >
                      Play Daily Challenge
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Game Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>How to Play</DialogTitle>
            <DialogDescription>
              Welcome to HistoryHunt! Here's how to play the game:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 my-4">
            <div>
              <h3 className="font-medium">1. View the historical image</h3>
              <p className="text-sm text-muted-foreground">
                Each round shows you a historical photo from somewhere in the world.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">2. Make your guesses</h3>
              <p className="text-sm text-muted-foreground">
                Place a pin on the map to guess where the photo was taken and use the slider to guess what year it's from.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">3. Score points</h3>
              <p className="text-sm text-muted-foreground">
                The closer your guesses are to the actual location and year, the more points you'll earn!
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">4. Use hints (optional)</h3>
              <p className="text-sm text-muted-foreground">
                If you're stuck, you can use hint coins to reveal the country or decade the photo is from.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={handleCloseInstructions}>Got it!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Play Options Dialog */}
      <Dialog
        open={showPlayOptions}
        onOpenChange={setShowPlayOptions}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Game Mode</DialogTitle>
            <DialogDescription>
              Select how you'd like to play HistoryHunt
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={handleStartGame}
            >
              <span className="font-medium">Solo Game</span>
              <span className="text-xs text-muted-foreground">
                Play by yourself with random images
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={() => {
                setShowPlayOptions(false);
                setShowFriendsDialog(true);
              }}
            >
              <span className="font-medium">Play with Friends</span>
              <span className="text-xs text-muted-foreground">
                Invite a friend to play the same images
              </span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center"
              onClick={handleStartDailyChallenge}
              disabled={dailyCompleted}
            >
              <span className="font-medium">Daily Challenge</span>
              <span className="text-xs text-muted-foreground">
                Play today's challenge and compare scores
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Friends Dialog */}
      <PlayWithFriendsDialog 
        showDialog={showFriendsDialog}
        setShowDialog={setShowFriendsDialog}
      />
    </div>
  );
};

export default Home;
