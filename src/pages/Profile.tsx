
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { getUserAchievements } from '@/utils/achievementUtils';
import AchievementBadge from '@/components/game/AchievementBadge';
import { Trophy, Medal, Award, Star, User, LogOut, Edit, Save, Camera, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

interface UserProfile {
  username: string;
  avatar_url?: string;
  onesignal_player_id?: string;
}

const Profile = () => {
  const { user, logout } = useAuth(); // Using logout from the auth store
  const navigate = useNavigate();
  const { toast } = useToast();
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
  
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load user data on mount
  useEffect(() => {
    if (!user) {
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
    
    // Load user profile from Supabase
    fetchUserProfile();
    
    // Initialize OneSignal
    initializeOneSignal();
  }, [user, navigate, toast]);
  
  const fetchUserProfile = async () => {
    if (!user?.id) return;
    
    try {
      // Use direct table access instead of RPC
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url, default_distance_unit')
        .eq('id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      if (data) {
        const profileData: UserProfile = {
          username: data.username || user.username || '',
          avatar_url: data.avatar_url
        };
        
        // Get OneSignal player ID from localStorage
        const oneSignalPlayerId = localStorage.getItem('onesignal_player_id');
        if (oneSignalPlayerId) {
          profileData.onesignal_player_id = oneSignalPlayerId;
        }
        
        setUserProfile(profileData);
        setUsername(profileData.username);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };
  
  const initializeOneSignal = async () => {
    if (!window.OneSignal || !user?.id) return;
    
    // Get stored OneSignal player ID
    const oneSignalPlayerId = localStorage.getItem('onesignal_player_id');
    
    if (oneSignalPlayerId) {
      // Update Supabase profile with OneSignal player ID
      await savePlayerIdToProfile(oneSignalPlayerId);
    } else {
      // Try to get it from OneSignal directly
      window.OneSignal.getUserId(function(playerId: string) {
        if (playerId && user?.id) {
          savePlayerIdToProfile(playerId);
        }
      });
    }
  };
  
  const savePlayerIdToProfile = async (playerId: string) => {
    if (!user?.id) return;
    
    try {
      // Store the OneSignal ID in local state 
      setUserProfile(prev => prev ? { ...prev, onesignal_player_id: playerId } : null);
      
      // Clear from localStorage after saving to state
      localStorage.removeItem('onesignal_player_id');
    } catch (error) {
      console.error('Error saving OneSignal player ID:', error);
    }
  };
  
  const handleUpdateUsername = async () => {
    if (!user?.id || !username.trim()) return;
    
    try {
      // Update username directly in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ username: username.trim() })
        .eq('id', user.id);
        
      if (error) {
        console.error('Error updating username:', error);
        toast({
          title: "Error",
          description: "Failed to update username",
          variant: "destructive"
        });
        return;
      }
      
      setIsEditingUsername(false);
      toast({
        title: "Profile updated",
        description: "Your username has been updated successfully"
      });
      
      // Update userProfile state
      setUserProfile(prev => prev ? { ...prev, username: username.trim() } : null);
    } catch (error) {
      console.error('Error updating username:', error);
      toast({
        title: "Error",
        description: "Failed to update username",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    await logout(); // Using logout rather than signOut
    navigate('/');
    toast({
      title: "Logged out",
      description: "You have been successfully logged out"
    });
  };

  // Redirect if not authenticated
  if (!user) {
    return null; // Redirect handled in useEffect
  }
  
  const avatarUrl = userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || Math.random()}`;
  
  return <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">YOUR PROFILE</h1>
          <Button variant="glass" onClick={handleLogout} className="mt-2 sm:mt-0">
            <LogOut className="mr-2 h-4 w-4" />
            LOGOUT
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-1/3">
            <Card className="glass-card border-0">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <Avatar className="h-24 w-24 ring-2 ring-accent/30">
                    <AvatarImage src={avatarUrl} alt={username} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">{username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
                
                {isEditingUsername ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter username"
                      className="neo-input text-center"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleUpdateUsername}
                      className="text-accent hover:text-accent"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <CardTitle className="flex items-center justify-center gap-2 tracking-wider">
                    {username.toUpperCase()}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setIsEditingUsername(true)}
                      className="text-accent/70 hover:text-accent"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                )}
                
                <CardDescription className="text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MEMBER SINCE</span>
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
          </div>
          
          <div className="w-full md:w-2/3">
            <Card className="glass-card border-0">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center tracking-wider">
                  <Trophy className="mr-2 h-5 w-5 text-accent" />
                  GAME STATS
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GAMES PLAYED</span>
                    <span className="font-medium">{gameStats.gamesPlayed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TOTAL SCORE</span>
                    <span className="font-medium">{gameStats.totalScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AVG. SCORE</span>
                    <span className="font-medium">{gameStats.avgScore.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BEST SCORE</span>
                    <span className="font-medium">{gameStats.bestScore.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center tracking-wider">
              <Award className="mr-2 h-5 w-5 text-accent" />
              ACHIEVEMENT DETAILS
            </CardTitle>
            <CardDescription>
              Track your progress and earn more badges by playing games
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="neo-card text-center p-6">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center mb-3 ring-2 ring-accent/30">
                    <Camera className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">{achievements.perfectLocations}</h3>
                  <p className="text-muted-foreground text-sm mt-1">PHOTOGRAPHY</p>
                  <p className="text-xs text-muted-foreground mt-2">Times you've picked the exact location</p>
                </div>
              </div>
              
              <div className="neo-card text-center p-6">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center mb-3 ring-2 ring-accent/30">
                    <Clock className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">{achievements.perfectYears}</h3>
                  <p className="text-muted-foreground text-sm mt-1">TIME TRAVEL</p>
                  <p className="text-xs text-muted-foreground mt-2">Times you've guessed the exact year</p>
                </div>
              </div>
              
              <div className="neo-card text-center p-6">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 rounded-full bg-black/50 flex items-center justify-center mb-3 ring-2 ring-accent/30">
                    <Award className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold">{achievements.perfectCombos}</h3>
                  <p className="text-muted-foreground text-sm mt-1">PERFECTION</p>
                  <p className="text-xs text-muted-foreground mt-2">Perfect scores (both location & year)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>;
};
export default Profile;
