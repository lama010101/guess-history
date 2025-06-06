import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useLogs } from "@/contexts/LogContext";
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
  LayoutDashboard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const NavProfile = () => {
  const { user, signOut, isGoogleUser } = useAuth();
  const { globalXP, globalAccuracy, fetchGlobalMetrics } = useGame();
  const { openLogWindow } = useLogs();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/test');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  // Fetch global metrics when the component mounts, when user changes, and periodically
  useEffect(() => {
    if (user) {
      // Initial fetch
      console.log('NavProfile: Fetching global metrics for user', user.id);
      fetchGlobalMetrics();
      
      // Set up periodic refresh every 5 seconds to ensure we always have latest scores
      const refreshInterval = setInterval(() => {
        fetchGlobalMetrics()
          .catch(err => console.error('Error refreshing global metrics in NavProfile:', err));
      }, 5000);
      
      // Clean up interval on unmount
      return () => clearInterval(refreshInterval);
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

  // Get initial for avatar fallback
  const getInitial = () => {
    if (user.isGuest) {
      return (user.display_name?.charAt(0) || 'G').toUpperCase();
    }
    // For authenticated users, use email or display name
    const email = 'email' in user ? user.email : '';
    const displayName = 'display_name' in user ? user.display_name : '';
    return (email?.charAt(0) || displayName?.charAt(0) || 'U').toUpperCase();
  };

  const initials = getInitial();
  
  // Get user display info
  const userDisplayName = user.isGuest 
    ? user.display_name || 'Guest User'
    : ('display_name' in user ? user.display_name : 'User');
    
  const userEmail = !user.isGuest && 'email' in user ? user.email : '';

  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none" asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8 border-2 border-history-secondary/20 hover:border-history-secondary/40 transition-colors">
              <AvatarFallback className="bg-history-primary text-white text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">
            {userDisplayName}
          </p>
          {userEmail && (
            <p className="text-xs text-muted-foreground truncate">
              {userEmail}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {user.isGuest ? 'Playing as guest' : 'Signed in'}
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
          <Link to="/test/profile?tab=settings" className="flex items-center">
            <SettingsIcon className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        {/* Show Admin link for any signed-in user (not just Google users) */}
        {!user.isGuest && (
          <DropdownMenuItem asChild>
            <Link to="/test/admin" className="flex items-center">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-red-600 focus:text-red-600"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};
