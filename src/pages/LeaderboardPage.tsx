import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListOrdered, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";

interface ProfileFromSupabase {
  id: string;
  display_name: string | null;
  avatar_image_url?: string | null;
  avatar_url?: string | null;
  avatar_name?: string | null;
}

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  games_played: number;
  display_name: string;
  accuracy: number;
  avatar_url?: string;
  avatar_name?: string;
}

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: keyof LeaderboardEntry; direction: 'asc' | 'desc' }>({ key: 'xp', direction: 'desc' });
  const [currentUserRank, setCurrentUserRank] = useState<LeaderboardEntry | null>(null);
  const [displayCount, setDisplayCount] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  const { user, isGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        console.log('Fetching leaderboard data...');
        // Fetch user_metrics sorted by xp_total desc
        const { data: metrics, error: metricsError } = await supabase
          .from('user_metrics')
          .select('user_id, xp_total, games_played, overall_accuracy')
          .order('xp_total', { ascending: false });
        
        if (metricsError) {
          console.error('Error fetching metrics:', metricsError);
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        console.log('Metrics data:', metrics);
        
        if (!metrics || metrics.length === 0) {
          console.log('No metrics data found');
          setLeaderboard([]);
          setLoading(false);
          return;
        }
        
        // Fetch profiles for display names and avatars
        const userIds = metrics.map((m: any) => m.user_id);
        console.log('Fetching profiles for user IDs:', userIds);
        
        let profilesResponse;
        if (userIds && userIds.length > 0) {
          if (userIds.length === 1) {
            profilesResponse = await supabase
              .from('profiles')
              .select('id, display_name, avatar_image_url, avatar_url, avatar_name')
              .eq('id', userIds[0]);
          } else { // userIds.length > 1
            profilesResponse = await supabase
              .from('profiles')
              .select('id, display_name, avatar_image_url, avatar_url, avatar_name')
              .in('id', userIds);
          }
        } else {
          // No user IDs to fetch, so simulate an empty successful response
          profilesResponse = { data: [], error: null };
        }

        const { data: rawProfiles, error: profilesError } = profilesResponse;

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          setLeaderboard([]); // Clear leaderboard or show error state
          setLoading(false);
          return; // Stop processing if profiles can't be fetched
        }

        // Ensure rawProfiles is not null before using; default to empty array if it is.
        // Assert the type of rawProfiles after checking profilesError to satisfy TypeScript,
        // as Supabase's 'data' type can be complex if the select string implies a potential column error.
        // Using 'as unknown as ...' per TypeScript's suggestion for more complex/less direct assertions.
        const profiles: ProfileFromSupabase[] = (rawProfiles as unknown as ProfileFromSupabase[] | null) || [];
        
        console.log('Profiles data:', profiles);
        
        // Merge metrics with profile data - only include registered users with proper profiles
        const leaderboardData: LeaderboardEntry[] = [];
        for (const m of (metrics as any[])) {
          const currentProfile = profiles.find((p: any) => p.id === m.user_id);
          
          // Only include users with proper profiles (not guest users)
          if (currentProfile?.display_name) {
            leaderboardData.push({
              user_id: m.user_id,
              xp: m.xp_total || 0,
              games_played: m.games_played || 0,
              accuracy: m.overall_accuracy || 0,
              display_name: currentProfile.display_name,
              avatar_url: currentProfile.avatar_image_url || currentProfile.avatar_url,
              avatar_name: currentProfile.avatar_name,
            });
          }
        }
        
        // Find current user's rank
        if (user) {
          const currentUserEntry = leaderboardData.find(entry => entry.user_id === user.id);
          setCurrentUserRank(currentUserEntry || null);
        }
        
        console.log('Leaderboard data:', leaderboardData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error in fetchLeaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLeaderboard();
    
    // Set up a refresh interval for the leaderboard
    const refreshInterval = setInterval(() => {
      console.log('Refreshing leaderboard data...');
      fetchLeaderboard();
    }, 60000); // Refresh every minute
    
    return () => clearInterval(refreshInterval);
  }, [user]);

  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    const newDisplayCount = displayCount + 20;
    setDisplayCount(newDisplayCount);
    
    // Check if we have more data to load
    if (newDisplayCount >= sortedLeaderboard.length) {
      setHasMore(false);
    }
    
    setIsLoadingMore(false);
  };

  const handleSort = (key: keyof LeaderboardEntry) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title without icon and in all caps */}
      <h1 className="text-3xl font-bold text-history-primary dark:text-white text-center mb-8 uppercase">
        Leaderboard
      </h1>
      
      {/* Current user card */}
      {currentUserRank && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-history-primary/20">
            <h3 className="text-lg font-semibold mb-3 text-center text-history-primary dark:text-white">
              Your Ranking
            </h3>
            {/* Header row for labels */}
            <div className="grid grid-cols-4 gap-4 text-center mb-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Rank</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Name</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">XP</div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Accuracy</div>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-history-primary dark:text-white">
                  #{leaderboard.findIndex(entry => entry.user_id === user?.id) + 1}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-history-primary dark:text-white">
                  {currentUserRank.display_name}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-history-primary dark:text-white">
                  {Math.round(currentUserRank.xp).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-lg font-semibold text-history-primary dark:text-white">
                  {Math.round(currentUserRank.accuracy)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isGuest && (
        <Alert className="mb-6 bg-amber-50 border-amber-200 text-amber-800 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
                <span>Guest users can view the leaderboard but won't appear on it.</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign up to compete
                </Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('user_id')}>
                Rank {sortConfig.key === 'user_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('display_name')}>
                Player {sortConfig.key === 'display_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('xp')}>
                XP {sortConfig.key === 'xp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('accuracy')}>
                Accuracy {sortConfig.key === 'accuracy' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => handleSort('games_played')}>
                Games {sortConfig.key === 'games_played' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : sortedLeaderboard.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No data found</TableCell></TableRow>
            ) : (
              sortedLeaderboard.slice(0, displayCount).map((entry, idx) => (
                <TableRow key={entry.user_id} className={entry.user_id === user?.id ? 'bg-history-primary/10' : ''}>
                  <TableCell className="font-medium">#{idx + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      {entry.avatar_url ? (
                        <img 
                          src={entry.avatar_url} 
                          alt={entry.display_name}
                          className="h-8 w-8 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {entry.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span>{entry.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">{entry.xp.toLocaleString()}</TableCell>
                  <TableCell>{Math.round(entry.accuracy)}%</TableCell>
                  <TableCell>{entry.games_played}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {hasMore && sortedLeaderboard.length > displayCount && (
          <div className="text-center py-4">
            {isLoadingMore ? (
              <div className="animate-spin h-6 w-6 border-2 border-history-primary border-t-transparent rounded-full mx-auto"></div>
            ) : (
              <Button onClick={loadMore} variant="outline">
                Load More
              </Button>
            )}
          </div>
        )}
      </div>
      {/* Auth Modal for guest sign up */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LeaderboardPage; // Export with new name