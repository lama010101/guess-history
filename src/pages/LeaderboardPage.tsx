import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/AuthModal";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileFromSupabase {
  id: string;
  display_name: string | null;
  avatar_image_url?: string | null;
  avatar_url?: string | null;
  avatar_name?: string | null;
  level_up_best_level?: number | null;
}

type LeaderboardMode = "global" | "practice" | "levelUp" | "compete";

interface ModeLeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  avatar_name?: string;
  accuracy: number;
  xp: number;
  games: number;
  level: number;
}

interface UserMetricsRow {
  user_id: string;
  xp_total: number | null;
  games_played: number | null;
  overall_accuracy: number | null;
  xp_total_solo: number | null;
  games_played_solo: number | null;
  overall_accuracy_solo: number | null;
  xp_total_level: number | null;
  games_played_level: number | null;
  overall_accuracy_level: number | null;
  xp_total_compete: number | null;
  games_played_compete: number | null;
  overall_accuracy_compete: number | null;
}

const LEADERBOARD_MODES: LeaderboardMode[] = ["global", "practice", "levelUp", "compete"];

const LeaderboardPage = () => {
  const [leaderboards, setLeaderboards] = useState<Record<LeaderboardMode, ModeLeaderboardEntry[]>>({
    global: [],
    practice: [],
    levelUp: [],
    compete: [],
  });
  const [loading, setLoading] = useState(true);
  const [sortConfigs, setSortConfigs] = useState<Record<LeaderboardMode, { key: keyof ModeLeaderboardEntry; direction: 'asc' | 'desc' }>>({
    global: { key: 'xp', direction: 'desc' },
    practice: { key: 'xp', direction: 'desc' },
    levelUp: { key: 'xp', direction: 'desc' },
    compete: { key: 'xp', direction: 'desc' },
  });
  const [activeTab, setActiveTab] = useState<LeaderboardMode>("global");
  const [displayCounts, setDisplayCounts] = useState<Record<LeaderboardMode, number>>({
    global: 20,
    practice: 20,
    levelUp: 20,
    compete: 20,
  });
  const [hasMoreMap, setHasMoreMap] = useState<Record<LeaderboardMode, boolean>>({
    global: true,
    practice: true,
    levelUp: true,
    compete: true,
  });
  const [isLoadingMoreMap, setIsLoadingMoreMap] = useState<Record<LeaderboardMode, boolean>>({
    global: false,
    practice: false,
    levelUp: false,
    compete: false,
  });
  const { user, isGuest } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadTimeoutRef = useRef<Record<LeaderboardMode, number | null>>({
    global: null,
    practice: null,
    levelUp: null,
    compete: null,
  });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        console.log('Fetching leaderboard data...');
        // Fetch user_metrics sorted by xp_total desc
        const { data: metrics, error: metricsError } = await supabase
          .from('user_metrics')
          .select(`
            user_id,
            xp_total,
            games_played,
            overall_accuracy,
            xp_total_solo,
            games_played_solo,
            overall_accuracy_solo,
            xp_total_level,
            games_played_level,
            overall_accuracy_level,
            xp_total_compete,
            games_played_compete,
            overall_accuracy_compete
          `)
          .order('xp_total', { ascending: false });
        
        if (metricsError) {
          console.error('Error fetching metrics:', metricsError);
          setLeaderboards({ global: [], practice: [], levelUp: [], compete: [] });
          setDisplayCounts({ global: 0, practice: 0, levelUp: 0, compete: 0 });
          setHasMoreMap({ global: false, practice: false, levelUp: false, compete: false });
          setLoading(false);
          return;
        }

        console.log('Metrics data:', metrics);
        
        if (!metrics || metrics.length === 0) {
          console.log('No metrics data found');
          setLeaderboards({ global: [], practice: [], levelUp: [], compete: [] });
          setDisplayCounts({ global: 0, practice: 0, levelUp: 0, compete: 0 });
          setHasMoreMap({ global: false, practice: false, levelUp: false, compete: false });
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
              .select('id, display_name, avatar_image_url, avatar_url, avatar_name, level_up_best_level')
              .eq('id', userIds[0]);
          } else { // userIds.length > 1
            profilesResponse = await supabase
              .from('profiles')
              .select('id, display_name, avatar_image_url, avatar_url, avatar_name, level_up_best_level')
              .in('id', userIds);
          }
        } else {
          // No user IDs to fetch, so simulate an empty successful response
          profilesResponse = { data: [], error: null };
        }

        const { data: rawProfiles, error: profilesError } = profilesResponse;

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          setLeaderboards({ global: [], practice: [], levelUp: [], compete: [] });
          setDisplayCounts({ global: 0, practice: 0, levelUp: 0, compete: 0 });
          setHasMoreMap({ global: false, practice: false, levelUp: false, compete: false });
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
        const globalData: ModeLeaderboardEntry[] = [];
        const practiceData: ModeLeaderboardEntry[] = [];
        const levelUpData: ModeLeaderboardEntry[] = [];
        const competeData: ModeLeaderboardEntry[] = [];

        for (const m of (metrics as UserMetricsRow[])) {
          const currentProfile = profiles.find((p: any) => p.id === m.user_id);
          
          // Only include users with proper profiles (not guest users)
          if (currentProfile?.display_name) {
            const avatar = currentProfile.avatar_image_url || currentProfile.avatar_url || undefined;
            const baseEntry = {
              user_id: m.user_id,
              display_name: currentProfile.display_name,
              avatar_url: avatar,
              avatar_name: currentProfile.avatar_name || undefined,
              level: currentProfile.level_up_best_level ?? 0,
            };

            globalData.push({
              ...baseEntry,
              xp: Number(m.xp_total ?? 0),
              accuracy: Number(m.overall_accuracy ?? 0),
              games: Number(m.games_played ?? 0),
              level: baseEntry.level,
            });

            practiceData.push({
              ...baseEntry,
              xp: Number(m.xp_total_solo ?? 0),
              accuracy: Number(m.overall_accuracy_solo ?? 0),
              games: Number(m.games_played_solo ?? 0),
              level: baseEntry.level,
            });

            levelUpData.push({
              ...baseEntry,
              xp: Number(m.xp_total_level ?? 0),
              accuracy: Number(m.overall_accuracy_level ?? 0),
              games: Number(m.games_played_level ?? 0),
              level: baseEntry.level,
            });

            competeData.push({
              ...baseEntry,
              xp: Number(m.xp_total_compete ?? 0),
              accuracy: Number(m.overall_accuracy_compete ?? 0),
              games: Number(m.games_played_compete ?? 0),
              level: baseEntry.level,
            });
          }
        }
        
        console.log('Leaderboard data:', { globalData, practiceData, levelUpData, competeData });
        setLeaderboards({
          global: globalData,
          practice: practiceData,
          levelUp: levelUpData,
          compete: competeData,
        });
        setDisplayCounts({
          global: 20,
          practice: 20,
          levelUp: 20,
          compete: 20,
        });
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

  const activeEntries = leaderboards[activeTab] || [];
  const activeSortConfig = sortConfigs[activeTab];
  const activeDisplayCount = displayCounts[activeTab];
  const activeHasMore = hasMoreMap[activeTab];
  const activeIsLoadingMore = isLoadingMoreMap[activeTab];
  const isLevelUpTab = activeTab === "levelUp";

  const sortedEntries = useMemo(() => {
    return [...activeEntries].sort((a, b) => {
      const aValue = a[activeSortConfig.key] ?? 0;
      const bValue = b[activeSortConfig.key] ?? 0;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return activeSortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return activeSortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [activeEntries, activeSortConfig]);

  const displayedEntries = useMemo(() => {
    return sortedEntries.slice(0, activeDisplayCount);
  }, [sortedEntries, activeDisplayCount]);

  const handleSort = (mode: LeaderboardMode, key: keyof ModeLeaderboardEntry) => {
    setSortConfigs(prevConfig => ({
      ...prevConfig,
      [mode]: {
        key,
        direction: prevConfig[mode].key === key && prevConfig[mode].direction === 'desc' ? 'asc' : 'desc',
      },
    }));
    setDisplayCounts(prev => ({
      ...prev,
      [mode]: 20,
    }));
  };

  const loadMore = useCallback(() => {
    if (activeIsLoadingMore || !activeHasMore) return;

    setIsLoadingMoreMap(prev => ({
      ...prev,
      [activeTab]: true,
    }));

    const nextCount = Math.min(displayCounts[activeTab] + 20, sortedEntries.length);
    setDisplayCounts(prev => ({
      ...prev,
      [activeTab]: nextCount,
    }));

    const existingTimeout = loadTimeoutRef.current[activeTab];
    if (existingTimeout) {
      window.clearTimeout(existingTimeout);
    }

    loadTimeoutRef.current[activeTab] = window.setTimeout(() => {
      setIsLoadingMoreMap(prev => ({
        ...prev,
        [activeTab]: false,
      }));
      loadTimeoutRef.current[activeTab] = null;
    }, 250);
  }, [activeHasMore, activeIsLoadingMore, activeTab, displayCounts, sortedEntries.length]);

  useEffect(() => {
    const shouldHaveMore = activeDisplayCount < sortedEntries.length;
    if (hasMoreMap[activeTab] !== shouldHaveMore) {
      setHasMoreMap(prev => ({
        ...prev,
        [activeTab]: shouldHaveMore,
      }));
    }
  }, [activeDisplayCount, activeTab, sortedEntries, hasMoreMap]);

  useEffect(() => {
    if (!activeHasMore) return;
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
  }, [activeHasMore, loadMore]);

  useEffect(() => {
    return () => {
      LEADERBOARD_MODES.forEach((mode) => {
        const timeoutId = loadTimeoutRef.current[mode];
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      });
    };
  }, []);

  useEffect(() => {
    // Reset infinite scroll trackers when switching tabs
    setDisplayCounts(prev => ({
      ...prev,
      [activeTab]: 20,
    }));
  }, [activeTab]);

  const currentUserData = useMemo(() => {
    if (!user?.id) {
      return { entry: undefined, rankIndex: -1 };
    }
    const rankIndex = sortedEntries.findIndex(entry => entry.user_id === user.id);
    return {
      entry: rankIndex >= 0 ? sortedEntries[rankIndex] : undefined,
      rankIndex,
    };
  }, [sortedEntries, user?.id]);

  const lastColumnKey: keyof ModeLeaderboardEntry = isLevelUpTab ? 'level' : 'games';
  const lastColumnLabel = isLevelUpTab ? 'Level' : 'Games';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title without icon and in all caps */}
      <h1 className="text-3xl font-bold text-history-primary dark:text-white text-center mb-8 uppercase">
        Leaderboard
      </h1>
      
      {/* Current user card */}
      {currentUserData.entry && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="rounded-lg shadow-lg p-6 bg-[#333333] text-white">
            <div className="flex flex-col items-center gap-3 mb-4">
              {currentUserData.entry.avatar_url ? (
                <img
                  src={currentUserData.entry.avatar_url}
                  alt={currentUserData.entry.display_name}
                  className="h-16 w-16 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xl font-semibold text-gray-600 dark:text-gray-300">
                    {currentUserData.entry.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-lg font-semibold text-center font-['Montserrat']">
                {currentUserData.entry.display_name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center items-center text-white/70 text-xs font-semibold uppercase tracking-wide">
              <span>Rank</span>
              <span>%</span>
              <span>XP</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center items-center mt-4">
              <div className="text-2xl font-bold">
                #{currentUserData.rankIndex + 1}
              </div>
              <div className="flex justify-center">
                <Badge variant="accuracy" className="px-4 py-1 text-sm">
                  {Math.round(currentUserData.entry.accuracy)}%
                </Badge>
              </div>
              <div className="flex justify-center">
                <Badge variant="xp" className="px-4 py-1 text-sm">
                  {Math.round(currentUserData.entry.xp).toLocaleString()}
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
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LeaderboardMode)} className="max-w-4xl mx-auto">
        <TabsList className="mb-6 bg-[#444] text-white w-full gap-2">
          <TabsTrigger value="global" className="flex-1">Global</TabsTrigger>
          <TabsTrigger value="practice" className="flex-1">Practice</TabsTrigger>
          <TabsTrigger value="levelUp" className="flex-1">Level Up</TabsTrigger>
          <TabsTrigger value="compete" className="flex-1">Compete</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab}>
          <div className="bg-[#333333] text-white rounded-xl shadow-lg overflow-hidden">
            <Table className="bg-[#333333] text-white">
              <TableHeader className="bg-[#333333]">
                <TableRow className="bg-[#333333]">
                  <TableHead className="font-['Montserrat'] text-white">Rank</TableHead>
                  <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort(activeTab, 'display_name')}>
                    Player {activeSortConfig.key === 'display_name' && (activeSortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort(activeTab, 'accuracy')}>
                    % {activeSortConfig.key === 'accuracy' && (activeSortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort(activeTab, 'xp')}>
                    XP {activeSortConfig.key === 'xp' && (activeSortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="cursor-pointer font-['Montserrat'] text-white hover:bg-[#3d3d3d]" onClick={() => handleSort(activeTab, lastColumnKey)}>
                    {lastColumnLabel} {activeSortConfig.key === lastColumnKey && (activeSortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center font-['Montserrat']">Loading...</TableCell></TableRow>
                ) : sortedEntries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center font-['Montserrat']">No data found</TableCell></TableRow>
                ) : (
                  displayedEntries.map((entry, idx) => (
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
                        <Badge variant="accuracy" className="px-3 py-1 text-xs">
                          {Math.round(entry.accuracy)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold font-['Montserrat']">
                        <Badge variant="xp" className="px-3 py-1 text-xs">
                          {Math.round(entry.xp).toLocaleString()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-['Montserrat']">
                        {lastColumnKey === 'level' ? entry.level : entry.games}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {activeHasMore && (
              <div ref={sentinelRef} className="py-6 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-white/40 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      {/* Auth Modal for guest sign up */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};

export default LeaderboardPage; // Export with new name