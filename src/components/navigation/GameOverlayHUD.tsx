import React from 'react';
import { Button } from "@/components/ui/button";
import { Settings, Maximize, Target, Zap, Sparkles } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { formatInteger } from '@/utils/format';
import TimerDisplay from '@/components/game/TimerDisplay';

interface GameOverlayHUDProps {
  remainingTime?: string;
  rawRemainingTime?: number;
  onHintV2Click?: () => void;
  hintsUsed?: number;
  hintsAllowed?: number;
  selectedHintType?: string | null;
  currentAccuracy?: number;
  currentScore?: number;
  onNavigateHome?: () => void;
  onConfirmNavigation?: (navigateTo: () => void) => void;
  onOpenSettingsModal?: () => void;
  onFullscreen?: () => void;
  imageUrl?: string;
  className?: string;
  isTimerActive?: boolean;
  onTimeout?: () => void;
  setRemainingTime?: React.Dispatch<React.SetStateAction<number>>;
  timerEnabled?: boolean;
  xpDebt?: number;
  accDebt?: number;
  roundTimerSec?: number;
  // Level Up: optional button to open intro modal
  levelLabel?: string;
  onOpenLevelIntro?: () => void;
}

const GameOverlayHUD: React.FC<GameOverlayHUDProps> = ({
  remainingTime,
  rawRemainingTime = 0,
  onHintV2Click,
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
  setRemainingTime = () => {},
  timerEnabled = true,
  xpDebt = 0,
  accDebt = 0,
  roundTimerSec = 0,
  levelLabel,
  onOpenLevelIntro,
}) => {
  // Show hint counter as X/Y where Y is the total allowed hints
  const isHintDisabled = hintsUsed >= hintsAllowed;
  
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
      {/* Top bar - Score centered, Home button on right */}
      <div className="flex justify-between items-start w-full relative">
        {/* Left side - Timer */}
        <div className="pointer-events-auto">
          {timerEnabled && (
            <TimerDisplay
              remainingTime={Math.max(0, rawRemainingTime || 0)}
              setRemainingTime={setRemainingTime}
              isActive={isTimerActive}
              onTimeout={onTimeout}
              roundTimerSec={roundTimerSec || 0}
              externalTimer={true}
            />
          )}
        </div>
        
        {/* Center - Score and accuracy (absolutely centered) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center bg-black/30 backdrop-blur-sm p-2 rounded-lg pointer-events-auto">
          <div className="flex space-x-2">
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
          

        </div>

        {/* Right side - Level Up Button (optional) */}
        <div className="pointer-events-auto ml-auto">
          {levelLabel && onOpenLevelIntro && (
            <Button
              size="sm"
              variant="outline"
              className="bg-white/80 text-black hover:bg-white/90 border-none"
              onClick={onOpenLevelIntro}
            >
              {levelLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Bottom bar with Hint button and Home button */}
      <div className="flex justify-between items-end w-full">
        {/* Hint button */}
        <div>
          {onHintV2Click && (
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white/80 text-black hover:bg-white/90 border-none pointer-events-auto"
              onClick={onHintV2Click}
              disabled={isHintDisabled}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              <span className="mr-1">Hints</span>
              <Badge variant="default" className="text-xs text-white">
                {`${hintsUsed}/14`}
              </Badge>
              {(xpDebt > 0 || accDebt > 0) && (
                <span className="ml-2 text-xs font-semibold text-white bg-red-600/90 rounded px-2 py-0.5">
                  -{xpDebt}XP, -{accDebt}%
                </span>
              )}
            </Button>
          )}
        </div>
        
        {/* Fullscreen button in lower right corner */}
        <div className="pointer-events-auto">
          {onFullscreen && (
            <Button 
              size="icon"
              variant="outline"
              onClick={onFullscreen}
              className="h-11 w-11 bg-orange-600/80 hover:bg-orange-700/90 text-white rounded-full border-none"
              aria-label="Fullscreen"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverlayHUD;
