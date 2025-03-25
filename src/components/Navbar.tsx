
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/services/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import HintDisplay from './HintDisplay';
import { Lightbulb, LogOut, User, Settings, HelpCircle, Home, Share2, ChevronDown } from 'lucide-react';
import { SettingsDialog } from './SettingsDialog';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
  showTimer?: boolean;
  timerDuration?: number;
  hintsOpen?: boolean;
  hintCoins?: number;
  setHintsOpen?: (open: boolean) => void;
}

const Navbar = ({ 
  roundInfo, 
  showTimer, 
  timerDuration, 
  hintsOpen, 
  hintCoins = 0,
  setHintsOpen
}: NavbarProps) => {
  const { user, logout, isAdmin } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [showHints, setShowHints] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GeoGuessr Game',
        text: 'Check out this awesome historical event guessing game!',
        url: window.location.origin,
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(window.location.origin);
      });
    } else {
      copyToClipboard(window.location.origin);
    }
  };
  
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
  
  const toggleHints = () => {
    const newState = !showHints;
    setShowHints(newState);
    if (setHintsOpen) {
      setHintsOpen(newState);
    }
  };
  
  return (
    <nav className="bg-background border-b sticky top-0 z-50">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="font-bold text-xl">
          GeoGuessr
        </Link>
        
        {roundInfo && (
          <div className="flex items-center gap-4">
            {showTimer && timerDuration !== undefined && (
              <div className="text-sm font-medium">
                {timerDuration} seconds
              </div>
            )}
            <div className="text-sm font-medium">
              Round {roundInfo.currentRound} / {roundInfo.maxRounds}
            </div>
            <div className="text-sm font-medium">
              Score: {roundInfo.totalScore}
            </div>
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* Hint button in navbar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleHints}
            className="flex items-center gap-1"
          >
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium">{hintCoins}</span>
          </Button>
          
          {showHints && (
            <div className="absolute top-16 right-24 z-50">
              <HintDisplay 
                availableHints={hintCoins} 
                onClose={toggleHints} 
              />
            </div>
          )}
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 flex items-center gap-1 p-1 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowSettings(true)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin">
                      <Settings className="mr-2 h-4 w-4" />
                      Admin
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/help">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Help
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {location.pathname !== '/login' && (
                <Link to="/login" className="text-sm font-medium hover:underline">
                  Login
                </Link>
              )}
              {location.pathname !== '/register' && (
                <Link to="/register" className="text-sm font-medium hover:underline">
                  Register
                </Link>
              )}
            </>
          )}
          <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
