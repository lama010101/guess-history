
import { useState } from "react";
import { useAuth } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn, LogOut, User, Award, Users, Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AuthModal from "./AuthModal";
import { Link } from "react-router-dom";

const ProfileButton = () => {
  const { user, isAuthenticated, logout, isAdmin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleOpenLogin = () => {
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
  };

  if (!isAuthenticated || !user) {
    return (
      <>
        <Button size="sm" onClick={handleOpenLogin}>
          <LogIn className="mr-2 h-4 w-4" />
          Login
        </Button>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.avatarUrl} alt={user.username} />
              <AvatarFallback>
                {user.username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user.username} {isAdmin && <span className="text-primary">(Admin)</span>}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email || (user.isGuest ? "Guest User" : "")}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Award className="mr-2 h-4 w-4" />
            <span>Achievements</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Users className="mr-2 h-4 w-4" />
            <span>Friends</span>
          </DropdownMenuItem>
          
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <Bell className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
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

export default ProfileButton;
