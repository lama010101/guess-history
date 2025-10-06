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
  peerRoster?: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isSelf?: boolean;
  }>;
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
  peerRoster = [],
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
      // navigate('/solo/settings'); 
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
        {/* Peer roster display and hint button */}
        <div className="flex flex-col gap-2">
          {peerRoster.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pointer-events-none select-none">
              <span className="text-xs font-semibold uppercase tracking-wide text-white/70">
                Players
              </span>
              {peerRoster.map((peer) => (
                <span
                  key={`peer-pill-${peer.id}`}
                  className={`text-xs font-medium rounded-full border border-white/30 px-3 py-1 bg-black/50 text-white/90 backdrop-blur-sm ${peer.isSelf ? 'border-amber-400 bg-amber-500/20 text-amber-100' : ''}`}
                >
                  {peer.displayName}
                </span>
              ))}
            </div>
          )}
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
              <Badge variant="secondary" className="text-xs">
                {hintsUsed}/{hintsAllowed}
              </Badge>
              {(xpDebt > 0 || accDebt > 0) && (
                <span className="ml-2 text-xs font-semibold text-white bg-red-600/90 rounded px-2 py-0.5">
                  -{xpDebt}XP · -{accDebt}%
                </span>
              )}
            </Button>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {peerRoster.length > 0 && (
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20">
              {peerRoster.slice(0, 4).map((peer) => (
                <div key={peer.id} className="flex items-center">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/60 bg-gradient-to-br from-orange-400 to-pink-500 flex-shrink-0">
                    {peer.avatarUrl ? (
                      <img
                        src={peer.avatarUrl}
                        alt={peer.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white rounded-full">
                        {(peer.displayName || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {peerRoster.length > 4 && (
                <span className="text-xs font-semibold text-white/90">
                  +{peerRoster.length - 4}
                </span>
              )}
            </div>
          )}
          {onFullscreen && (
            <Button 
              size="icon"
              variant="outline"
              onClick={onFullscreen}
              className="h-11 w-11 bg-secondary/70 hover:bg-secondary/80 text-secondary-foreground rounded-full border-none"
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
