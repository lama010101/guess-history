import React from 'react';
import { Button } from "@/components/ui/button";
import { HelpCircle, Target, Zap, Home, Settings, Maximize } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from 'react-router-dom';
import { formatInteger } from '@/utils/format';
import TimerDisplay from '@/components/game/TimerDisplay';

interface GameOverlayHUDProps {
  remainingTime?: string;
  rawRemainingTime?: number;
  onHintClick?: () => void;
  hintsUsed?: number;
  hintsAllowed?: number;
  selectedHintType?: string | null;
  currentAccuracy?: number;
  currentScore?: number;
  onNavigateHome: () => void;
  onConfirmNavigation: (navigateTo: () => void) => void;
  onOpenSettingsModal?: () => void;
  onFullscreen?: () => void;
  imageUrl?: string;
  className?: string;
  isTimerActive?: boolean;
  onTimeout?: () => void;
  setRemainingTime?: (time: number) => void;
}

const GameOverlayHUD: React.FC<GameOverlayHUDProps> = ({
  remainingTime,
  rawRemainingTime = 0,
  onHintClick,
  hintsUsed = 0,
  hintsAllowed = 0,
  selectedHintType,
  currentAccuracy = 0,
  currentScore = 0,
  onNavigateHome,
  onConfirmNavigation,
  onOpenSettingsModal,
  onFullscreen,
  imageUrl,
  className,
  isTimerActive = false,
  onTimeout = () => {},
  setRemainingTime = () => {}
}) => {
  // Show hint counter as X/Y where Y is the total allowed hints
  const hintsRemaining = hintsAllowed - hintsUsed;
  const isHintDisabled = hintsRemaining <= 0 || hintsAllowed <= 0;
  
  const navigate = useNavigate();
  
  const handleSettingsClick = () => {
    if (onOpenSettingsModal) {
      onOpenSettingsModal();
    } else {
      // Fallback or error if the prop isn't provided, though it should be.
      console.warn('onOpenSettingsModal not provided to GameOverlayHUD');
      // Optionally navigate to a dedicated settings page as a fallback:
      // navigate('/test/settings'); 
    }
  };

  return (
    <div className={`absolute inset-0 z-40 flex flex-col justify-between p-4 pointer-events-none game-overlay-hud ${className || ''}`}>
      {/* Top bar - Score in center, Home button on right */}
      <div className="flex justify-between items-start w-full">
        {/* Left side - Timer */}
        <div className="pointer-events-auto">
          {/* Only show timer if isTimerActive is true (controlled by timerEnabled from GameContext) */}
          {rawRemainingTime > 0 && isTimerActive && (
            <TimerDisplay
              remainingTime={rawRemainingTime}
              setRemainingTime={setRemainingTime}
              isActive={isTimerActive}
              onTimeout={onTimeout}
              roundTimerSec={rawRemainingTime}
            />
          )}
        </div>
        
        {/* Center - Score and accuracy */}
        <div className="flex bg-black/30 backdrop-blur-sm p-2 rounded-lg space-x-2 pointer-events-auto">
          <Badge 
            variant="accuracy" 
            className="flex items-center gap-1" 
            aria-label={`Accuracy: ${Math.round(currentAccuracy)}%`}
          >
            <Target className="h-3 w-3" />
            <span>{formatInteger(currentAccuracy)}%</span>
          </Badge>
          <Badge 
            variant="xp" 
            className="flex items-center gap-1" 
            aria-label={`Score: ${Math.round(currentScore)}`}
          >
            <Zap className="h-3 w-3" />
            <span>{formatInteger(currentScore)}</span>
          </Badge>
        </div>
        
        {/* Right side - Fullscreen button */}
        <div className="flex pointer-events-auto">
          {onFullscreen && (
            <Button 
              size="icon"
              variant="outline"
              onClick={onFullscreen}
              className="h-9 w-9 bg-white/70 hover:bg-white text-black rounded-full"
              aria-label="Full Screen"
              type="button"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Bottom bar with Hint button and Home button */}
      <div className="flex justify-between items-end w-full">
        {/* Hint button */}
        <div>
          {onHintClick && (
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white/70 hover:bg-white text-black pointer-events-auto"
              onClick={onHintClick}
              disabled={isHintDisabled}
            >
              <HelpCircle className="h-4 w-4 mr-1" />
              <span className="mr-1">Hint</span>
              <Badge variant="default" className="text-xs">
                {selectedHintType ? selectedHintType : `${hintsRemaining}/${hintsAllowed}`}
              </Badge>
            </Button>
          )}
        </div>
        
        {/* Home button in lower right corner */}
        <div className="pointer-events-auto">
          <Button 
            size="icon"
            variant="outline"
            onClick={() => onConfirmNavigation(() => onNavigateHome())}
            className="h-9 w-9 bg-white/70 hover:bg-white text-black rounded-full"
            aria-label="Home"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameOverlayHUD;
