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
  ChevronDown,
  Users,
  Trophy,
  Share2
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
import HintDialog from './game/HintDialog';
import ShareDialog from './ShareDialog';
import { useNavigationConfirmation } from '@/hooks/useNavigationConfirmation';
import HintSystem from './game/HintSystem';

interface RoundInfo {
  currentRound: number;
  maxRounds: number;
  totalScore: number;
}

interface NavbarProps {
  showTimer?: boolean;
  timerDuration?: number;
  timerEnabled?: boolean;
  onTimerEnd?: () => void;
  timerPaused?: boolean;
  roundInfo?: RoundInfo;
  hintCoins?: number;
  hintsOpen?: boolean;
  setHintsOpen?: (open: boolean) => void;
  hideTitle?: boolean;
  locationHintUsed?: boolean;
  yearHintUsed?: boolean;
  onUseLocationHint?: () => boolean;
  onUseYearHint?: () => boolean;
  currentImage?: {
    year: number;
    location: { lat: number; lng: number };
    description: string;
    locationName?: string;
  };
}

const Navbar = ({
  showTimer = false,
  timerDuration = 60,
  timerEnabled = false,
  onTimerEnd,
  timerPaused = false,
  roundInfo,
  hintCoins = 0,
  hintsOpen = false,
  setHintsOpen,
  hideTitle = false,
  locationHintUsed = false,
  yearHintUsed = false,
  onUseLocationHint,
  onUseYearHint,
  currentImage
}: NavbarProps) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showHintDialog, setShowHintDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const { registerNavigationHandler } = useNavigationConfirmation();
  
  const isInGame = location.pathname === '/play';
  
  useEffect(() => {
    if (isInGame) {
      registerNavigationHandler((path) => {
        navigate(path);
        return true;
      });
    }
  }, [isInGame, navigate, registerNavigationHandler]);
  
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
    navigate(path);
  };

  const handleFriendsNavigation = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast({
        title: "Login required",
        description: "You need to be logged in to access your friends list"
      });
      return;
    }
    handleNavigation('/friends');
  };

  const handleProfileNavigation = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      toast({
        title: "Login required",
        description: "You need to be logged in to access your profile"
      });
      return;
    }
    handleNavigation('/profile');
  };

  const toggleHints = () => {
    if (isInGame) {
      if (setHintsOpen) {
        setHintsOpen(!hintsOpen);
      }
    } else {
      setShowHintDialog(true);
    }
  };
  
  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow-sm">
      <div className="container flex h-16 items-center">
        {isInGame ? (
          <>
            {roundInfo && (
              <div className="flex items-center">
                <div className="text-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      Round {roundInfo.currentRound}/{roundInfo.maxRounds}
                    </span>
                    <span className="w-[1px] h-4 bg-border"></span>
                    <span className="text-sm font-medium">
                      Score: {roundInfo.totalScore.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {showTimer && timerEnabled && (
              <div className="flex-1 flex justify-center px-4 max-w-[300px] mx-auto">
                <GameTimer 
                  duration={timerDuration} 
                  paused={timerPaused}
                  onTimeUp={onTimerEnd}
                  hintsOpen={false}
                />
              </div>
            )}
            
            <div className="flex items-center gap-2 ml-auto">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={toggleHints}
              >
                <span>Hints: {hintCoins}</span>
              </Button>
              
              {!isAuthenticated && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleNavigation('/')}
                  className="mr-2"
                >
                  <Home className="h-4 w-4 mr-1" />
                  <span>Home</span>
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
                  <DropdownMenuContent align="end" className="z-50">
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
                      <DropdownMenuItem onClick={() => handleNavigation('/friends')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Friends</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/leaderboard')}>
                        <Trophy className="mr-2 h-4 w-4" />
                        <span>Leaderboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share</span>
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-6 md:gap-10">
              {!hideTitle && (
                <Link to="/" className="flex items-center gap-1">
                  <span className="text-xl font-bold">EventGuesser</span>
                </Link>
              )}
              
              <nav className="hidden md:flex gap-6">
                {!hideTitle && (
                  <>
                    <Link 
                      to="/" 
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Home
                    </Link>
                    <button 
                      onClick={handleProfileNavigation}
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Profile
                    </button>
                    <Link 
                      to="/leaderboard" 
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Leaderboard
                    </Link>
                    <button 
                      onClick={handleFriendsNavigation}
                      className="text-sm font-medium transition-colors hover:text-primary"
                    >
                      Friends
                    </button>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        className="text-sm font-medium transition-colors hover:text-primary"
                      >
                        Admin
                      </Link>
                    )}
                  </>
                )}
              </nav>
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <div className="flex-1 flex justify-center mx-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1"
                  onClick={toggleHints}
                >
                  <span>Hints: {hintCoins}</span>
                </Button>
              </div>
              
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
                  <DropdownMenuContent align="end" className="z-50">
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
                      <DropdownMenuItem onClick={() => handleNavigation('/friends')}>
                        <Users className="mr-2 h-4 w-4" />
                        <span>Friends</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleNavigation('/leaderboard')}>
                        <Trophy className="mr-2 h-4 w-4" />
                        <span>Leaderboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share</span>
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
          </>
        )}
      </div>
      
      {isInGame && hintsOpen && currentImage && onUseLocationHint && onUseYearHint && (
        <div className="absolute top-16 left-4 z-40">
          <HintSystem
            hintCoins={hintCoins}
            onUseLocationHint={onUseLocationHint}
            onUseYearHint={onUseYearHint}
            locationHintUsed={locationHintUsed}
            yearHintUsed={yearHintUsed}
            currentImage={currentImage}
          />
        </div>
      )}
      
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <SettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog} 
      />
      <HintDialog 
        open={showHintDialog} 
        onOpenChange={setShowHintDialog} 
        hintCoins={hintCoins} 
      />
      <ShareDialog 
        open={showShareDialog} 
        onOpenChange={setShowShareDialog} 
      />
    </header>
  );
};

export default Navbar;
