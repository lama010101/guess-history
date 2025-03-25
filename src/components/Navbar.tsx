
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { 
  Home,
  User,
  LogOut,
  LogIn,
  Settings,
  Lightbulb,
  ChevronDown
} from 'lucide-react';
import AuthModal from './auth/AuthModal';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import GameTimer from './game/GameTimer';
import { SettingsDialog } from './SettingsDialog';

interface RoundInfo {
  currentRound: number;
  maxRounds: number;
  totalScore: number;
}

interface NavbarProps {
  showTimer?: boolean;
  timerDuration?: number;
  roundInfo?: RoundInfo;
  hintCoins?: number;
  hintsOpen?: boolean;
  setHintsOpen?: (open: boolean) => void;
}

const Navbar = ({
  showTimer = false,
  timerDuration = 60,
  roundInfo,
  hintCoins = 0,
  hintsOpen = false,
  setHintsOpen
}: NavbarProps) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if we're currently in a game
  const isInGame = location.pathname === '/play';
  
  const openAuthModal = () => {
    setAuthModalOpen(true);
  };
  
  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out"
    });
  };
  
  const handleNavigation = (path: string) => {
    // If we're in a game, use the navigation confirmation
    if (isInGame && window.appNavigation) {
      // If the navigation handler returns true, it means it's handling the navigation
      // so we should return to prevent the default navigation
      if (window.appNavigation.navigateTo(path)) {
        return;
      }
    }
    
    // Normal navigation if we're not in a game or the handler didn't handle it
    navigate(path);
  };

  const toggleHints = () => {
    if (setHintsOpen) {
      setHintsOpen(!hintsOpen);
    }
  };
  
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow-sm">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-6 md:gap-10">
          <Link to="/" className="flex items-center gap-1" onClick={(e) => {
            e.preventDefault();
            handleNavigation('/');
          }}>
            <span className="text-xl font-bold">EventGuesser</span>
          </Link>
          
          <nav className="hidden md:flex gap-6">
            <Link 
              to="/" 
              onClick={(e) => {
                e.preventDefault();
                handleNavigation('/');
              }}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Home
            </Link>
            <Link 
              to="/profile" 
              onClick={(e) => {
                e.preventDefault();
                handleNavigation('/profile');
              }}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Profile
            </Link>
            <Link 
              to="/leaderboard" 
              onClick={(e) => {
                e.preventDefault();
                handleNavigation('/leaderboard');
              }}
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Leaderboard
            </Link>
            {isAdmin && (
              <Link 
                to="/admin" 
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigation('/admin');
                }}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        
        {/* Round Info and Timer */}
        {roundInfo && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="flex items-center gap-2 justify-center">
                <span className="text-sm font-medium">
                  Round {roundInfo.currentRound}/{roundInfo.maxRounds}
                </span>
                <span className="w-[1px] h-4 bg-border"></span>
                <span className="text-sm font-medium">
                  Score: {roundInfo.totalScore.toLocaleString()}
                </span>
              </div>
              
              {showTimer && timerDuration && (
                <div className="mt-1 w-48 h-1">
                  <GameTimer 
                    duration={timerDuration} 
                    paused={false}
                  />
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2 ml-auto">
          {/* Hint button - disabled when not in game */}
          {isInGame ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={toggleHints}
            >
              <Lightbulb className="h-4 w-4" />
              <span>{hintCoins}</span>
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center"
              disabled
            >
              <Lightbulb className="h-4 w-4" />
              <span className="sr-only">Hints</span>
            </Button>
          )}
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <div className="flex items-center gap-1">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt="User avatar" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => handleNavigation('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{user?.username || 'Profile'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleNavigation('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => handleNavigation('/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Admin</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" onClick={openAuthModal}>
              <LogIn className="mr-2 h-4 w-4" />
              <span>Login</span>
            </Button>
          )}
        </div>
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
    </header>
  );
};

export default Navbar;
