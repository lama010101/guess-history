import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile, Avatar } from '@/utils/profile/profileService';
import { Button } from "@/components/ui/button";
import { CheckCircle, LockIcon } from "lucide-react";
import { updateUserAvatar } from '@/utils/profile/profileService';
import { toast } from '@/components/ui/use-toast';
import LazyImage from '@/components/ui/LazyImage';

interface AvatarsTabProps {
  profile: UserProfile | null;
  avatars: (Avatar | { id: string; name: string; image_url: string; firebase_url?: string })[];
  isLoading: boolean;
  onAvatarUpdated: () => void;
}

const AvatarsTab: React.FC<AvatarsTabProps> = ({ 
  profile, 
  avatars: initialAvatars, 
  isLoading,
  onAvatarUpdated
}) => {
  const [updating, setUpdating] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  
  // For infinite scroll
  const [displayedAvatars, setDisplayedAvatars] = useState<(Avatar | { id: string; name: string; image_url: string; firebase_url?: string })[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const ITEMS_PER_PAGE = 12;
  
  // Update selected avatar when profile changes
  useEffect(() => {
    if (profile?.avatar_id) {
      setSelectedAvatarId(profile.avatar_id);
    }
  }, [profile]);

  // Update selected avatar details when selection changes
  useEffect(() => {
    if (selectedAvatarId) {
      const avatar = initialAvatars.find(a => a.id === selectedAvatarId);
      setSelectedAvatar(avatar as Avatar || null);
    } else {
      setSelectedAvatar(null);
    }
  }, [selectedAvatarId, initialAvatars]);
  
  // Initialize displayed avatars
  useEffect(() => {
    if (initialAvatars.length > 0) {
      setDisplayedAvatars(initialAvatars.slice(0, ITEMS_PER_PAGE));
      setHasMore(initialAvatars.length > ITEMS_PER_PAGE);
    }
  }, [initialAvatars]);
  
  // Load more avatars when scrolling
  const loadMoreAvatars = useCallback(() => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const nextPage = page + 1;
    const startIndex = (nextPage - 1) * ITEMS_PER_PAGE;
    const endIndex = nextPage * ITEMS_PER_PAGE;
    
    // Simulate delay for better UX
    setTimeout(() => {
      const newAvatars = initialAvatars.slice(startIndex, endIndex);
      if (newAvatars.length > 0) {
        setDisplayedAvatars(prev => [...prev, ...newAvatars]);
        setPage(nextPage);
        setHasMore(endIndex < initialAvatars.length);
      } else {
        setHasMore(false);
      }
      setLoading(false);
    }, 300);
  }, [initialAvatars, loading, hasMore, page]);
  
  // Set up intersection observer for infinite scroll
  const lastAvatarRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return;
    
    if (observer.current) {
      observer.current.disconnect();
    }
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreAvatars();
      }
    });
    
    if (node) {
      observer.current.observe(node);
    }
  }, [loading, hasMore, loadMoreAvatars]);

  // Handle avatar selection (just preview, doesn't save yet)
  const handleSelectAvatar = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
  };
  
  // Handle saving the selected avatar
  const handleSaveAvatar = async () => {
    if (!profile || !selectedAvatarId || updating) return;
    
    try {
      setUpdating(true);
      const success = await updateUserAvatar(profile.id, selectedAvatarId, null);
      
      if (success) {
        toast({
          title: "Avatar updated",
          description: "Your profile avatar has been updated successfully.",
        });
        window.dispatchEvent(new Event('avatarUpdated'));
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
  
  // Get current profile avatar id
  const currentAvatarId = profile?.avatar_id || null;

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Choose Your Avatar</h3>
      
      {/* Current user avatar name and info */}
      {profile && profile.avatar_name && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium mb-2 text-history-primary dark:text-history-light">Current Avatar</h4>
          <div className="text-base font-medium">{profile.avatar_name}</div>
        </div>
      )}
      
      {/* Selected Avatar Info and Save Button - Moved to top */}
      {selectedAvatar && selectedAvatarId !== profile?.avatar_id && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="font-medium mb-2 text-history-primary dark:text-history-light">Selected Avatar</h4>
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 bg-history-light dark:bg-history-dark rounded-full overflow-hidden flex-shrink-0">
              <LazyImage 
                src={selectedAvatar.firebase_url || selectedAvatar.image_url} 
                alt={selectedAvatar.name} 
                className="h-full w-full object-cover"
                skeletonClassName="h-full w-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </div>
            <div className="flex-1">
              <div className="text-base font-medium">{selectedAvatar.name}</div>
              {selectedAvatar.description && (
                <div className="text-sm text-muted-foreground mt-1">{selectedAvatar.description}</div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {selectedAvatar.birth_day && (
                  <div>Born: {selectedAvatar.birth_day}
                    {selectedAvatar.birth_city && `, ${selectedAvatar.birth_city}`}
                    {selectedAvatar.birth_country && `, ${selectedAvatar.birth_country}`}
                  </div>
                )}
                {selectedAvatar.death_day && (
                  <div>Died: {selectedAvatar.death_day}
                    {selectedAvatar.death_city && `, ${selectedAvatar.death_city}`}
                    {selectedAvatar.death_country && `, ${selectedAvatar.death_country}`}
                  </div>
                )}
              </div>
              <Button
                className="mt-3"
                disabled={updating || selectedAvatarId === profile?.avatar_id}
                onClick={handleSaveAvatar}
              >
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {displayedAvatars.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No avatars available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {displayedAvatars.map((avatar, index) => {
            const isSelected = avatar.id === selectedAvatarId;
            const isLastItem = index === displayedAvatars.length - 1;
            
            return (
              <div 
                key={avatar.id}
                ref={isLastItem ? lastAvatarRef : null}
                className={`relative bg-white dark:bg-gray-900 rounded-lg p-3 text-center shadow-sm border-2 ${
                  isSelected ? 'border-history-primary' : 'border-transparent'
                } hover:border-history-primary/50 transition-colors cursor-pointer`}
                onClick={() => handleSelectAvatar(avatar.id)}
              >
                <div className="h-24 w-24 mx-auto bg-history-light dark:bg-history-dark rounded-full overflow-hidden mb-2">
                  <LazyImage 
                    src={avatar.firebase_url || avatar.image_url} 
                    alt={avatar.name} 
                    className="h-full w-full object-cover"
                    skeletonClassName="h-full w-full"
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
              <LazyImage 
                src={profile.avatar_url} 
                alt="Social avatar" 
                className="h-full w-full object-cover"
                skeletonClassName="h-full w-full"
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
      
      {/* Loading indicator for infinite scroll */}
      {loading && (
        <div className="flex justify-center py-4 mt-4">
          <div className="animate-spin h-6 w-6 border-4 border-history-primary border-t-transparent rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default AvatarsTab; 