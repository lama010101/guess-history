
import { Link, useLocation } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import { useGameState } from '@/hooks/useGameState';
import { Lightbulb, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import HintSystem from './game/HintSystem';
import { useGameTimer } from '@/hooks/useGameTimer';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
}

const Navbar = ({ roundInfo }: NavbarProps) => {
  const location = useLocation();
  const { 
    hintCoins, 
    handleUseLocationHint, 
    handleUseYearHint, 
    locationHintUsed, 
    yearHintUsed,
    currentImage
  } = useGameState();
  
  const { remainingTime, isActive } = useGameTimer();
  const [isHintOpen, setIsHintOpen] = useState(false);
  
  const showGameControls = location.pathname === '/play';
  
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-background/80 border-b border-border">
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

        {/* Hint button and timer in center */}
        <div className="flex-1 flex items-center justify-center gap-4">
          {showGameControls && (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex items-center gap-1"
                onClick={() => setIsHintOpen(!isHintOpen)}
              >
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium mr-1">Hints</span>
              </Button>
              
              {isActive && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  <Timer className="h-4 w-4 mr-1.5 text-primary" />
                  <span className="text-sm font-medium">{remainingTime}s</span>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Profile button on the right */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <ProfileButton />
        </div>
      </div>
      
      {/* Hint Popup - Centered */}
      {isHintOpen && showGameControls && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm">
          <div className="relative">
            <HintSystem
              hintCoins={hintCoins}
              onUseLocationHint={() => {
                handleUseLocationHint();
                setIsHintOpen(false);
              }}
              onUseYearHint={() => {
                handleUseYearHint();
                setIsHintOpen(false);
              }}
              locationHintUsed={locationHintUsed}
              yearHintUsed={yearHintUsed}
              currentImage={currentImage}
              onClose={() => setIsHintOpen(false)}
            />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
