import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";

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
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);

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

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
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
  }, [leaderboard, sortConfig]);

  const handleSort = (key: keyof LeaderboardEntry) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
    setDisplayCount(20);
  };

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setDisplayCount(prev => Math.min(prev + 20, sortedLeaderboard.length));

    if (loadTimeoutRef.current) {
      window.clearTimeout(loadTimeoutRef.current);
    }

    loadTimeoutRef.current = window.setTimeout(() => {
      setIsLoadingMore(false);
      loadTimeoutRef.current = null;
    }, 250);
  }, [hasMore, isLoadingMore, sortedLeaderboard.length]);

  useEffect(() => {
    const shouldHaveMore = displayCount < sortedLeaderboard.length;
    if (hasMore !== shouldHaveMore) {
      setHasMore(shouldHaveMore);
    }
  }, [displayCount, sortedLeaderboard.length, hasMore]);

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) {
        window.clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title without icon and in all caps */}
      <h1 className="text-3xl font-bold text-history-primary dark:text-white text-center mb-8 uppercase">
        Leaderboard
      </h1>
      
      {/* Current user card */}
      {currentUserRank && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="rounded-lg shadow-lg p-6 bg-[#333333] text-white">
            <h3 className="text-lg font-semibold mb-4 text-center font-['Montserrat']">
              Your Ranking
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center items-center text-white/70 text-xs font-semibold uppercase tracking-wide">
              <span>Rank</span>
              <span>%</span>
              <span>XP</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center items-center mt-4">
              <div className="text-2xl font-bold">
                #{leaderboard.findIndex(entry => entry.user_id === user?.id) + 1}
              </div>
              <div className="flex justify-center">
                <Badge variant="accuracy" className="px-4 py-1 text-sm shadow-md">
                  {Math.round(currentUserRank.accuracy)}%
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge variant="xp" className="px-4 py-1 text-sm shadow-md">
                  {Math.round(currentUserRank.xp).toLocaleString()}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isGuest && (
        <Alert className="mb-6 bg-white border border-gray-200 text-black max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-black">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2 text-black">
                <span>Guest users can view the leaderboard but won't appear on it.</span>
                <Button
                  size="sm"
                  variant="hintGradient"
                  onClick={() => setShowAuthModal(true)}
                  className="text-black"
                >
                  Sign up to compete
                </Button>
              </div>
            </AlertDescription>
          </div>
        </Alert>
      )}
      <div className="bg-[#333333] text-white rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
        <Table className="bg-[#333333] text-white">
          <TableHeader className="bg-[#333333]">
            <TableRow className="bg-[#333333]">
              <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort('user_id')}>
                Rank {sortConfig.key === 'user_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort('display_name')}>
                Player {sortConfig.key === 'display_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort('accuracy')}>
                % {sortConfig.key === 'accuracy' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort('xp')}>
                XP {sortConfig.key === 'xp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
              <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort('games_played')}>
                Games {sortConfig.key === 'games_played' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center font-['Montserrat']">Loading...</TableCell></TableRow>
            ) : sortedLeaderboard.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center font-['Montserrat']">No data found</TableCell></TableRow>
            ) : (
              sortedLeaderboard.slice(0, displayCount).map((entry, idx) => (
                <TableRow
                  key={entry.user_id}
                  className={
                    entry.user_id === user?.id
                      ? 'bg-[rgba(0,0,0,0.4)] border-l-4 border-history-primary'
                      : 'hover:bg-[#3d3d3d]'
                  }
                >
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
                      <span className="font-semibold">{entry.display_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold font-['Montserrat']">
                    <Badge variant="accuracy" className="px-3 py-1 text-xs shadow-sm">
                      {Math.round(entry.accuracy)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold font-['Montserrat']">
                    <Badge variant="xp" className="px-3 py-1 text-xs shadow-sm">
                      {entry.xp.toLocaleString()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-['Montserrat']">{entry.games_played}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {hasMore && (
          <div ref={sentinelRef} className="py-6 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 border-2 border-white/40 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>
      {/* Auth Modal for guest sign up */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LeaderboardPage; // Export with new name