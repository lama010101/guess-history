import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, Award } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { fetchUserProfile, fetchAvatarById, Avatar } from '@/utils/profile/profileService';
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
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  
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
    const fetchAvatar = async () => {
      if (!user) {
        setAvatar(null);
        return;
      }
      
      try {
        const profile = await fetchUserProfile(user.id);
        if (profile && profile.avatar_id) {
          const avatarData = await fetchAvatarById(profile.avatar_id);
          setAvatar(avatarData);
        }
      } catch (error) {
        console.error('Error fetching avatar for navbar:', error);
      }
    };
    
    fetchAvatar();
  }, [user]);

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow-md opacity-80 hover:opacity-100 transition-opacity duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo on the left */}
          <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/test')}>
            <Logo className="h-8 w-auto" />
          </div>
          
          {/* Global Score in center/right */}
          <div className="flex items-center">
            <Badge variant="xp" className="text-lg flex items-center gap-1 mr-4" aria-label={`Global XP: ${formatInteger(globalXP)}`}>
              <Award className="h-4 w-4" />
              <span>{formatInteger(globalXP)}</span>
            </Badge>
            
            {/* Avatar/Menu button on the right */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onMenuClick}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white p-0 overflow-hidden"
            >
              {avatar && avatar.firebase_url ? (
                <img 
                  src={avatar.firebase_url} 
                  alt="User avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                    console.error('Failed to load avatar image');
                  }}
                />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MainNavbar;
