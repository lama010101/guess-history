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
}

interface LeaderboardEntry {
  user_id: string;
  xp: number;
  games_played: number;
  display_name: string;
  accuracy: number;
}

const LeaderboardPage = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { isGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
        
        // Fetch profiles for display names
        const userIds = metrics.map((m: any) => m.user_id);
        console.log('Fetching profiles for user IDs:', userIds);
        
        let profilesResponse;
        if (userIds && userIds.length > 0) {
          if (userIds.length === 1) {
            profilesResponse = await supabase
              .from('profiles')
              .select('id, display_name')
              .eq('id', userIds[0]);
          } else { // userIds.length > 1
            profilesResponse = await supabase
              .from('profiles')
              .select('id, display_name')
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
        
        // Merge metrics with profile data if available
        const leaderboardData: LeaderboardEntry[] = [];
        for (const m of (metrics as any[])) { // Assuming metrics items are { user_id: string, ... }
          const currentProfile = profiles.find((p: ProfileFromSupabase) => p.id === m.user_id);
          
          // Determine display name - use profile name if available, otherwise generate a default
          const displayName = currentProfile?.display_name || `User ${m.user_id.substring(0, 6)}`;
          
          // Skip users with display names starting with 'User ' or empty/null
          if (displayName && !displayName.startsWith('User ')) {
            leaderboardData.push({
              user_id: m.user_id,
              xp: m.xp_total || 0,
              games_played: m.games_played || 0,
              accuracy: m.overall_accuracy || 0,
              display_name: displayName,
            });
          }
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
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-center gap-3 mb-8">
        <ListOrdered className="h-8 w-8 text-history-primary" />
        <h1 className="text-3xl font-bold text-history-primary">Leaderboard</h1>
      </div>
      
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
              <TableHead>Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>XP</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Games Played</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : leaderboard.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center">No data found</TableCell></TableRow>
            ) : (
              leaderboard.map((entry, idx) => (
                <TableRow key={entry.user_id}>
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{entry.display_name}</TableCell>
                  <TableCell>{Math.round(entry.xp).toLocaleString()}</TableCell>
                  <TableCell>{Math.round(entry.accuracy)}%</TableCell>
                  <TableCell>{entry.games_played}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default LeaderboardPage; // Export with new name 