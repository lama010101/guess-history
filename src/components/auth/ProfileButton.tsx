
import { useState } from 'react';
import { useAuth } from '@/services/auth';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Share } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const ProfileButton = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const [openDropdown, setOpenDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setOpenDropdown(false);
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: 'GUESSEVENTS',
        text: 'Test your knowledge of historical events!',
        url: shareUrl,
      }).catch((error) => console.log('Error sharing', error));
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast({
          title: "Link copied!",
          description: "Share this link with your friends to play together.",
        });
      });
    }
    
    setOpenDropdown(false);
  };
  
  return (
    <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full border border-border"
          aria-label="User menu"
        >
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          {isAuthenticated ? (
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user?.username || 'User'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            </div>
          ) : (
            'Account'
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleShare}>
          <Share className="mr-2 h-4 w-4" />
          <span>Share</span>
        </DropdownMenuItem>
        
        {isAuthenticated ? (
          <>
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link to="/admin">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => setOpenDropdown(false)}>
            <User className="mr-2 h-4 w-4" />
            <span>Sign In</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileButton;
