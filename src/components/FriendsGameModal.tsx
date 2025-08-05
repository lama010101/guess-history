import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FriendsGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (settings: { timerSeconds: number; hintsPerGame: number }) => void;
  isLoading?: boolean;
}

const FriendsGameModal: React.FC<FriendsGameModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  isLoading = false,
}) => {
  const [hintsPerGame, setHintsPerGame] = useState(10);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [initialState, setInitialState] = useState({ hintsPerGame: 3, timerEnabled: true, timerSeconds: 60 });

  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('friendsGameSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setHintsPerGame(parsed.hintsPerGame ?? 10);
          setTimerEnabled(parsed.timerEnabled ?? true);
          setTimerSeconds(parsed.timerSeconds ?? 60);
          setInitialState({
            hintsPerGame: parsed.hintsPerGame ?? 10,
            timerEnabled: parsed.timerEnabled ?? true,
            timerSeconds: parsed.timerSeconds ?? 60,
          });
        } catch {
          // Use defaults if parsing fails
          setHintsPerGame(10);
          setTimerEnabled(true);
          setTimerSeconds(60);
          setInitialState({ hintsPerGame: 10, timerEnabled: true, timerSeconds: 60 });
        }
      }
    }
  }, [isOpen]);

  const timerLabel = timerSeconds < 60 ? `${timerSeconds}s` : `${Math.round(timerSeconds / 60)} min`;

  const handleCancel = () => {
    setHintsPerGame(initialState.hintsPerGame);
    setTimerEnabled(initialState.timerEnabled);
    setTimerSeconds(initialState.timerSeconds);
    onClose();
  };

  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Generate invite link on open
  useEffect(() => {
    if (!isOpen) return;
    const id = crypto.randomUUID().slice(0, 8);
    const url = `${window.location.origin}/join?invite=${id}`;
    setInviteUrl(url);
  }, [isOpen]);

  const handleCopyUrl = () => {
    let copied = false;
    // Try execCommand('copy') with a temporary textarea (most reliable for user-initiated events)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = (inviteUrl ?? '');
      textArea.setAttribute('readonly', '');
      textArea.style.position = 'absolute';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      copied = false;
    }

    // As a backup, try Clipboard API if available
    if (!copied && navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText((inviteUrl ?? '')).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }, () => {
        setIsCopied(false);
      });
      return;
    }

    setIsCopied(copied);
    if (copied) {
      setTimeout(() => setIsCopied(false), 2000);
    }
  };


  const handleStart = () => {
    const settings = {
    inviteUrl: inviteUrl ?? '',
      hintsPerGame,
      timerEnabled,
      timerSeconds,
      
    };
    localStorage.setItem('friendsGameSettings', JSON.stringify(settings));
    onStartGame({ timerSeconds, hintsPerGame });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full p-0 bg-transparent shadow-none border-none">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-md max-w-sm w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Close Button */}
          <button
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 rounded-full text-xl focus:outline-none"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
          {/* Title */}
          <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Game Settings</div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Hints per Game */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-base">?</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Hints per Game</span>
                </div>
                <span className="bg-orange-50 text-orange-600 text-sm px-2 py-1 rounded-md font-semibold">{hintsPerGame}</span>
              </div>
              <div className="space-y-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={hintsPerGame}
                  onChange={e => setHintsPerGame(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span><span>5</span><span>10</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You can use up to 10 hints per game (2 per round). Each hint costs 30 XP or 30% accuracy.
                </p>
              </div>
            </div>

            {/* Round Timer */}
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-base">⏰</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Round Timer</span>
                </div>
                <span className="bg-orange-50 text-orange-600 text-sm px-2 py-1 rounded-md font-semibold whitespace-nowrap ml-2">
                  {timerEnabled ? timerLabel : 'Off'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Timer Toggle */}
                <button
                  type="button"
                  className={`w-10 h-6 ${timerEnabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'} rounded-full flex items-center focus:outline-none transition-colors`}
                  onClick={() => setTimerEnabled((v) => !v)}
                  aria-label="Toggle round timer"
                >
                  <span
                    className={`block w-4 h-4 bg-white dark:bg-gray-400 rounded-full shadow transform transition-transform ${timerEnabled ? 'translate-x-4' : 'translate-x-1'}`}
                  ></span>
                </button>
                {/* Timer Slider */}
                <input
                  type="range"
                  min={5}
                  max={300}
                  step={5}
                  value={timerSeconds}
                  onChange={e => setTimerSeconds(Number(e.target.value))}
                  className="flex-1 accent-orange-500"
                  disabled={!timerEnabled}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>5s</span><span>1m</span><span>3m</span><span>5m</span>
              </div>
            </div>

            {/* Game URL Section */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invite Friends</span>
              </div>
              <div className="flex rounded-md shadow-sm">
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    readOnly
                    value={(inviteUrl ?? '')}
                    className="block w-full rounded-none rounded-l-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 text-sm py-2 px-3 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className={`inline-flex items-center px-3 py-2 border border-l-0 text-sm font-medium rounded-r-md ${
                    isCopied 
                      ? 'bg-green-500 text-white border-green-500' 
                      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-700'
                  }`}
                  disabled={isLoading}
                >
                  {isCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Share this link with friends to play together
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 text-sm flex items-center gap-2"
                onClick={handleStart}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Starting...
                  </>
                ) : 'Play Game'}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FriendsGameModal;
