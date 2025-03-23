
import { Link, useLocation } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';
import { useGameState } from '@/hooks/useGameState';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import GameTimer from './game/GameTimer';

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
  const { hintCoins, handleUseLocationHint, handleUseYearHint, locationHintUsed, yearHintUsed } = useGameState();
  const [isHintOpen, setIsHintOpen] = useState(false);
  const isGamePage = location.pathname === '/play';
  
  // Force update when roundInfo changes
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (roundInfo) {
      forceUpdate({});
    }
  }, [roundInfo?.currentRound, roundInfo?.totalScore]);
  
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-background/80 border-b border-border relative">
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
        
        {/* Profile button on the right */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
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
        <div className="top-center-hint">
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
    </header>
  );
};

export default Navbar;
