// NavProfile component
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useLogs } from "@/contexts/LogContext";
import { supabase } from "@/integrations/supabase/client";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Users,
  Award,
  UserRound,
  Settings as SettingsIcon,
  LogIn,
  ShieldCheck,
  Target,
  Zap,
  Terminal,
  LogOut,
  Bug,
  LayoutDashboard,
  UserCog
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const NavProfile = () => {
  const { user, signOut, isGuest } = useAuth();
  const { fetchGlobalMetrics } = useGame();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<any>(null);

  // Component lifecycle handled via useEffect

  // Effect for profile data state changes
  useEffect(() => {
    console.log('NavProfile: Profile state updated:', {
      hasUser: !!user,
      userId: user?.id || null,
      profileLoaded: !!profile,
      avatarUrl: profile?.avatar_image_url || profile?.avatar_url || null,
      isLoading,
      hasError: !!error
    });
  }, [user, profile, isLoading, error]);

  // Hoist profile fetching so it can be reused by event listeners
  const fetchProfileData = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_image_url, avatar_url, avatar_name, display_name, avatar_id')
        .eq('id', user.id)
        .single();

      if (error) {
        setError(new Error(error.message));
        setProfile(null);
      } else {
        setProfile(data);
        // If the profile references an avatar, fetch it for authoritative name/image
        if (data?.avatar_id) {
          const { data: avatarRow, error: avatarErr } = await supabase
            .from('avatars')
            .select('*')
            .eq('id', data.avatar_id)
            .single();
          if (!avatarErr) {
            setAvatar(avatarRow);
          } else {
            setAvatar(null);
          }
        } else {
          setAvatar(null);
        }
      }
    } catch (err) {
      console.error('NavProfile: Unexpected error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setProfile(null);
      setAvatar(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch profile initially and when user changes
  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  // Listen for profile/username/avatar updates to refresh displayed name immediately
  useEffect(() => {
    const handler = () => {
      fetchProfileData();
    };
    window.addEventListener('avatarUpdated', handler);
    window.addEventListener('usernameUpdated', handler);
    window.addEventListener('profileUpdated', handler);
    return () => {
      window.removeEventListener('avatarUpdated', handler);
      window.removeEventListener('usernameUpdated', handler);
      window.removeEventListener('profileUpdated', handler);
    };
  }, [fetchProfileData]);

  // Separate effect for metrics to avoid dependency cycles
  useEffect(() => {
    if (!user) return;
    
    // Fetch metrics once on mount/user change
    const loadMetrics = async () => {
      try {
        await fetchGlobalMetrics();
      } catch (err) {
        console.error('Error fetching global metrics:', err);
      }
    };
    
    loadMetrics();
  }, [user, fetchGlobalMetrics]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="text-white border-white hover:bg-white hover:text-history-primary"
          onClick={() => setShowAuthModal(true)}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  }

  const getInitial = () => {
    const name = profile?.avatar_name || profile?.display_name || '';
    const email = user?.email;
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return isGuest ? 'G' : 'U';
  };

  const avatarUrl = (avatar?.firebase_url) || profile?.avatar_image_url || profile?.avatar_url || null;
  // Determine the best display name to show in the dropdown
  const userDisplayName =
    // Prefer unique profile-side avatar_name/display_name so numeric suffixes are preserved
    profile?.avatar_name ??
    profile?.display_name ??
    // Fall back to avatar record name if profile fields are missing
    (avatar ? (avatar.first_name || avatar.last_name ? `${avatar.first_name ?? ''} ${avatar.last_name ?? ''}`.trim() : (avatar.name || avatar.display_name || null)) : null) ??
    (user?.user_metadata as any)?.full_name ??
    (!isGuest ? user?.email : 'Guest');

  // State changes are logged via useEffect hooks

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none" asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8 border-2 border-history-secondary/20 hover:border-history-secondary/40 transition-colors">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User avatar" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <AvatarFallback className="bg-history-primary text-white text-sm">
                  {getInitial()}
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex flex-col items-center pt-4 pb-2">
            <Avatar className="h-14 w-14 border-2 border-history-secondary/20 mb-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User avatar" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <AvatarFallback className="bg-history-primary text-white text-2xl">
                  {getInitial()}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{userDisplayName}</p>
            {isGuest && (
              <p className="text-xs text-muted-foreground">Playing as guest</p>
            )}
            {isGuest && (
              <Button
                size="sm"
                className="mt-2 w-full text-xs whitespace-nowrap bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 border border-gray-200"
                onClick={() => setShowAuthModal(true)}
              >
                Register to save progress
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/home" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/friends"
              className="flex items-center"
              onClick={(e) => {
                if (isGuest) {
                  e.preventDefault();
                  setShowAuthModal(true);
                }
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/leaderboard" className="flex items-center">
              <Award className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to="/profile"
              className="flex items-center"
              onClick={(e) => {
                if (isGuest) {
                  e.preventDefault();
                  setShowAuthModal(true);
                }
              }}
            >
              <UserRound className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>


          <DropdownMenuItem
            onClick={handleSignOut}
            className="text-red-600 focus:text-red-600 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={() => {
          setShowAuthModal(false);
          // User will be updated by AuthContext, which will trigger our useEffect
          // No need to manually fetch profile here
        }}
        initialTab="signUp"
      />
    </div>
  );
};
