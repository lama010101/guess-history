import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award,
  User,
  Settings,
  ChevronLeft,
  BarChart
} from "lucide-react";
import MainNavbar from '@/components/navigation/MainNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { Badge as BadgeType, BadgeEvaluation, BadgeRequirementCode } from '@/utils/badges/types';
import { evaluateUserBadges } from '@/utils/badges/badgeService';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchUserProfile, 
  fetchUserStats, 
  fetchUserSettings, 
  fetchAvatars,
  updateUserAvatar,
  UserProfile,
  UserStats,
  UserSettings,
  UserMetricsTable as UserMetrics
} from '@/utils/profile/profileService';

// Import tab components
import ProfileHeader from '@/components/profile/ProfileHeader';
import StatsTab from '@/components/profile/StatsTab';
import BadgesTab from '@/components/profile/BadgesTab';
import AvatarsTab from '@/components/profile/AvatarsTab';
import SettingsTab from '@/components/profile/SettingsTab';

const ProfileLayout1 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchGlobalMetrics } = useGame();
  
  // Ensure global score is updated when the profile page is loaded
  useEffect(() => {
    // Fetch updated global metrics
    fetchGlobalMetrics();
    console.log('Fetched updated global metrics on profile page');
  }, [fetchGlobalMetrics]);
  
  // State for profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [metrics, setMetrics] = useState<Record<BadgeRequirementCode, number> | null>(null);
  const [avatars, setAvatars] = useState<{ id: string; name: string; url: string }[]>([]); // Changed image_url to url
  const [badgeEvaluations, setBadgeEvaluations] = useState<BadgeEvaluation[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Helper to load guest user data from localStorage
  const loadGuestUserData = useCallback(async () => {
    if (!user?.isGuest) return null;
    try {
      const storageKey = `user_metrics_${user.id}`;
      const storedMetricsJson = localStorage.getItem(storageKey);
      if (storedMetricsJson) {
        const storedMetrics = JSON.parse(storedMetricsJson);
        const userStats: UserStats = {
          games_played: storedMetrics.games_played || 0,
          avg_accuracy: storedMetrics.overall_accuracy || 0,
          best_accuracy: storedMetrics.overall_accuracy || 0,
          perfect_scores: storedMetrics.perfect_games || 0,
          total_xp: storedMetrics.xp_total || 0,
          global_rank: 0,
          time_accuracy: storedMetrics.time_accuracy || 0,
          location_accuracy: storedMetrics.location_accuracy || 0,
          challenge_accuracy: 0
        };
        return userStats;
      }
      return null;
    } catch (e) {
      console.error('Error loading guest user data:', e);
      return null;
    }
  }, [user]);

  // Fetch all profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        if (user.isGuest) {
          const guestStats = await loadGuestUserData();
          setStats(guestStats || getDefaultStats());
          setMetrics(getDefaultMetrics(guestStats));
          setStatsLoading(false);
          setProfile({
            id: user.id,
            display_name: user.display_name || 'Guest User',
            avatar_url: user.avatar_url || 'https://api.dicebear.com/6.x/adventurer/svg?seed=' + user.id, // Corrected field and ensured a fallback
            email: 'guest@example.com',
            created_at: new Date().toISOString(),
            // avatar_image_url is not a property of UserProfile, avatar_url is used
          });
          setSettings({
            theme: 'light',
            sound_enabled: true,
            notification_enabled: false,
            distance_unit: 'km',
            language: 'en'
          });
          setBadgeEvaluations([]);
          setBadgesLoading(false);
          setAvatars([]);
          setAvatarsLoading(false);
          setSettingsLoading(false);
        } else {
          const [userProfile, userStats, userSettings, allAvatars] = await Promise.all([
            fetchUserProfile(user.id),
            fetchUserStats(user.id),
            fetchUserSettings(user.id),
            fetchAvatars()
          ]);
          setProfile(userProfile);
          setStats(userStats);
          setSettings(userSettings);
          setAvatars(allAvatars);
          const userMetrics = getDefaultMetrics(userStats);
          setMetrics(userMetrics);
          const evaluations = await evaluateUserBadges(user.id, userMetrics);
          setBadgeEvaluations(evaluations);
          setBadgesLoading(false);
          setAvatarsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setStats(getDefaultStats());
        setMetrics(getDefaultMetrics());
      } finally {
        setIsLoading(false);
        setStatsLoading(false);
        setSettingsLoading(false);
        setBadgesLoading(false);
        setAvatarsLoading(false);
      }
    };
    fetchProfileData();
  }, [user, loadGuestUserData]);
  
  // Helper functions to generate default stats/metrics (moved from profileService.ts for cleaner access)
  const getDefaultStats = (): UserStats => ({
    games_played: 0,
    avg_accuracy: 0,
    best_accuracy: 0,
    perfect_scores: 0,
    total_xp: 0,
    global_rank: 0,
    time_accuracy: 0,
    location_accuracy: 0,
    challenge_accuracy: 0,
  });
  
  const getDefaultMetrics = (stats?: UserStats): Record<BadgeRequirementCode, number> => ({
    games_played: stats?.games_played || 0,
    perfect_rounds: 0,
    perfect_games: stats?.perfect_scores || 0,
    time_accuracy: stats?.time_accuracy || 0,
    location_accuracy: stats?.location_accuracy || 0,
    overall_accuracy: stats?.avg_accuracy || 0,
    win_streak: 0,
    daily_streak: 0,
    xp_total: stats?.total_xp || 0,
    year_bullseye: 0,
    location_bullseye: 0
  });
  
  // Function to refresh all data
  const refreshData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // For guest users, refresh from localStorage
      if (user.isGuest) {
        const storageKey = `user_metrics_${user.id}`;
        const storedMetricsJson = localStorage.getItem(storageKey);
        
        if (storedMetricsJson) {
          const storedMetrics = JSON.parse(storedMetricsJson);
          
          // Convert stored metrics to UserStats format
          const userStats: UserStats = {
            games_played: storedMetrics.games_played || 0,
            avg_accuracy: storedMetrics.overall_accuracy || 0,
            best_accuracy: storedMetrics.overall_accuracy || 0,
            perfect_scores: storedMetrics.perfect_games || 0,
            total_xp: storedMetrics.xp_total || 0,
            global_rank: 0,
            time_accuracy: storedMetrics.time_accuracy || 0,
            location_accuracy: storedMetrics.location_accuracy || 0,
            challenge_accuracy: 0
          };
          
          const [userProfile, userSettings, allAvatars] = await Promise.all([
            fetchUserProfile(user.id),
            fetchUserSettings(user.id),
            fetchAvatars()
          ]);
          
          setProfile(userProfile);
          setStats(userStats);
          setSettings(userSettings);
          setMetrics(getDefaultMetrics(userStats));
          setAvatars(allAvatars);
          
          // Evaluate badges based on metrics
          const evaluations = await evaluateUserBadges(user.id, storedMetrics);
          setBadgeEvaluations(evaluations);
        } else {
          // No stored metrics found, using defaults
          const defaultStats = getDefaultStats();
          setStats(defaultStats);
          setMetrics(getDefaultMetrics(defaultStats));
        }
      } else {
        // For regular users, refresh all data
        const [userProfile, userStats, userSettings, allAvatars] = await Promise.all([
          fetchUserProfile(user.id),
          fetchUserStats(user.id),
          fetchUserSettings(user.id),
          fetchAvatars()
        ]);
        
        setProfile(userProfile);
        setStats(userStats);
        setSettings(userSettings);
        setMetrics(getDefaultMetrics(userStats));
        setAvatars(allAvatars);
        
        // Evaluate badges based on metrics
        const evaluations = await evaluateUserBadges(user.id, getDefaultMetrics(userStats));
        setBadgeEvaluations(evaluations);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to convert guest to regular account
  const convertGuestToRegular = async (email: string, password: string) => {
    if (!user?.isGuest) return false;
    
    try {
      setIsLoading(true);
      
      // 1. Sign up the user
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      
      if (signUpError) throw signUpError;
      
      // 2. Migrate guest data to new account
      const storageKey = `user_metrics_${user.id}`;
      const storedMetricsJson = localStorage.getItem(storageKey);
      
      if (storedMetricsJson) {
        const storedMetrics = JSON.parse(storedMetricsJson);
        await supabase
          .from('user_metrics')
          .insert({
            user_id: user.id,
            ...storedMetrics
          });
      }
      
      // 3. Clear guest data
      localStorage.removeItem(storageKey);
      
      return true;
    } catch (error) {
      console.error('Error converting guest account:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigateBack = () => {
    navigate('/test');
  };
  
  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <div className="max-w-4xl mx-auto p-4 pt-8 flex-grow">
        {/* Removed back button and title for cleaner interface */}
        
        {/* Profile Header */}
        <ProfileHeader 
          profile={profile} 
          isLoading={isLoading}
          onEditProfile={() => {/* Handle edit profile */}}
        />
        
        {/* Tabs */}
        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="stats" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <BarChart className="mr-2 h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <Award className="mr-2 h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="avatars" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              Avatars
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="mt-0">
            <StatsTab stats={stats || {
              games_played: 0,
              avg_accuracy: 0,
              best_accuracy: 0,
              perfect_scores: 0,
              total_xp: 0,
              global_rank: 0,
              time_accuracy: 0,
              location_accuracy: 0,
              challenge_accuracy: 0
            }} isLoading={statsLoading} />
          </TabsContent>
          
          <TabsContent value="badges" className="mt-0">
            <BadgesTab 
              badgeEvaluations={badgeEvaluations} 
              isLoading={badgesLoading} 
            />
          </TabsContent>
          
          <TabsContent value="avatars" className="mt-0">
            <AvatarsTab 
              profile={profile} 
              // avatars prop is not used by AvatarsTab anymore, it fetches its own
              // isLoading prop is also not used by AvatarsTab as it manages its own loading state
              onAvatarUpdated={refreshData}
            />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-0">
            {user && settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                profileDisplayName={profile?.display_name || ''} // Pass the display name
                isLoading={settingsLoading}
                onSettingsUpdated={refreshData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileLayout1;
