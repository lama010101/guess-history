import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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

export const NavMenu = () => {
  const navigate = useNavigate();
  const { user, isGuest, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

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
          <Button variant="ghost" size="icon" className="text-white hover:bg-history-primary/20">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
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