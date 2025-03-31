
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, Search, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/services/auth';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardPlayer {
  id: string;
  username: string;
  score: number;
  avatar: string;
}

const Leaderboard = () => {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('global');
  const [searchTerm, setSearchTerm] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch leaderboard data based on selected tab
    fetchLeaderboardData(activeTab);
  }, [activeTab, user]);

  const fetchLeaderboardData = async (tab: string) => {
    setLoading(true);
    try {
      if (tab === 'global') {
        // Fetch global leaderboard from Supabase
        const { data, error } = await supabase
          .from('game_results')
          .select('*, profile:profiles!user_id(username, avatar_url)')
          .order('total_score', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error('Error fetching leaderboard:', error);
          setLoading(false);
          return;
        }
        
        // Transform data and filter out test users
        const transformedData = (data || [])
          .filter(item => {
            const username = item.profile?.username?.toLowerCase() || '';
            return !username.includes('test') && 
                  !username.includes('bot') && 
                  !username.includes('admin') &&
                  !username.includes('system');
          })
          .map(item => ({
            id: item.user_id,
            username: item.profile?.username || 'Unknown User',
            score: item.total_score,
            avatar: item.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.profile?.username}`
          }));
          
        setLeaderboardData(transformedData);
      } else if (tab === 'friends' && isAuthenticated) {
        // First fetch friends list
        const { data: friendsData, error: friendsError } = await supabase
          .from('friends')
          .select('friend_id')
          .eq('user_id', user?.id || '');
          
        if (friendsError) {
          console.error('Error fetching friends:', friendsError);
          setLoading(false);
          return;
        }
        
        const friendIds = (friendsData || []).map(f => f.friend_id);
        
        if (friendIds.length === 0) {
          setLeaderboardData([]);
          setLoading(false);
          return;
        }
        
        // Then fetch scores for those friends
        const { data, error } = await supabase
          .from('game_results')
          .select('*, profile:profiles!user_id(username, avatar_url)')
          .in('user_id', friendIds)
          .order('total_score', { ascending: false });
          
        if (error) {
          console.error('Error fetching friends leaderboard:', error);
          setLoading(false);
          return;
        }
        
        // Transform data
        const transformedData = (data || []).map(item => ({
          id: item.user_id,
          username: item.profile?.username || 'Unknown User',
          score: item.total_score,
          avatar: item.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.profile?.username}`
        }));
          
        setLeaderboardData(transformedData);
      } else if (tab === 'daily') {
        // Fetch daily challenge leaderboard
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data, error } = await supabase
          .from('game_results')
          .select('*, profile:profiles!user_id(username, avatar_url)')
          .gte('created_at', today.toISOString())
          .order('total_score', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error('Error fetching daily leaderboard:', error);
          setLoading(false);
          return;
        }
        
        // Transform data and filter out test users
        const transformedData = (data || [])
          .filter(item => {
            const username = item.profile?.username?.toLowerCase() || '';
            return !username.includes('test') && 
                  !username.includes('bot') && 
                  !username.includes('admin') &&
                  !username.includes('system');
          })
          .map(item => ({
            id: item.user_id,
            username: item.profile?.username || 'Unknown User',
            score: item.total_score,
            avatar: item.profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.profile?.username}`
          }));
          
        setLeaderboardData(transformedData);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
    setLoading(false);
  };

  const handleSearch = e => {
    setSearchTerm(e.target.value);
  };

  const filteredData = leaderboardData.filter(player => 
    player.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container px-4 py-6 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          
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
          <Input placeholder="Search by username..." className="pl-10" value={searchTerm} onChange={handleSearch} autoFocus={false} />
        </div>
        
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <p>Loading leaderboard data...</p>
            </div>
          ) : filteredData.length > 0 ? (
            filteredData.map((player, index) => (
              <Card key={player.id} className={index < 3 ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="p-4 flex items-center justify-between rounded-xl py-[15px]">
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
                {searchTerm ? "No players match your search." : (
                  activeTab === 'friends' ? "Add some friends to see them on your leaderboard." : "No data available for this leaderboard."
                )}
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
