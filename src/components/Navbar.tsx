
import { Link, useLocation } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';
import { useGameState } from '@/hooks/useGameState';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
}

const Navbar = ({ roundInfo }: NavbarProps) => {
  const location = useLocation();
  const { hintCoins, handleUseLocationHint, handleUseYearHint, locationHintUsed, yearHintUsed } = useGameState();
  const [isHintOpen, setIsHintOpen] = useState(false);
  
  // Force update when roundInfo changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (roundInfo) {
      forceUpdate({});
    }
  }, [roundInfo?.currentRound, roundInfo?.totalScore]);
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border">
      <div className="container flex h-16 items-center px-4">
        {/* Game info on the left */}
        <div className="mr-4 flex flex-shrink-0">
          {roundInfo ? (
            <div className="font-medium whitespace-nowrap">
              <span>Round {roundInfo.currentRound} of {roundInfo.maxRounds}</span>
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
          {location.pathname === '/play' && (
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
        
        {/* Profile button on the right */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <ProfileButton />
        </div>
      </div>
      
      {/* Hint Display */}
      {isHintOpen && location.pathname === '/play' && (
        <div className="absolute right-4 top-20 z-50">
          <HintDisplay availableHints={hintCoins} onClose={() => setIsHintOpen(false)} />
        </div>
      )}
    </header>
  );
};

export default Navbar;
