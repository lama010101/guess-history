import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { getUserAchievements } from '@/utils/achievementUtils';
import AchievementBadge from '@/components/game/AchievementBadge';
import { Trophy, Medal, Award, Star, User, LogOut } from 'lucide-react';
const Profile = () => {
  const {
    isAuthenticated,
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [achievements, setAchievements] = useState({
    perfectLocations: 0,
    perfectYears: 0,
    perfectCombos: 0
  });
  const [gameStats, setGameStats] = useState({
    gamesPlayed: 0,
    totalScore: 0,
    avgScore: 0,
    bestScore: 0
  });

  // Load user data on mount
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "You need to be logged in to view your profile"
      });
      navigate('/');
      return;
    }

    // Load achievements from localStorage
    const userAchievements = getUserAchievements();
    setAchievements(userAchievements);

    // Load game stats from localStorage
    try {
      const storedStats = localStorage.getItem('userGameStats');
      if (storedStats) {
        setGameStats(JSON.parse(storedStats));
      } else {
        // Generate mock data for now
        setGameStats({
          gamesPlayed: Math.floor(Math.random() * 10) + 1,
          totalScore: Math.floor(Math.random() * 25000) + 5000,
          avgScore: Math.floor(Math.random() * 5000) + 3000,
          bestScore: Math.floor(Math.random() * 8000) + 7000
        });
      }
    } catch (e) {
      console.error('Error loading game stats', e);
    }
  }, [isAuthenticated, navigate, toast]);
  const handleLogout = () => {
    logout();
    navigate('/');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out"
    });
  };

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return null; // Redirect handled in useEffect
  }
  return <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-6 max-w-4xl mx-auto bg-slate-950">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-50">Your Profile</h1>
          <Button variant="outline" onClick={handleLogout} className="mt-2 sm:mt-0">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-primary" />
                User Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Username:</span>
                  <span className="font-medium">{user?.username || 'User'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{user?.email || 'user@example.com'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Member since:</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5 text-primary" />
                Game Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Games Played:</span>
                  <span className="font-medium">{gameStats.gamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Score:</span>
                  <span className="font-medium">{gameStats.totalScore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Score:</span>
                  <span className="font-medium">{gameStats.avgScore.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Best Score:</span>
                  <span className="font-medium">{gameStats.bestScore.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="mr-2 h-5 w-5 text-primary" />
              Achievement Details
            </CardTitle>
            <CardDescription>
              Track your progress and earn more badges by playing games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg text-center bg-slate-300">
                <AchievementBadge type="location" count={achievements.perfectLocations} className="mx-auto mb-2" />
                <h3 className="font-semibold text-lg">{achievements.perfectLocations}</h3>
                <p className="text-sm text-muted-foreground">Times you've picked the exact location</p>
              </div>
              
              <div className="p-4 rounded-lg text-center bg-slate-300">
                <AchievementBadge type="year" count={achievements.perfectYears} className="mx-auto mb-2" />
                <h3 className="font-semibold text-lg">{achievements.perfectYears}</h3>
                <p className="text-sm text-muted-foreground">Times you've guessed the exact year</p>
              </div>
              
              <div className="p-4 rounded-lg text-center bg-slate-300">
                <AchievementBadge type="combo" count={achievements.perfectCombos} className="mx-auto mb-2" />
                <h3 className="font-semibold text-lg">{achievements.perfectCombos}</h3>
                <p className="text-sm text-muted-foreground">Perfect scores (both location & year)</p>
              </div>
            </div>
            
            
          </CardContent>
        </Card>
      </main>
    </div>;
};
export default Profile;