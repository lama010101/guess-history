
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Home, Map, ChevronRight, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import ProfileButton from './auth/ProfileButton';
import { useAuth } from '@/services/auth';
import HintSystem from './game/HintSystem';
import { Badge } from '@/components/ui/badge';
import Notifications from './Notifications';

interface RoundInfo {
  currentRound: number;
  maxRounds: number;
  totalScore: number;
}

interface NavbarProps {
  roundInfo?: RoundInfo;
  hintCoins?: number;
  hintsOpen?: boolean;
  setHintsOpen?: (open: boolean) => void;
  hideTitle?: boolean;
  onUseLocationHint?: () => boolean;
  onUseYearHint?: () => boolean;
  locationHintUsed?: boolean;
  yearHintUsed?: boolean;
  currentImage?: any;
}

const Navbar = ({
  roundInfo,
  hintCoins = 0,
  hintsOpen = false,
  setHintsOpen,
  hideTitle = false,
  onUseLocationHint,
  onUseYearHint,
  locationHintUsed = false,
  yearHintUsed = false,
  currentImage
}: NavbarProps) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setNavOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          {!hideTitle && (
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="font-bold text-lg inline-block">GuessEvents</span>
            </Link>
          )}
          
          {roundInfo && (
            <div className="flex items-center space-x-4 text-sm font-medium">
              <div className="flex items-center space-x-1">
                <Map className="h-4 w-4" />
                <span>
                  {roundInfo.currentRound} / {roundInfo.maxRounds}
                </span>
              </div>
              
              <div className="hidden md:flex items-center space-x-1">
                <BarChart3 className="h-4 w-4" />
                <span>{roundInfo.totalScore}</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-end space-x-2">
          {/* Only show the Notifications button when a user is authenticated */}
          {isAuthenticated && (
            <Notifications />
          )}
          
          {/* Add the HintSystem button */}
          {setHintsOpen && onUseLocationHint && onUseYearHint && (
            <HintSystem
              hintCoins={hintCoins}
              open={hintsOpen}
              setOpen={setHintsOpen}
              onUseLocationHint={onUseLocationHint}
              onUseYearHint={onUseYearHint}
              locationHintUsed={locationHintUsed}
              yearHintUsed={yearHintUsed}
              currentImage={currentImage}
            />
          )}
          
          <nav className="hidden md:flex items-center space-x-1">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/play">Play</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/leaderboard">Leaderboard</Link>
            </Button>
            {isAuthenticated && (
              <Button asChild variant="ghost" size="sm">
                <Link to="/friends">Friends</Link>
              </Button>
            )}
          </nav>
          
          <ThemeToggle />
          <ProfileButton />
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setNavOpen(!navOpen)}
          >
            <ChevronRight className={`h-5 w-5 transition-transform ${navOpen ? 'rotate-90' : ''}`} />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile Navigation Menu */}
      {navOpen && (
        <div className="md:hidden border-t px-4 py-3 shadow-lg">
          <nav className="grid gap-2">
            <Button
              variant="ghost"
              className="flex justify-start"
              onClick={() => handleNavigate('/')}
            >
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Button
              variant="ghost"
              className="flex justify-start"
              onClick={() => handleNavigate('/play')}
            >
              <Map className="mr-2 h-4 w-4" />
              Play
            </Button>
            <Button
              variant="ghost"
              className="flex justify-start"
              onClick={() => handleNavigate('/leaderboard')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            {isAuthenticated && (
              <Button
                variant="ghost"
                className="flex justify-start"
                onClick={() => handleNavigate('/friends')}
              >
                <Bell className="mr-2 h-4 w-4" />
                Friends
              </Button>
            )}
            <Button
              variant="ghost"
              className="flex justify-start"
              onClick={() => handleNavigate('/settings')}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
