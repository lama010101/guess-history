import React, { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award,
  User,
  Settings,
  BarChart
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { BadgeEvaluation, BadgeRequirementCode } from '@/utils/badges/types';
import { evaluateUserBadges } from '@/utils/badges/badgeService';
import { 
  fetchUserProfile, 
  fetchUserStats, 
  fetchUserSettings, 
  fetchAvatars,
  UserProfile,
  UserStats,
  UserSettings
} from '@/utils/profile/profileService';

// Import tab components
import ProfileHeader from '@/components/profile/ProfileHeader';
import { fetchAvatarById, Avatar } from '@/utils/profile/profileService';
import StatsTab from '@/components/profile/StatsTab';
import BadgesTab from '@/components/profile/BadgesTab';
import AvatarsTab from '@/components/profile/AvatarsTab';
import SettingsTab from '@/components/profile/SettingsTab';
import AccountManagement from '@/components/profile/AccountManagement';

const ProfileLayout1 = () => {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const { user, isGuest, upgradeUser } = useAuth();
  const navigate = useNavigate();
  const { fetchGlobalMetrics } = useGame();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [metrics, setMetrics] = useState<Record<BadgeRequirementCode, number> | null>(null);
  const [avatars, setAvatars] = useState<{ id: string; name: string; image_url: string }[]>([]);
  const [badgeEvaluations, setBadgeEvaluations] = useState<BadgeEvaluation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  const loadGuestUserData = useCallback(async () => {
    if (!user || !isGuest) return null;
    // Guest data is now handled by the backend, this can be simplified or removed
    return getDefaultStats();
  }, [user, isGuest]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
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
        // Fetch avatar metadata if avatar_id is present
        if (userProfile && userProfile.avatar_id) {
          const avatarMeta = await fetchAvatarById(userProfile.avatar_id);
          setAvatar(avatarMeta);
        } else {
          setAvatar(null);
        }
        const userMetrics = getDefaultMetrics(userStats);
        setMetrics(userMetrics);
        if (!isGuest) {
          const evaluations = await evaluateUserBadges(user.id, userMetrics);
          setBadgeEvaluations(evaluations);
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
  }, [user, isGuest]);
  
  const getDefaultStats = (): UserStats => ({
    games_played: 0, avg_accuracy: 0, best_accuracy: 0, perfect_scores: 0,
    total_xp: 0, global_rank: 0, time_accuracy: 0, location_accuracy: 0, challenge_accuracy: 0,
  });
  
  const getDefaultMetrics = (stats?: UserStats): Record<BadgeRequirementCode, number> => ({
    games_played: stats?.games_played || 0, perfect_rounds: 0, perfect_games: stats?.perfect_scores || 0,
    time_accuracy: stats?.time_accuracy || 0, location_accuracy: stats?.location_accuracy || 0,
    overall_accuracy: stats?.avg_accuracy || 0, win_streak: 0, daily_streak: 0,
    xp_total: stats?.total_xp || 0, year_bullseye: 0, location_bullseye: 0
  });
  
  const handleUpgrade = async () => {
    if (!email) return;
    try {
      await upgradeUser(email);
      setShowUpgradeForm(false);
      // Optionally, show a success message
    } catch (error) {
      console.error('Failed to upgrade user:', error);
    }
  };

  const refreshData = async () => {
    if (!user) return;
    // Refresh profile, stats, and avatar data
    const [userProfile, userStats] = await Promise.all([
      fetchUserProfile(user.id),
      fetchUserStats(user.id)
    ]);
    
    setProfile(userProfile);
    setStats(userStats);
    
    // Refresh avatar metadata if avatar_id is present
    if (userProfile && userProfile.avatar_id) {
      const avatarMeta = await fetchAvatarById(userProfile.avatar_id);
      setAvatar(avatarMeta);
    }
  };
  
  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <div className="max-w-4xl mx-auto p-4 pt-8 flex-grow">
        <ProfileHeader 
          profile={profile} 
          isLoading={isLoading}
          onEditProfile={() => {}}
          avatar={avatar}
        />
        {isGuest && (
          <div className="my-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p>You are currently playing as a guest. Register to save your progress.</p>
            <Button onClick={() => setShowUpgradeForm(!showUpgradeForm)} className="mt-2">
              {showUpgradeForm ? 'Cancel' : 'Register'}
            </Button>
            {showUpgradeForm && (
              <div className="mt-4">
                <Input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="mb-2"
                />
                <Button onClick={handleUpgrade}>Submit</Button>
              </div>
            )}
          </div>
        )}
        
        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="stats">Stats</TabsTrigger>
            <TabsTrigger value="avatars">Avatars</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <StatsTab stats={stats || getDefaultStats()} isLoading={statsLoading} />
          </TabsContent>
          

          
          <TabsContent value="avatars">
            <AvatarsTab 
              profile={profile} 
              avatars={avatars} 
              isLoading={avatarsLoading}
              onAvatarUpdated={refreshData}
            />
          </TabsContent>
          
          <TabsContent value="settings">
            {user && settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                isLoading={settingsLoading}
                onSettingsUpdated={refreshData}
              />
            )}
          </TabsContent>

          <TabsContent value="account">
            {user && !isGuest && <AccountManagement />}
            {isGuest && (
              <div className="text-center p-8 glass-card rounded-xl">
                  <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Account Management</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Register to manage your email, password, and other account settings.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileLayout1;
