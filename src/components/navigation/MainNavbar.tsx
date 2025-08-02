import React, { useEffect, useState } from 'react';
import LazyImage from '@/components/ui/LazyImage';
import { Button } from "@/components/ui/button";
import { Menu, Award } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserProfile, UserProfile } from '@/utils/profile/profileService';
import Logo from '@/components/Logo';
import { Badge } from "@/components/ui/badge";
import { formatInteger } from '@/utils/format';

interface MainNavbarProps {
  onMenuClick?: () => void;
}

const MainNavbar: React.FC<MainNavbarProps> = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const { globalXP, fetchGlobalMetrics } = useGame();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
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
        } catch (error) {
          console.error('Error fetching user profile for navbar:', error);
          setAvatarUrl(null);
        }
      } else {
        setAvatarUrl(null);
      }
    };

    fetchUserAvatar();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-black/0 backdrop-blur-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo on the left */}
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/test')}>
            <Logo className="h-8 w-auto" />
          </div>
          
          {/* Global Score in center/right */}
          <div className="flex items-center">
            <Badge 
              variant="xp" 
              className="text-lg flex items-center gap-1 mr-4 cursor-pointer hover:bg-history-primary/80" 
              aria-label={`Global XP: ${formatInteger(globalXP)}`}
              onClick={() => navigate('/test/leaderboard')}
            >
              <Award className="h-4 w-4" />
              <span>{formatInteger(globalXP)}</span>
            </Badge>
            
            {/* Avatar/Menu button on the right */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onMenuClick}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white p-0 overflow-hidden rounded-full"
            >
              {avatarUrl ? (
                <LazyImage 
                  src={avatarUrl} 
                  alt="User avatar"
                  className="h-9 w-9 rounded-full object-cover border-2 border-history-primary/30"
                  skeletonClassName="h-9 w-9 rounded-full"
                  onError={() => setAvatarUrl(null)} // Fallback to menu icon on error
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
