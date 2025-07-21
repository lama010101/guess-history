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
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { Avatar } from "@/types/avatar";

export const NavMenu = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<{ 
    first_name: string | null; 
    last_name: string | null;
    avatar_image_url: string | null;
    avatar_id: string | null;
    avatar_name: string | null;
    display_name: string | null;
  } | null>(null);
  const [avatar, setAvatar] = useState<Avatar | null>(null);

  // Fetch profile data when user changes
  useEffect(() => {
    if (user) {
      const fetchProfileData = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_image_url, avatar_id, avatar_name, display_name')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching profile:', error);
            return;
          }

          setProfile(data);

          // If avatar_id exists, fetch the avatar details
          if (data?.avatar_id) {
            const { data: avatarData, error: avatarError } = await supabase
              .from('avatars')
              .select('*')
              .eq('id', data.avatar_id)
              .single();

            if (avatarError) {
              console.error('Error fetching avatar:', avatarError);
              return;
            }

            setAvatar(avatarData);
          }
        } catch (error) {
          console.error('Error in profile fetch:', error);
        }
      };

      fetchProfileData();
    }
  }, [user]);

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
                  {(avatar?.firebase_url || profile.avatar_image_url) ? (
                    <img
                      src={avatar?.firebase_url || profile.avatar_image_url || ''}
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
                    {profile.avatar_name || profile.display_name || 'Anonymous User'}
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
            <Link to="/test" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </DropdownMenuItem>
          
          {/* Friends - restricted for guests */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuItem asChild>
                  <Link 
                    to={isGuest ? "#" : "/test/friends"} 
                    className="flex items-center justify-between" 
                    onClick={handleRestrictedFeatureClick}
                  >
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Friends</span>
                    </div>
                    {isGuest && <Lock className="h-3 w-3 text-amber-500" />}
                  </Link>
                </DropdownMenuItem>
              </TooltipTrigger>
              {isGuest && (
                <TooltipContent side="right">
                  <p>Available after sign up</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          
          <DropdownMenuItem asChild>
            <Link to="/test/leaderboard" className="flex items-center">
              <Award className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem asChild>
            <Link to="/test/settings" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={signOut}
            className="flex items-center text-red-500 hover:text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isGuest ? "End Guest Session" : "Sign Out"}</span>
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