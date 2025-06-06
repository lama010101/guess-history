import React from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { useHint } from '@/hooks/useHint';
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
    canSelectHint, 
    hintsAllowed: defaultHintsAllowed = 0,
    hintsUsedThisRound = 0,
    selectedHintType 
  } = useHint(imageForRound);
  
  // Use prop value if provided, otherwise use the default from the hook
  const effectiveHintsAllowed = propHintsAllowed ?? defaultHintsAllowed;
  const hintsRemaining = Math.max(0, effectiveHintsAllowed - hintsUsedThisRound);
  const isDisabled = !canSelectHint || !imageForRound || hintsRemaining <= 0;
  
  const buttonContent = (
    <Button 
      size="sm" 
      className={`${className} ${selectedHintType ? 'bg-history-secondary/50' : 'bg-black/50 hover:bg-black/70'} text-white border-none`}
      onClick={onClick}
      disabled={isDisabled}
    >
      <HelpCircle className="h-4 w-4 mr-1" /> 
      Hint
      {selectedHintType && <span className="ml-1 text-xs">({selectedHintType})</span>}
      <span className="ml-2 text-xs opacity-75">Hints: {hintsRemaining}/{effectiveHintsAllowed}</span>
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