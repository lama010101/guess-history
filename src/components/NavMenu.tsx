import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import LazyImage from "@/components/ui/LazyImage";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Users,
  Award,
  Menu as MenuIcon,
  Settings,
  Lock,
  User,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from '@/utils/profile/profileService';

export const NavMenu = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<{
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    avatar_image_url: string | null;
    avatar_id: string | null;
    avatar_name: string | null;
    display_name: string | null;
    username: string | null;
  } | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Fetch profile data helper
  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, avatar_image_url, avatar_id, avatar_name, display_name, username')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);

      if (data?.avatar_id) {
        const { data: avatarData, error: avatarError } = await supabase
          .from('avatars')
          .select('*')
          .eq('id', data.avatar_id)
          .single();
        if (!avatarError) setAvatar(avatarData);
      }
    } catch (error) {
      console.error('Error in profile fetch:', error);
    }
  }, [user]);

  // Fetch profile data when user changes
  useEffect(() => {
    if (user) {
      fetchProfileData();
    } else {
      setProfile(null);
      setAvatar(null);
    }
  }, [user, fetchProfileData]);

  // Listen for avatarUpdated and usernameUpdated events to refresh data
  useEffect(() => {
    const handler = () => fetchProfileData();
    window.addEventListener('avatarUpdated', handler);
    window.addEventListener('usernameUpdated', handler);
    window.addEventListener('profileUpdated', handler);
    return () => {
      window.removeEventListener('avatarUpdated', handler);
      window.removeEventListener('usernameUpdated', handler);
      window.removeEventListener('profileUpdated', handler);
    };
  }, [fetchProfileData]);

  const handleRestrictedFeatureClick = (e: React.MouseEvent) => {
    if (isGuest) {
      e.preventDefault();
      setShowAuthModal(true);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-white hover:bg-history-primary/20 p-0">
            {(avatar?.firebase_url || profile?.avatar_image_url) ? (
              <LazyImage
                src={avatar?.firebase_url || profile?.avatar_image_url || ''}
                alt="User avatar"
                className="h-9 w-9 rounded-full object-cover border-2 border-history-primary/30"
                skeletonClassName="h-9 w-9 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">          
          {/* User Profile Header */}
          {profile && (
            <div className="px-3 py-3 mb-1">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {(avatar?.firebase_url || profile?.avatar_image_url || profile?.avatar_url) ? (
                    <img
                      src={avatar?.firebase_url || profile?.avatar_image_url || profile?.avatar_url || ''}
                      alt="User avatar"
                      className="h-12 w-12 rounded-full object-cover border-2 border-history-primary/30"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 text-sm">{profile.first_name?.[0] || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {(profile.display_name?.trim() ? profile.display_name.trim() : null) ??
                      (profile.username?.trim() ? profile.username.trim() : null) ??
                      (profile.avatar_name?.trim() ? profile.avatar_name.trim() : null) ??
                      'Anonymous User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {isGuest ? 'Playing as guest' : 'Signed in'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/home" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/leaderboard" className="flex items-center">
              <Award className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          {!isGuest && (
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem 
            onClick={signOut}
            className={`flex items-center ${isGuest ? 'bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100' : 'text-red-500 hover:text-red-600'}`}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isGuest ? "Register to save progress" : "Sign Out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}; 