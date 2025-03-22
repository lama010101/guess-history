
import { Link, useLocation } from 'react-router-dom';
import ProfileButton from './auth/ProfileButton';
import HintDisplay from './HintDisplay';
import { useGameState } from '@/hooks/useGameState';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface NavbarProps {
  roundInfo?: {
    currentRound: number;
    maxRounds: number;
    totalScore: number;
  };
}

const Navbar = ({ roundInfo }: NavbarProps) => {
  const location = useLocation();
  const { hintCoins } = useGameState();
  const [isHintOpen, setIsHintOpen] = useState(false);
  
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
            <span className="font-bold text-lg tracking-tight">
              GUESSEVENTS
            </span>
          )}
        </div>

        {/* Hint button in center */}
        <div className="flex-1 flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => setIsHintOpen(true)}
          >
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-medium mr-1">Hints:</span>
            <span className="text-sm font-bold">{hintCoins}</span>
          </Button>
          
          {isHintOpen && <HintDisplay availableHints={hintCoins} onClose={() => setIsHintOpen(false)} />}
        </div>
        
        {/* Profile button on the right */}
        <div className="flex items-center justify-end gap-2 flex-shrink-0">
          <ProfileButton />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
