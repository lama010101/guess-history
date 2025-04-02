import { useState, useEffect } from 'react';
import { useAuth } from '@/services/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, ChevronDown, Settings, HelpCircle, Home, Share2 } from 'lucide-react';
import AuthModal from './AuthModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ProfileButton = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [useMiles, setUseMiles] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all game-related local storage
      localStorage.removeItem('currentGameState');
      localStorage.removeItem('userGameStats');
      localStorage.removeItem('savedEvents');
      localStorage.removeItem('gameSettings');
      localStorage.removeItem('achievements');
      
      // Call the logout function from useAuth which handles the rest
      await logout();
      
      // Redirect to homepage
      navigate('/');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GuessEvents Game',
        text: 'Check out this awesome historical event guessing game!',
        url: window.location.origin,
      }).catch(err => {
        console.error('Error sharing:', err);
        copyToClipboard(window.location.origin);
      });
    } else {
      copyToClipboard(window.location.origin);
      toast({
        title: "Link copied!",
        description: "Game link has been copied to clipboard"
      });
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
  
  const toggleDistanceFormat = (value: boolean) => {
    setUseMiles(value);
    localStorage.setItem('distanceFormat', value ? 'miles' : 'km');
    
    toast({
      title: `Distance format changed to ${value ? 'Miles' : 'Kilometers'}`,
      description: `Distances will now be displayed in ${value ? 'miles' : 'kilometers'}.`
    });
  };

  useEffect(() => {
    const distancePref = localStorage.getItem('distanceFormat');
    if (distancePref) {
      setUseMiles(distancePref === 'miles');
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <>
        <Button 
          variant="ghost" 
          onClick={() => setShowAuthModal(true)}
          className="flex items-center gap-2"
        >
          <LogIn className="h-4 w-4" />
          <span className="hidden md:inline-block">Sign In</span>
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
          <Button variant="ghost" className="relative h-8 flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'Guest'}`} 
                    alt={user?.username || 'Guest'} 
                  />
                  <AvatarFallback>{user?.username?.charAt(0) || 'G'}</AvatarFallback>
                </Avatar>
                {user?.isGuest && (
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-orange-500 border border-white"></span>
                )}
              </div>
              <span className="hidden md:inline-block font-medium">{user?.username || 'Guest'}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Menu</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link to="/" className="cursor-pointer">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSettingsDialog(true)} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          {!user?.isGuest && (
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to="/help" className="cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleLogout}
            className="text-red-500 focus:text-red-500 cursor-pointer"
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? 'Logging out...' : 'Log out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showSettingsDialog} onOpenChange={(open) => {
        setShowSettingsDialog(open);
      }}>
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
    </>
  );
};

export default ProfileButton;
