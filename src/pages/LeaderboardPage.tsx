import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListOrdered } from "lucide-react";

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
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }
        
        console.log('Profiles data:', profiles);
        
        // Merge metrics and profiles
        const leaderboardData: LeaderboardEntry[] = metrics.map((m: any, idx: number) => {
          const profile = profiles?.find((p: any) => p.id === m.user_id);
          return {
            user_id: m.user_id,
            xp: m.xp_total || 0,
            games_played: m.games_played || 0,
            accuracy: m.overall_accuracy || 0,
            display_name: profile?.display_name || `User ${m.user_id.substring(0, 6)}`,
          };
        });
        
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden max-w-4xl mx-auto">
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