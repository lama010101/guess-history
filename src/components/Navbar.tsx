
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';
import { useGameState } from '@/hooks/useGameState';
import { Lightbulb, Home, Share2, X, Settings, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import GameTimer from './game/GameTimer';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/services/auth';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
  showTimer?: boolean;
  timerDuration?: number; // seconds
}

const Navbar = ({ roundInfo, showTimer = false, timerDuration = 60 }: NavbarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hintCoins, handleUseLocationHint, handleUseYearHint, locationHintUsed, yearHintUsed } = useGameState();
  const [isHintOpen, setIsHintOpen] = useState(false);
  const isGamePage = location.pathname === '/play';
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [useMiles, setUseMiles] = useState(false);
  
  // Load distance format preference
  useEffect(() => {
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
  }, []);
  
  // Share the app URL
  const handleShare = () => {
    const url = window.location.origin;
    
    if (navigator.share) {
      navigator.share({
        title: 'GuessEvents - Test your knowledge of historical events',
        url: url
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(url);
      });
    } else {
      copyToClipboard(url);
    }
  };
  
  // Toggle distance format
  const toggleDistanceFormat = (value: boolean) => {
    setUseMiles(value);
    localStorage.setItem('distanceFormat', value ? 'miles' : 'km');
    
    toast({
      title: `Distance format changed to ${value ? 'Miles' : 'Kilometers'}`,
      description: `Distances will now be displayed in ${value ? 'miles' : 'kilometers'}.`
    });
  };
  
  // Copy URL to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Link copied!",
        description: "App link has been copied to clipboard"
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually",
        variant: "destructive"
      });
    });
  };
  
  // Force update when roundInfo changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (roundInfo) {
      forceUpdate({});
    }
  }, [roundInfo?.currentRound, roundInfo?.totalScore]);
  
  const isAdmin = user?.email === 'lama010101@gmail.com';
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border relative">
      <div className="container flex h-16 items-center px-4">
        {/* Game info on the left */}
        <div className="mr-4 flex flex-shrink-0">
          {roundInfo ? (
            <div className="font-medium whitespace-nowrap">
              <span>Image {roundInfo.currentRound} of {roundInfo.maxRounds}</span>
              <span className="ml-4">Score: {roundInfo.totalScore}</span>
            </div>
          ) : (
            <Link to="/" className="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
              GUESSEVENTS
            </Link>
          )}
        </div>

        {/* Hint button in center */}
        <div className="flex-1 flex items-center justify-center">
          {isGamePage && (
            <Button 
              variant="ghost" 
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setIsHintOpen(!isHintOpen)}
            >
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium mr-1">Hints:</span>
              <span className="text-sm font-bold">{hintCoins}</span>
            </Button>
          )}
        </div>
        
        {/* Menu and Profile button on the right */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Menu</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/')}>
                <Home className="h-4 w-4 mr-2" />
                Home
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')}>
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ProfileButton />
        </div>
      </div>
      
      {/* Game Timer */}
      {showTimer && isGamePage && (
        <GameTimer duration={timerDuration} paused={isHintOpen} />
      )}
      
      {/* Hints popup - centered horizontally */}
      {isHintOpen && isGamePage && (
        <div className="absolute left-1/2 transform -translate-x-1/2 top-16 z-50">
          <HintDisplay 
            availableHints={hintCoins} 
            onClose={() => setIsHintOpen(false)} 
          />
        </div>
      )}
      
      {/* Display active hints at top center */}
      {isGamePage && (locationHintUsed || yearHintUsed) && (
        <div className="absolute left-1/2 transform -translate-x-1/2 top-16 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-md border border-border shadow-md">
          {locationHintUsed && (
            <div className="text-sm font-medium mb-1">
              <span className="font-bold">Country:</span> {yearHintUsed ? ' ' : 'Hint active'}
            </div>
          )}
          {yearHintUsed && (
            <div className="text-sm font-medium">
              <span className="font-bold">Decade:</span> {locationHintUsed ? ' ' : 'Hint active'}
            </div>
          )}
        </div>
      )}
      
      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>
              Customize your game experience
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="distance-format">Distance Format</Label>
                <p className="text-sm text-muted-foreground">
                  Choose how distances are displayed
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={!useMiles ? "font-medium" : "text-muted-foreground"}>Km</span>
                <Switch 
                  id="distance-format" 
                  checked={useMiles} 
                  onCheckedChange={toggleDistanceFormat} 
                />
                <span className={useMiles ? "font-medium" : "text-muted-foreground"}>Miles</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Navbar;
