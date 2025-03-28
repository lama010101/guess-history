
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarClock, Map, ChevronRight, Calendar, MapPin, User, Info, History } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/services/auth';
import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GameInstructions from '@/components/game/GameInstructions';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState('');
  const [hoursRemaining, setHoursRemaining] = useState(0);
  const [minutesRemaining, setMinutesRemaining] = useState(0);
  
  // Load daily challenge state
  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    const dailyCompleted = localStorage.getItem('dailyCompleted');
    
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      setDailyDate(lastPlayedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }));
      
      // Check if played today
      const today = new Date();
      const isSameDay = lastPlayedDate.getDate() === today.getDate() && 
                       lastPlayedDate.getMonth() === today.getMonth() && 
                       lastPlayedDate.getFullYear() === today.getFullYear();
      
      // Only mark as completed if the daily game was actually completed
      setDailyCompleted(isSameDay && dailyCompleted === 'true');
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
      
      // Calculate time until next day
      if (isSameDay) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const updateTimeRemaining = () => {
          const now = new Date();
          const diffMs = tomorrow.getTime() - now.getTime();
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          setHoursRemaining(diffHrs);
          setMinutesRemaining(diffMins);
        };
        
        // Initial update
        updateTimeRemaining();
        
        // Set interval to update every minute
        const interval = setInterval(updateTimeRemaining, 60000);
        
        return () => clearInterval(interval);
      }
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-black dark:text-white flex flex-col">
      <Navbar />
      
      <main className="flex-1 container px-4 py-10 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          <div className="flex-1 space-y-6">
            <h1 className="text-4xl font-bold">
              Travel Through Time<br />With Historical Images
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
              Test your knowledge by guessing when and where historical photos were taken. 
              Complete daily challenges and compete with friends around the world.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link to="/play">
                  Play Now
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Info className="h-4 w-4" />
                    How to Play
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
                  <DialogTitle className="text-xl">How to Play</DialogTitle>
                  <GameInstructions />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            <div className="glass-card rounded-xl overflow-hidden shadow-lg">
              <div className="px-6 py-5 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Daily Challenge</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Play today's unique image challenge and see how you rank.
                </p>
              </div>
              
              <div className="p-6">
                {dailyCompleted ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{dailyDate}</span>
                      <span className="font-mono font-bold">{dailyScore.toLocaleString()} pts</span>
                    </div>
                    
                    <div className="bg-secondary/40 rounded-lg p-4 text-center">
                      <h3 className="font-medium mb-1">Next challenge available in:</h3>
                      <p className="text-2xl font-mono font-semibold">
                        {hoursRemaining}h {minutesRemaining}m
                      </p>
                    </div>
                  </div>
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/play?mode=daily">
                      Play Today's Challenge
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            
            <div className="glass-card rounded-xl overflow-hidden shadow-lg">
              <div className="px-6 py-5 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <History className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Recent Progress</h2>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Continue your last game or check your stats.
                </p>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/leaderboard">
                      View Leaderboards
                    </Link>
                  </Button>
                  
                  {isAuthenticated && (
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/profile">
                        My Profile & Stats
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pinpoint the Location</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Use the interactive map to guess where the historical photo was taken.
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Guess the Year</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Analyze the image and estimate the year when the photo was taken.
              </p>
            </div>
            
            <div className="glass-card p-6 rounded-xl text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Compete with Friends</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Compare scores and challenge your friends to beat your high score.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
