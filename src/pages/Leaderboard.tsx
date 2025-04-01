
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, Search, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/services/auth';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardUser {
  id: string;
  username: string;
  score: number;
  avatar: string;
}

const Leaderboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [searchTerm, setSearchTerm] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch leaderboard data based on selected tab
    fetchLeaderboardData(activeTab);
  }, [activeTab, isAuthenticated, user]);

  const fetchLeaderboardData = async (type = 'global') => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${type} leaderboard data`);
      
      // For friends tab, we need to ensure the user is authenticated
      if (type === 'friends' && !isAuthenticated) {
        setLeaderboardData([]);
        return;
      }
      
      // In a real implementation, we would fetch different data for each tab type
      // For now, we're fetching all profiles and adding random scores for demo purposes
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .order('created_at', { ascending: false })
        .limit(10);
        
      console.log('Profiles query response:', profilesData, profilesError);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setError('Failed to load leaderboard');
        setLoading(false);
        return;
      }
      
      // For the friends tab, we need to filter to only include friends
      if (type === 'friends' && user) {
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', user.id)
          .eq('status', 'accepted');
          
        console.log('Friends query response:', friendsData, friendsError);
        
        if (friendsError) {
          console.error('Error fetching friends:', friendsError);
          setError('Failed to load friends leaderboard');
          setLoading(false);
          return;
        }
        
        // If there are friends, filter the profiles to only include them
        if (friendsData && friendsData.length > 0) {
          const friendIds = friendsData.map(item => item.friend_id);
          console.log('Friend IDs:', friendIds);
          
          const friendProfiles = profilesData?.filter(profile => 
            friendIds.includes(profile.id)
          ) || [];
          
          // Convert to leaderboard format
          const formattedFriends = formatLeaderboardData(friendProfiles);
          setLeaderboardData(formattedFriends);
        } else {
          // No friends found
          setLeaderboardData([]);
        }
      } else if (type === 'daily') {
        // For the daily challenge, we might want to show a different set of users or scores
        // For now, just use random subset of profiles
        const randomProfiles = profilesData ? [...profilesData].sort(() => 0.5 - Math.random()).slice(0, 5) : [];
        const formattedDailyUsers = formatLeaderboardData(randomProfiles);
        setLeaderboardData(formattedDailyUsers);
      } else {
        // Global tab - use all profiles
        const formattedGlobalUsers = formatLeaderboardData(profilesData || []);
        setLeaderboardData(formattedGlobalUsers);
      }
    } catch (err) {
      console.error('Error in fetchLeaderboardData:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to format profiles data as leaderboard data
  const formatLeaderboardData = (profilesData: any[]): LeaderboardUser[] => {
    // For demo purposes, assign random scores to users
    // In a real implementation, we would fetch actual scores from a game_scores table
    return profilesData.map(profile => ({
      id: profile.id,
      username: profile.username || 'User',
      score: Math.floor(Math.random() * 10000) + 30000, // Random score between 30000-40000
      avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username || Math.random()}`
    }))
    .sort((a, b) => b.score - a.score); // Sort by score descending
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const filteredData = leaderboardData.filter(player => 
    player.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto bg-slate-950">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-50">Leaderboard</h1>
          
          <div className="mt-4 md:mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="friends" disabled={!isAuthenticated}>Friends</TabsTrigger>
                <TabsTrigger value="daily">Daily Challenge</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search by username..." 
            className="pl-10" 
            value={searchTerm} 
            onChange={handleSearch} 
            autoFocus={false}
          />
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading leaderboard data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">Error</h3>
              <p>{error}</p>
            </div>
          ) : filteredData.length > 0 ? (
            filteredData.map((player, index) => (
              <Card key={player.id} className={index < 3 ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center justify-between bg-slate-50 rounded-xl py-[15px]">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-8 h-8">
                      {index === 0 ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600">
                          <Trophy size={16} />
                        </div>
                      ) : index === 1 ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-300/20 text-slate-600">
                          <Trophy size={16} />
                        </div>
                      ) : index === 2 ? (
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600/20 text-amber-700">
                          <Trophy size={16} />
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-medium">{index + 1}</span>
                      )}
                    </div>
                    
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium">{player.username}</span>
                  </div>
                  
                  <div className="text-right">
                    <span className="font-mono font-semibold">{player.score.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No players match your search." : activeTab === 'friends' ? "No friends found. Add some friends first!" : "No data available for this leaderboard."}
              </p>
            </div>
          )}
        </div>
        
        {filteredData.length > 0 && filteredData.length >= 10 && (
          <div className="text-center mt-8">
            <Button variant="outline">View More Players</Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
