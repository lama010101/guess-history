console.log('HELLO FROM SRC NavProfile');
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
  console.log('NavProfile: Component mounting');
  const { user, signOut, isGuest } = useAuth();
  const { fetchGlobalMetrics } = useGame();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();

  // Define helper to fetch profile data
  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    try {
      console.log('NavProfile: Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_image_url, avatar_url, avatar_name, display_name')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('NavProfile: Error fetching user profile:', error.message);
        setError(new Error(error.message));
        setProfile(null);
      } else {
        console.log('NavProfile: Fetched profile:', data);
        setProfile(data);
      }
    } catch (err) {
      console.error('NavProfile: Unexpected error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Add debug log for component render
  console.log('NavProfile: Component rendering with user:', user ? user.id : 'no user');

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user, fetchProfileData]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    fetchProfileData();
    fetchGlobalMetrics().catch(err => console.error('Error refreshing global metrics in NavProfile:', err));
    const refreshInterval = setInterval(() => {
      fetchGlobalMetrics().catch(err => console.error('Error refreshing global metrics in NavProfile:', err));
    }, 5000);
    return () => clearInterval(refreshInterval);
  }, [user, fetchGlobalMetrics, fetchProfileData]);

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
    const username = profile?.username;
    const email = user?.email;
    if (username) return username.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return isGuest ? 'G' : 'U';
  };

  const avatarUrl = profile?.avatar_image_url || profile?.avatar_url || null;
  // Determine the best display name to show in the dropdown
  const userDisplayName =
    profile?.avatar_name ??
    profile?.display_name ??
    profile?.username ??
    (user?.user_metadata as any)?.full_name ??
    (!isGuest ? user?.email : 'Guest');

  // Add debug logs for state changes
  console.log('NavProfile: Current state:', {
    hasUser: !!user,
    userId: user?.id,
    profileLoaded: !!profile,
    avatarUrl,
    isLoading,
    error: error?.message
  });

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
                className="mt-2 w-full text-xs whitespace-nowrap bg-black text-white hover:bg-black/90"
                onClick={() => setShowAuthModal(true)}
              >
                Register to save progress
              </Button>
            )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/test" className="flex items-center">
              <Home className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/test/friends" className="flex items-center">
              <Users className="mr-2 h-4 w-4" />
              <span>Friends</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/test/leaderboard" className="flex items-center">
              <Award className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/test/profile" className="flex items-center">
              <UserRound className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/test/settings" className="flex items-center">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
          {!isGuest && (
            <DropdownMenuItem asChild>
              <Link to="/test/account" className="flex items-center">
                <UserCog className="mr-2 h-4 w-4" />
                <span>Account</span>
              </Link>
            </DropdownMenuItem>
          )}
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
          fetchProfileData();
        }}
        initialTab="signUp"
      />
    </div>
  );
};
