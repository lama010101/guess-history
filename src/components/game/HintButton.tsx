import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Sparkles } from 'lucide-react';
import { useHintV2 } from '@/hooks/useHintV2';
import { GameImage } from '@/contexts/GameContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HintButtonProps {
  onClick: () => void;
  className?: string;
  imageForRound?: GameImage | null;
  hintsAllowed?: number; // Allow overriding hints allowed from props
}

export const HintButton: React.FC<HintButtonProps> = ({ 
  onClick, 
  className = '', 
  imageForRound = null,
  hintsAllowed: propHintsAllowed
}) => {
  const { 
    purchasedHintIds,
    isLoading,
  } = useHintV2(imageForRound);
  
  const hintsUsedCount = purchasedHintIds.length;
  const hintsAllowedCount = 14;
  const hintsRemaining = Math.max(0, hintsAllowedCount - hintsUsedCount);
  const isDisabled = !imageForRound || isLoading;
  
  const buttonContent = (
    <Button 
      size="sm" 
      className={`${className} ${selectedHintType ? 'bg-history-secondary/50' : 'bg-black/50 hover:bg-black/70'} text-white border-none`}
      onClick={onClick}
      disabled={isDisabled}
    >
      <HelpCircle className="h-4 w-4 mr-1" /> 
      Hint
      <span className="ml-2 text-xs opacity-75">Hints: {hintsUsedCount}/14</span>
    </Button>
  );

  if (isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              {buttonContent}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>No hints available for this round</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonContent;
};