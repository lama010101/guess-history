import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award,
  User,
  Settings,
  BarChart
} from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { BadgeEvaluation, BadgeRequirementCode } from '@/utils/badges/types';
import { evaluateUserBadges } from '@/utils/badges/badgeService';
import { 
  fetchUserProfile, 
  fetchUserStats, 
  fetchUserSettings, 
  fetchAvatars,
  UserProfile,
  UserStats,
  UserSettings,
  ModeAggregate
} from '@/utils/profile/profileService';
import { AuthModal } from "@/components/AuthModal";

// Import tab components
import ProfileHeader from '@/components/profile/ProfileHeader';
import { fetchAvatarById, Avatar } from '@/utils/profile/profileService';
import StatsTab from '@/components/profile/StatsTab';
import BadgesTab from '@/components/profile/BadgesTab';
import AvatarsTab from '@/components/profile/AvatarsTab';
import SettingsTab from '@/components/profile/SettingsTab';
import AccountManagement from '@/components/profile/AccountManagement';
import LevelProgressCard from '@/components/profile/LevelProgressCard';

const ProfileLayout1 = () => {
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const { user, isGuest } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ userId?: string }>();
  const { fetchGlobalMetrics } = useGame();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [metrics, setMetrics] = useState<Record<BadgeRequirementCode, number> | null>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [badgeEvaluations, setBadgeEvaluations] = useState<BadgeEvaluation[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [showAuthModal, setShowAuthModal] = useState(false);

  const isViewingSelf = useMemo(() => {
    if (!params.userId) return true;
    if (params.userId === 'me') return true;
    return user?.id === params.userId;
  }, [params.userId, user?.id]);

  const targetUserId = useMemo(() => {
    if (isViewingSelf) return user?.id ?? null;
    return params.userId ?? null;
  }, [isViewingSelf, params.userId, user?.id]);

  const allowProfileActions = isViewingSelf;

  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUserId) return;
      try {
        setIsLoading(true);
        const [userProfile, userStats, allAvatars] = await Promise.all([
          fetchUserProfile(targetUserId),
          fetchUserStats(targetUserId),
          fetchAvatars()
        ]);
        const userSettings = isViewingSelf ? await fetchUserSettings(targetUserId) : null;
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
        if (isViewingSelf && !isGuest && user?.id) {
          const evaluations = await evaluateUserBadges(user.id, userMetrics);
          setBadgeEvaluations(evaluations);
        } else {
          setBadgeEvaluations([]);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setStats(getDefaultStats());
        setMetrics(getDefaultMetrics());
        if (!isViewingSelf) {
          setBadgeEvaluations([]);
        }
      } finally {
        setIsLoading(false);
        setStatsLoading(false);
        setSettingsLoading(false);
        setBadgesLoading(false);
        setAvatarsLoading(false);
      }
    };
    fetchProfileData();
  }, [targetUserId, isGuest, isViewingSelf, user?.id]);

  // Refresh profile/stats when profileUpdated is dispatched (e.g., after Level Up best level changes)
  useEffect(() => {
    const onProfileUpdated = () => {
      if (user) {
        refreshData();
      }
    };
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => window.removeEventListener('profileUpdated', onProfileUpdated);
  }, [user]);
  
  const emptyModeAggregate: ModeAggregate = { games_played: 0, total_xp: 0, avg_accuracy: 0 };

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
    per_mode: {
      solo: { ...emptyModeAggregate },
      compete: { ...emptyModeAggregate },
      level: { ...emptyModeAggregate },
      collaborate: { ...emptyModeAggregate },
    },
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
    location_bullseye: 0,
  });
  


  const refreshData = async () => {
    if (!targetUserId) return;
    // Refresh profile, stats, and avatar data
    const [userProfile, userStats] = await Promise.all([
      fetchUserProfile(targetUserId),
      fetchUserStats(targetUserId)
    ]);

    setProfile(userProfile);
    setStats(userStats);

    // Refresh avatar metadata if avatar_id is present
    if (userProfile && userProfile.avatar_id) {
      const avatarMeta = await fetchAvatarById(userProfile.avatar_id);
      setAvatar(avatarMeta);
    }
  };

  const handleBack = useCallback(() => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/friends');
    }
  }, [location.key, navigate]);

  const showBackButton = !isViewingSelf;

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <div className="max-w-4xl mx-auto p-4 pt-8 flex-grow">
        {showBackButton && (
          <Button variant="ghost" className="mb-4 flex items-center gap-2" onClick={handleBack}>
            ← Back
          </Button>
        )}
        <ProfileHeader 
          profile={profile} 
          isLoading={isLoading}
          onEditProfile={() => {}}
          avatar={avatar}
          onProfileUpdate={refreshData}
          allowProfileActions={allowProfileActions}
        />
        {isViewingSelf && isGuest && (
          <div className="my-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
            <p>You are currently playing as a guest. Register to save your progress.</p>
            <Button onClick={() => setShowAuthModal(true)} className="mt-2">
              Register to save progress
            </Button>
          </div>
        )}

        <Tabs defaultValue="stats">
          <div className="glass-card rounded-xl p-6 mb-8 bg-white dark:bg-[#202020]">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="stats">Stats</TabsTrigger>
              <TabsTrigger value="avatars">Avatars</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stats">
            <LevelProgressCard
              profile={profile}
              stats={stats || getDefaultStats()}
              isLoading={statsLoading}
            />
            <StatsTab 
              stats={stats || getDefaultStats()} 
              isLoading={statsLoading}
              badgeEvaluations={isViewingSelf ? badgeEvaluations : []}
              badgesLoading={isViewingSelf ? badgesLoading : false}
            />
          </TabsContent>


          
          <TabsContent value="avatars">
            {isViewingSelf ? (
              <AvatarsTab 
                profile={profile} 
                avatars={avatars} 
                isLoading={avatarsLoading}
                onAvatarUpdated={refreshData}
              />
            ) : (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                Avatar customization is only available on your own profile.
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            {isViewingSelf && user && settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                isLoading={settingsLoading}
                onSettingsUpdated={refreshData}
              />
            )}
            {!isViewingSelf && (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                Settings are private to each player.
              </div>
            )}
          </TabsContent>

          <TabsContent value="account">
            {isViewingSelf && user && !isGuest && <AccountManagement />}
            {isViewingSelf && isGuest && (
              <div className="text-center p-8 glass-card rounded-xl bg-white dark:bg-[#202020]">
                  <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Account Management</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Register to manage your email, password, and other account settings.</p>
              </div>
            )}
            {!isViewingSelf && (
              <div className="glass-card rounded-xl p-6 text-center text-muted-foreground">
                Account details are private.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {isViewingSelf && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
};

export default ProfileLayout1;
