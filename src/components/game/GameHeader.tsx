import React from 'react';
import { Button } from "@/components/ui/button";
import { Clock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGame } from '@/contexts/GameContext';
import { HINTS_PER_GAME } from '@/hooks/useHint';

interface GameHeaderProps {
  imageUrl: string;
  imageAlt?: string;
  selectedHintType?: string | null;
  remainingTime?: string;
  onHintClick: () => void;
  hintsUsed?: number; // Hints used in current round
  hintsAllowed?: number; // Hints allowed per round
  hintsUsedTotal?: number; // Total hints used across all rounds
  rawRemainingTime?: number;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  imageUrl,
  imageAlt = "Historical scene",
  selectedHintType,
  remainingTime,
  onHintClick,
  hintsUsed = 0,
  hintsAllowed = 0,
  hintsUsedTotal = 0,
  rawRemainingTime = 0
}) => {
  // Check if hints are disabled for this round
  const hintsRemainingThisRound = hintsAllowed - hintsUsed;
  // Calculate total hints remaining for the game
  const hintsTotalRemaining = HINTS_PER_GAME - hintsUsedTotal;
  
  // Disable hint button if either round limit or total game limit is reached
  const isHintDisabled = hintsRemainingThisRound <= 0 || hintsTotalRemaining <= 0;
  
  const isTimeRunningOut = rawRemainingTime <= 10;
  const timerBadgeClass = isTimeRunningOut ? "bg-red-600 hover:bg-red-700" : "bg-primary";

  return (
    <div className="w-full h-[40vh] md:h-[50vh] relative">
      <img
        src={imageUrl}
        alt={imageAlt}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white/70 hover:bg-white"
          onClick={onHintClick}
          disabled={isHintDisabled}
        >
          <HelpCircle className="h-5 w-5" />
          <span className="ml-1">Hint</span>
          <Badge variant="default" className="ml-1">
            {selectedHintType ? selectedHintType : `${hintsTotalRemaining}/${HINTS_PER_GAME}`}
          </Badge>
        </Button>
        {remainingTime && (
          <Button 
            size="sm" 
            variant="outline" 
            className="bg-white/70 hover:bg-white h-6 px-2"
          >
            <Clock className="h-3 w-3" />
            <Badge 
              variant="default" 
              className={`ml-1 text-xs h-4 ${timerBadgeClass}`}
            >
              {remainingTime}
            </Badge>
          </Button>
        )}
      </div>
    </div>
  );
};

export default GameHeader;
