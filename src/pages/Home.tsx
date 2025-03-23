import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import Hero from '@/components/Hero';
import { Calendar, Clock, Globe, MapPin, Trophy, Users } from 'lucide-react';
import FriendsModal from '@/components/friends/FriendsModal';

const Home = () => {
  const [timerEnabled, setTimerEnabled] = useState(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings?.timerEnabled ?? false;
      } catch (error) {
        return false;
      }
    }
    return false;
  });
  
  const [timerSeconds, setTimerSeconds] = useState(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        return settings?.timerSeconds ?? 120;
      } catch (error) {
        return 120;
      }
    }
    return 120;
  });
  
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  
  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Check if daily challenge was completed today
  const getDailyStatus = () => {
    const dailyGameScore = localStorage.getItem('dailyGameScore');
    if (dailyGameScore) {
      try {
        const { date, score } = JSON.parse(dailyGameScore);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (date === today) {
          return { completed: true, score };
        }
      } catch (error) {
        console.error('Error checking daily game status:', error);
      }
    }
    return { completed: false, score: 0 };
  };
  
  const dailyStatus = getDailyStatus();
  
  // Save timer settings
  const handleTimerChange = (value: boolean) => {
    setTimerEnabled(value);
    
    // Save to localStorage
    const savedSettings = localStorage.getItem('gameSettings') || '{}';
    try {
      const settings = JSON.parse(savedSettings);
      localStorage.setItem('gameSettings', JSON.stringify({
        ...settings,
        timerEnabled: value,
        timerSeconds
      }));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };
  
  const handleTimerSecondsChange = (value: number[]) => {
    const seconds = value[0];
    setTimerSeconds(seconds);
    
    // Save to localStorage
    const savedSettings = localStorage.getItem('gameSettings') || '{}';
    try {
      const settings = JSON.parse(savedSettings);
      localStorage.setItem('gameSettings', JSON.stringify({
        ...settings,
        timerEnabled,
        timerSeconds: seconds
      }));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Hero title="Test your knowledge of history" />
      
      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Game Modes Section */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-6 text-center md:text-left">Game Modes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Compete Mode Card */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                      Compete
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Play against the leaderboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-2">
                  <p>Challenge yourself with random historical events and compete for the highest score.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild>
                    <Link to="/play">Start Game</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Daily Challenge Card */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                      Daily Challenge
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {dateString}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-2">
                  {dailyStatus.completed ? (
                    <div className="space-y-2">
                      <p>Today's challenge completed!</p>
                      <div className="flex items-center justify-between px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                        <span>Your Score:</span>
                        <span className="font-bold">{dailyStatus.score.toLocaleString()} pts</span>
                      </div>
                    </div>
                  ) : (
                    <p>Every day a new set of historical events. Can you identify them all?</p>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    disabled={dailyStatus.completed}
                    asChild
                  >
                    {dailyStatus.completed ? (
                      <span>Completed for Today</span>
                    ) : (
                      <Link to="/play?mode=daily">Play Today's Challenge</Link>
                    )}
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Play with Friends Card */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Users className="h-5 w-5 mr-2 text-indigo-500" />
                      Play with Friends
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Compete with your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-2">
                  <p>Invite friends to a private game and see who knows history best.</p>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsFriendsModalOpen(true)}
                  >
                    Invite Friends
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link to="/play?mode=friends">Start Game</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Explore Mode Card */}
              <Card className="shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center">
                      <Globe className="h-5 w-5 mr-2 text-green-500" />
                      World Regions
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Focus on specific areas
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm pb-2">
                  <p>Challenge yourself with events from specific regions or time periods.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          {/* Settings Section */}
          <div>
            <h2 className="text-2xl font-bold mb-6 text-center md:text-left">Game Settings</h2>
            
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Gameplay Options</CardTitle>
                <CardDescription>
                  Customize your game experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Enable Timer</span>
                    </div>
                    <Switch
                      checked={timerEnabled}
                      onCheckedChange={handleTimerChange}
                    />
                  </div>
                  
                  {timerEnabled && (
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Time per round</span>
                        <span className="text-sm font-medium">{timerSeconds} seconds</span>
                      </div>
                      <Slider
                        value={[timerSeconds]}
                        min={30}
                        max={300}
                        step={30}
                        onValueChange={handleTimerSecondsChange}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>30s</span>
                        <span>300s</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Other settings could go here */}
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link to="/play">Start Game</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Friends Invite Modal */}
      <FriendsModal 
        open={isFriendsModalOpen} 
        onOpenChange={setIsFriendsModalOpen} 
      />
    </div>
  );
};

export default Home;
