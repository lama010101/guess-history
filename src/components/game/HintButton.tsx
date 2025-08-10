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
  roomId?: string;
  roundNumber?: number;
}

export const HintButton: React.FC<HintButtonProps> = ({ 
  onClick, 
  className = '', 
  imageForRound = null,
  hintsAllowed: propHintsAllowed,
  roomId,
  roundNumber
}) => {
  const { 
    purchasedHintIds,
    isLoading,
  } = useHintV2(imageForRound, (roomId && roundNumber !== undefined) ? { roomId, roundNumber } : undefined);
  
  const hintsUsedCount = purchasedHintIds?.length || 0;
  const hintsAllowedCount = propHintsAllowed || 14;
  const hintsRemaining = Math.max(0, hintsAllowedCount - hintsUsedCount);
  const isDisabled = !imageForRound || isLoading;
  
  const buttonContent = (
    <Button 
      size="sm" 
      className={`${className} bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md transition-all duration-200 hover:shadow-lg`}
      onClick={onClick}
      disabled={isDisabled}
    >
      <HelpCircle className="h-4 w-4 mr-1" /> 
      Hint
      <span className="ml-2 text-xs font-medium">{hintsUsedCount}/14</span>
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