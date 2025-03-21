
import { Link, useLocation } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';
import { Share } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
}

const Navbar = ({ roundInfo }: NavbarProps) => {
  const { toast } = useToast();
  const location = useLocation();
  
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
  };

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center px-4">
        {/* Game info on the left */}
        <div className="mr-4 flex">
          {roundInfo ? (
            <div className="font-medium">
              <span>Round {roundInfo.currentRound} of {roundInfo.maxRounds}</span>
              <span className="ml-4">Score: {roundInfo.totalScore}</span>
            </div>
          ) : (
            <Link to="/" className="font-bold text-lg tracking-tight">
              GUESSEVENTS
            </Link>
          )}
        </div>

        {/* Hint button in center */}
        <div className="flex-1 flex items-center justify-center">
          <HintDisplay availableHints={10} />
        </div>
        
        {/* Share and Profile buttons on the right */}
        <div className="flex items-center justify-end gap-2">
          <button 
            onClick={handleShare}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Share"
          >
            <Share className="h-5 w-5" />
          </button>
          <ProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
