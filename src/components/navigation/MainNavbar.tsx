import React, { useEffect, useState } from 'react';
import LazyImage from '@/components/ui/LazyImage';
import { Button } from "@/components/ui/button";
import { Menu, Award, Target, Medal } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserProfile, UserProfile } from '@/utils/profile/profileService';
import { Badge } from "@/components/ui/badge";
import { formatInteger } from '@/utils/format';
import InvitesBell from '@/components/navigation/InvitesBell';

interface MainNavbarProps {
  onMenuClick?: () => void;
}

const MainNavbar: React.FC<MainNavbarProps> = ({ onMenuClick }) => {
  const { globalXP, globalAccuracy, fetchGlobalMetrics } = useGame();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  
  // Fetch global metrics when component mounts and periodically refresh
  useEffect(() => {
    console.log('MainNavbar: Fetching global metrics on mount');
    fetchGlobalMetrics();
    
    // Set up a periodic refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('MainNavbar: Refreshing global metrics');
      fetchGlobalMetrics();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [fetchGlobalMetrics]);

  // Fetch user avatar when user changes
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (user) {
        try {
          const profile: UserProfile | null = await fetchUserProfile(user.id);
          // Check both avatar_image_url and avatar_url fields
          setAvatarUrl(profile?.avatar_image_url || profile?.avatar_url || null);
          console.log('NavBar: Avatar URL set to:', profile?.avatar_image_url || profile?.avatar_url);
          // Set current level from profile (fallback to 1)
          const level = Math.max(1, Math.min(100, Number(profile?.level_up_best_level || 1)));
          setCurrentLevel(level);
        } catch (error) {
          console.error('Error fetching user profile for navbar:', error);
          setAvatarUrl(null);
          setCurrentLevel(null);
        }
      } else {
        setAvatarUrl(null);
        setCurrentLevel(null);
      }
    };

    fetchUserAvatar();
  }, [user]);

  // Listen for avatarUpdated, usernameUpdated, and profileUpdated events to refresh profile data
  useEffect(() => {
    const handler = () => {
      if (user) {
        fetchUserProfile(user.id).then((profile) => {
          setAvatarUrl(profile?.avatar_image_url || profile?.avatar_url || null);
          const level = Math.max(1, Math.min(100, Number(profile?.level_up_best_level || 1)));
          setCurrentLevel(level);
        });
      }
    };
    window.addEventListener('avatarUpdated', handler);
    window.addEventListener('usernameUpdated', handler);
    window.addEventListener('profileUpdated', handler);
    return () => {
      window.removeEventListener('avatarUpdated', handler);
      window.removeEventListener('usernameUpdated', handler);
      window.removeEventListener('profileUpdated', handler);
    };
  }, [user]);

  return (
    <header
      className="sticky top-0 z-50 transition-colors duration-300 bg-black/90 backdrop-blur"
      onClick={() => navigate('/home')}
      role="button"
      aria-label="Go to Home"
      tabIndex={0}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Global Accuracy and XP on the left */}
          <div className="flex items-center gap-2">
            <Badge 
              variant="accuracy" 
              className="flex items-center gap-1 text-sm"
              aria-label={`Global Accuracy: ${Math.round(globalAccuracy || 0)}%`}
              onClick={(e) => { e.stopPropagation(); navigate('/home'); }}
            >
              <Target className="h-4 w-4" />
              <span>{Math.round(globalAccuracy || 0)}%</span>
            </Badge>
            <Badge 
              variant="xp" 
              className="flex items-center gap-1 text-sm cursor-pointer"
              onClick={(e) => { e.stopPropagation(); navigate('/leaderboard'); }}
              aria-label={`Global XP: ${formatInteger(globalXP || 0)}`}
            >
              <Award className="h-4 w-4" />
              <span>{formatInteger(globalXP || 0)}</span>
            </Badge>
            {currentLevel !== null && (
              <Badge 
                className="flex items-center gap-1 text-sm"
                aria-label={`Level ${currentLevel}`}
              >
                <Medal className="h-4 w-4" />
                <span>Lv {currentLevel}</span>
              </Badge>
            )}
          </div>

          {/* Invites bell and Avatar/Menu button on the right */}
          <div className="flex items-center gap-2">
            {/* Stop propagation so clicking the bell doesn't trigger header navigation */}
            <div onClick={(e) => e.stopPropagation()}>
              <InvitesBell />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={(e) => { e.stopPropagation(); onMenuClick?.(); }}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white p-0 overflow-hidden rounded-full"
            >
              {avatarUrl ? (
                <LazyImage 
                  src={avatarUrl} 
                  alt="User avatar"
                  className="h-9 w-9 rounded-full object-cover border-2 border-history-primary/30"
                  skeletonClassName="h-9 w-9 rounded-full"
                  onError={() => setAvatarUrl(null)}
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center border-2 border-history-primary/30">
                  <Menu className="h-5 w-5 text-gray-600" />
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavbar;
