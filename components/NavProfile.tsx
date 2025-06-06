import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Home,
  Users,
  Award,
  UserRound,
  Settings,
  LogIn,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export const NavProfile = () => {
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

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
      return user.display_name.charAt(0).toUpperCase() || "G";
    }
    // Type assertion to tell TypeScript this is definitely an AuthUser
    const authUser = user as { email: string };
    return (authUser.email || "U").charAt(0).toUpperCase();
  };

  const initials = getInitial();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-8 w-8 border-2 border-history-secondary/20 hover:border-history-secondary/40 transition-colors">
          <AvatarFallback className="bg-history-primary text-white text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
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
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-red-600 focus:text-red-600"
        >
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
