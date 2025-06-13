import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
// import { useAuth } from '@/contexts/AuthContext'; // To be used later for fetching/saving settings
// import { supabase } from '@/lib/supabaseClient'; // To be used later

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: () => void;
}

// Placeholder settings structure - adjust based on actual settings
interface GameSettings {
  theme?: 'light' | 'dark' | 'system';
  soundEffects?: boolean;
  music?: boolean;
  // Add other global game settings here
}

const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, onSettingsUpdated }) => {
  const [hintsPerGame, setHintsPerGame] = React.useState(3);
  const [timerEnabled, setTimerEnabled] = React.useState(true);
  const [timerSeconds, setTimerSeconds] = React.useState(60); // 1 min
  const [initialState, setInitialState] = React.useState({ hintsPerGame: 3, timerEnabled: true, timerSeconds: 60 });

  React.useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('globalGameSettings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setHintsPerGame(parsed.hintsPerGame ?? 3);
          setTimerEnabled(parsed.timerEnabled ?? true);
          setTimerSeconds(parsed.timerSeconds ?? 60);
          setInitialState({
            hintsPerGame: parsed.hintsPerGame ?? 3,
            timerEnabled: parsed.timerEnabled ?? true,
            timerSeconds: parsed.timerSeconds ?? 60,
          });
        } catch {
          setHintsPerGame(3);
          setTimerEnabled(true);
          setTimerSeconds(60);
          setInitialState({ hintsPerGame: 3, timerEnabled: true, timerSeconds: 60 });
        }
      } else {
        setHintsPerGame(3);
        setTimerEnabled(true);
        setTimerSeconds(60);
        setInitialState({ hintsPerGame: 3, timerEnabled: true, timerSeconds: 60 });
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

  const handleSave = () => {
    localStorage.setItem('globalGameSettings', JSON.stringify({
      hintsPerGame,
      timerEnabled,
      timerSeconds,
    }));
    onClose();
    if (onSettingsUpdated) {
      onSettingsUpdated();
    }
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
                  max={15}
                  value={hintsPerGame}
                  onChange={e => setHintsPerGame(Number(e.target.value))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span><span>5</span><span>10</span><span>15</span>
                </div>
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

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-md bg-orange-500 text-white font-semibold hover:bg-orange-600 text-sm"
                onClick={handleSave}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSettingsModal;
