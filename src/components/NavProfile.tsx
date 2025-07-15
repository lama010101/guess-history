import { useState, useEffect } from "react";
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
  const [profile, setProfile] = useState<{ username: string | null } | null>(null);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    if (user) {
      const fetchProfileData = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error("Error fetching user profile in NavProfile:", error.message);
        } else {
          setProfile(data);
        }
      };

      fetchProfileData();
      fetchGlobalMetrics();

      const refreshInterval = setInterval(() => {
        fetchGlobalMetrics().catch(err => console.error('Error refreshing global metrics in NavProfile:', err));
      }, 5000);

      return () => clearInterval(refreshInterval);
    } else {
      setProfile(null);
    }
  }, [user, fetchGlobalMetrics]);

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

  const userDisplayName = profile?.username || (isGuest ? 'Guest User' : (user.email || 'User'));
  const userEmail = !isGuest ? user.email : '';

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none" asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8 border-2 border-history-secondary/20 hover:border-history-secondary/40 transition-colors">
              <AvatarFallback className="bg-history-primary text-white text-sm">
                {getInitial()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{userDisplayName}</p>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate">
                {userEmail}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {isGuest ? 'Playing as guest' : 'Signed in'}
            </p>
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
    </div>
  );
};
