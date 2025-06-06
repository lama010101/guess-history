import React, { useState } from 'react';
import { UserProfile } from '@/utils/profile/profileService';
import { Button } from "@/components/ui/button";
import { CheckCircle, LockIcon } from "lucide-react";
import { updateUserAvatar } from '@/utils/profile/profileService';
import { toast } from '@/components/ui/use-toast';

interface AvatarsTabProps {
  profile: UserProfile | null;
  avatars: { id: string; name: string; image_url: string }[];
  isLoading: boolean;
  onAvatarUpdated: () => void;
}

const AvatarsTab: React.FC<AvatarsTabProps> = ({ 
  profile, 
  avatars, 
  isLoading,
  onAvatarUpdated
}) => {
  const [updating, setUpdating] = useState(false);
  
  const handleSelectAvatar = async (avatarId: string) => {
    if (!profile || updating) return;
    
    try {
      setUpdating(true);
      const success = await updateUserAvatar(profile.id, avatarId, null);
      
      if (success) {
        toast({
          title: "Avatar updated",
          description: "Your profile avatar has been updated successfully.",
        });
        onAvatarUpdated();
      } else {
        toast({
          title: "Update failed",
          description: "There was a problem updating your avatar. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // Get current selected avatar
  const currentAvatarId = profile?.avatar_name ? 
    avatars.find(a => a.name === profile.avatar_name)?.id : null;

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Choose Your Avatar</h3>
      
      {avatars.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No avatars available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {avatars.map((avatar) => {
            const isSelected = avatar.id === currentAvatarId;
            return (
              <div 
                key={avatar.id} 
                className={`relative bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm border-2 ${
                  isSelected ? 'border-history-primary' : 'border-transparent'
                } hover:border-history-primary/50 transition-colors cursor-pointer`}
                onClick={() => handleSelectAvatar(avatar.id)}
              >
                <div className="h-24 w-24 mx-auto bg-history-light dark:bg-history-dark rounded-full overflow-hidden mb-2">
                  <img 
                    src={avatar.image_url} 
                    alt={avatar.name} 
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                </div>
                <div className="text-sm font-medium truncate" title={avatar.name}>
                  {avatar.name}
                </div>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 text-history-primary">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {profile?.avatar_url && (
        <div className="mt-8">
          <h4 className="font-medium mb-4 text-history-primary dark:text-history-light">Your Social Avatar</h4>
          <div className="flex items-center">
            <div className="h-20 w-20 bg-history-light dark:bg-history-dark rounded-full overflow-hidden mr-4">
              <img 
                src={profile.avatar_url} 
                alt="Social avatar" 
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <div>
              <p className="text-sm mb-2">This is your avatar from your social login.</p>
              <Button 
                variant="outline" 
                size="sm"
                disabled={updating}
                onClick={() => handleSelectAvatar('use_social')}
              >
                Use This Avatar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarsTab; 