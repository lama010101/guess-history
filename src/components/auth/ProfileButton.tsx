
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/services/auth';
import { Home, LogOut, Settings, User } from 'lucide-react';

const ProfileButton = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleLogout = () => {
    logout();
  };

  // Get user initials from username instead of name
  const userInitials = user?.username 
    ? `${user.username.charAt(0)}${user.username.split(' ')[1]?.charAt(0) || ''}` 
    : 'GU';

  return (
    <>
      {isAuthenticated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.username || "User"} />
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.username || "Guest User"}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || "guest@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/" className="cursor-pointer flex w-full items-center">
                <Home className="mr-2 h-4 w-4" />
                <span>Home</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin" className="cursor-pointer flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button onClick={() => setShowAuthModal(true)} variant="default" size="sm">
          Sign In
        </Button>
      )}

      {/* This import would be done at the component level in a real app */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="bg-background rounded-lg p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Sign In</h2>
            <p className="mb-4">Authentication modal would go here.</p>
            <Button onClick={() => setShowAuthModal(false)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileButton;
