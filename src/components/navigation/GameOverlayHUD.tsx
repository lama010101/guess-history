import React from 'react';
import { Button } from "@/components/ui/button";
import { Maximize, Target, Zap, Sparkles, MessageCircle } from 'lucide-react';
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
    submitted?: boolean;
    recentlySubmitted?: boolean;
  }>;
  onOpenChat?: () => void;
  isChatOpen?: boolean;
  chatMessageCount?: number;
  avatarClusterRef?: React.RefObject<HTMLDivElement>;
  waitingForPeers?: boolean;
  submittedCount?: number;
  totalParticipants?: number;
  submissionNotice?: string | null;
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
  onOpenChat,
  isChatOpen = false,
  chatMessageCount = 0,
  avatarClusterRef,
  waitingForPeers = false,
  submittedCount,
  totalParticipants,
  submissionNotice = null,
}) => {
  // Show hint counter as X/Y where Y is the total allowed hints
  const isHintDisabled = hintsUsed >= hintsAllowed;
  const formattedChatCount = chatMessageCount > 99 ? '99+' : String(chatMessageCount ?? 0);
  const showChatCount = (chatMessageCount ?? 0) > 0;
  const hasPeers = peerRoster.length > 0;
  
  return (
    <div className={`absolute inset-0 z-[1000] flex flex-col justify-between p-4 pointer-events-none game-overlay-hud ${className || ''}`}>
      {/* Top bar - Score centered, Home button on right */}
      <div className="flex justify-between items-start w-full relative">
        {/* Left side - Timer */}
        <div className="pointer-events-auto flex items-center gap-2">
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

      {/* Bottom bar with Hint button and chat avatars */}
      <div className="flex justify-between items-end w-full">
        <div className="flex items-end gap-3 pointer-events-auto">
          {(hasPeers || onOpenChat) && (
            <div className="relative flex flex-col items-center">
              {submissionNotice && (
                <div className="mb-2 px-3 py-1 rounded-full bg-emerald-300/90 text-black text-xs font-semibold shadow">{submissionNotice}</div>
              )}
              <div
                ref={avatarClusterRef ?? undefined}
                className={`relative flex items-center gap-2 bg-black/45 backdrop-blur-sm ${hasPeers ? 'px-3 py-2' : 'px-2 py-1'} rounded-full border border-white/20 pointer-events-auto`}
              >
                {hasPeers && peerRoster.slice(0, 6).map((peer) => {
                  const highlight = peer.submitted || peer.recentlySubmitted;
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={onOpenChat}
                      disabled={!onOpenChat}
                      className={`relative flex items-center justify-center w-8 h-8 rounded-full border ${highlight ? 'border-emerald-400 ring-2 ring-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.55)]' : 'border-white/60'} flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed transition-all duration-150`}
                      aria-label={peer.isSelf ? 'Open chat (you)' : `Open chat with ${peer.displayName ?? 'player'}`}
                    >
                      {peer.recentlySubmitted && (
                        <span className="absolute -top-1.5 right-0 translate-x-1 rounded-full bg-emerald-400 text-black text-[0.55rem] font-bold px-1.5 py-0.5 shadow-[0_2px_6px_rgba(16,185,129,0.6)]">
                          GUESS
                        </span>
                      )}
                      <span className="flex h-full w-full items-center justify-center rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-pink-500">
                        {peer.avatarUrl ? (
                          <img
                            src={peer.avatarUrl}
                            alt={peer.displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                            {(peer.displayName || '?').slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {hasPeers && peerRoster.length > 6 && (
                  <span className="text-xs font-semibold text-white/90">
                    +{peerRoster.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}
          {onHintV2Click && (
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-white/80 text-black hover:bg-white/90 border-none"
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
          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className={`relative flex items-center justify-center w-10 h-10 rounded-full border border-white/50 ${isChatOpen ? 'bg-emerald-500/90 text-black' : 'bg-black/55 text-white hover:bg-black/70'} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
              aria-label={isChatOpen ? 'Hide chat' : 'Show chat'}
              aria-pressed={isChatOpen}
              title={isChatOpen ? 'Hide chat' : 'Show chat'}
            >
              <MessageCircle className="h-4 w-4" />
              {showChatCount && (
                <span className="absolute -top-1.5 -right-1.5 rounded-full bg-emerald-400 text-black text-[0.65rem] font-semibold px-1.5 py-0.5 shadow-lg">
                  {formattedChatCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameOverlayHUD;
