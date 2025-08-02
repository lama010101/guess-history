import React, { useState } from 'react';
import LazyImage from '@/components/ui/LazyImage';
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { UserProfile, Avatar } from '@/utils/profile/profileService';
import { UsernameChangeModal } from './UsernameChangeModal';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/AuthModal';

interface ProfileHeaderProps {
  profile: UserProfile | null;
  isLoading: boolean;
  onEditProfile: () => void;
  avatar?: Avatar | null;
  onProfileUpdate?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ 
  profile,
  isLoading,
  onEditProfile,
  avatar,
  onProfileUpdate
}) => {
  const { isGuest } = useAuth();
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const getDisplayName = () => {
    if (isLoading) return '...';
    if (!profile) return 'Guest';
    return profile.display_name || 'User';
  };
  
  const handleAvatarClick = () => {
    if (isGuest) {
      setShowAuthModal(true);
    } else {
      setShowUsernameModal(true);
    }
  };
  
  const handleUsernameUpdated = (newUsername: string) => {
    if (onProfileUpdate) {
      onProfileUpdate();
    }
  };
  
  const getAvatarUrl = () => {
    // Prioritize firebase_url from the avatar object (direct from avatars table)
    if (avatar && avatar.firebase_url) return avatar.firebase_url;
    // Fall back to other sources if needed
    if (avatar && avatar.image_url) return avatar.image_url;
    if (profile && profile.avatar_image_url) return profile.avatar_image_url;
    if (profile && profile.avatar_url) return profile.avatar_url;
    return '/placeholder.svg';
  };
  
  return (
    <div className="glass-card rounded-xl p-6 mb-8">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full overflow-hidden border-4 border-history-secondary">
            <LazyImage 
              src={getAvatarUrl()}
              alt="Profile avatar" 
              className="h-full w-full object-cover"
              skeletonClassName="h-full w-full"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
          </div>
          <Button 
            size="icon" 
            className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white dark:bg-gray-800 shadow cursor-pointer"
            onClick={handleAvatarClick}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold text-history-primary dark:text-history-light">
            {getDisplayName()}
          </h2>
          <div className="text-sm text-muted-foreground mb-2">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}
          </div>
          {avatar && (
            <div className="mt-2 p-3 rounded-lg bg-history-secondary/10 dark:bg-history-light/10">
              <div className="font-semibold text-history-secondary dark:text-history-light mb-1">
                {avatar.first_name} {avatar.last_name}
              </div>
              {avatar.description && (
                <div className="text-sm text-muted-foreground mb-1">{avatar.description}</div>
              )}
              <div className="text-sm text-muted-foreground mt-1 space-y-1">
                {avatar.birth_day && (
                  <div className="flex items-center">
                    <span className="font-medium">Born:</span>
                    <span className="ml-1">
                      {avatar.birth_day}
                      {avatar.birth_city && `, ${avatar.birth_city}`}
                      {avatar.birth_country && `, ${avatar.birth_country}`}
                    </span>
                  </div>
                )}
                {avatar.death_day && (
                  <div className="flex items-center">
                    <span className="font-medium">Died:</span>
                    <span className="ml-1">
                      {avatar.death_day}
                      {avatar.death_city && `, ${avatar.death_city}`}
                      {avatar.death_country && `, ${avatar.death_country}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <UsernameChangeModal
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        currentUsername={profile?.display_name || ''}
        userId={profile?.id || ''}
        onUsernameUpdated={handleUsernameUpdated}
      />
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialTab="signUp"
      />
    </div>
  );
};

export default ProfileHeader; 