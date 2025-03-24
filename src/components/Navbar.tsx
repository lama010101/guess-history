
import { useState } from 'react';
import { Link } from 'react-router-dom';
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
import { Lightbulb } from 'lucide-react';
import { ModeToggle } from './ModeToggle';
import { SettingsDialog } from './SettingsDialog';
import { useLocation } from 'react-router-dom';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
  showTimer?: boolean;
  timerDuration?: number;
  hintsOpen?: boolean;
}

const Navbar = ({ roundInfo, showTimer, timerDuration, hintsOpen }: NavbarProps) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [showHints, setShowHints] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const toggleHints = () => {
    setShowHints(!showHints);
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
          <ModeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => logout()}>
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
          <Button onClick={() => setShowSettings(true)}>Settings</Button>
          <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
