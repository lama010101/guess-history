import React from 'react';
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { UserProfile } from '@/utils/profile/profileService';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  isLoading: boolean;
  onEditProfile: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  profile,
  isLoading,
  onEditProfile
}) => {
  const getDisplayName = () => {
    if (isLoading) return '...';
    if (!profile) return 'Guest';
    return profile.display_name || 'User';
  };
  
  const getAvatarUrl = () => {
    if (!profile) return '/placeholder.svg';
    
    // If user has a social avatar, use that
    if (profile.avatar_url) {
      return profile.avatar_url;
    }
    
    // If user has selected a historical figure avatar, use that
    if (profile.avatar_image_url) {
      return profile.avatar_image_url;
    }
    
    // Default placeholder
    return '/placeholder.svg';
  };
  
  return (
    <div className="glass-card rounded-xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-history-secondary">
            <img 
              src={getAvatarUrl()}
              alt="Profile avatar" 
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>
          <Button 
            size="icon" 
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow"
            onClick={onEditProfile}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center sm:text-left">
          <h2 className="text-xl font-bold text-history-primary dark:text-history-light">
            {getDisplayName()}
          </h2>
          <div className="text-sm text-muted-foreground">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader; 