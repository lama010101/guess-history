import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Trophy } from 'lucide-react';

interface LevelUpIntroProps {
  onStart: () => void;
  // Optional close handler (when shown from HUD)
  onClose?: () => void;
  // Optional context for display/logging
  level?: number;
  constraints?: { minYear: number; maxYear: number; timerSeconds: number };
}

const LevelUpIntro: React.FC<LevelUpIntroProps> = ({ onStart, onClose, level, constraints }) => {
  useEffect(() => {
    if ((import.meta as any)?.env?.DEV) {
      try {
        console.log('[LevelUp][Intro] show', { level, constraints });
      } catch {}
    }
  }, [level, constraints]);

  return (
    <div className="w-full max-w-lg bg-[#1f1f1f] text-white rounded-2xl shadow-2xl p-6 border border-[#333]">
      <div className="flex items-center gap-2 text-pink-300">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-xl font-bold">Level Up Mode{typeof level === 'number' ? ` · Level ${level}` : ''}</h2>
      </div>

      <p className="mt-3 text-sm text-gray-200">
        Progress to the next level by meeting both requirements below.
      </p>

      <div className="mt-4 space-y-3">
        <div className="flex items-start gap-3 bg-[#2b2b2b] rounded-lg p-3">
          <Target className="h-5 w-5 text-pink-300 mt-0.5" />
          <div>
            <div className="font-semibold">Overall net accuracy ≥ 50%</div>
            <div className="text-sm text-gray-300">Your final average must be at least 50% after hint penalties.</div>
          </div>
        </div>
        <div className="flex items-start gap-3 bg-[#2b2b2b] rounded-lg p-3">
          <Trophy className="h-5 w-5 text-pink-300 mt-0.5" />
          <div>
            <div className="font-semibold">Any round ≥ 70% net</div>
            <div className="text-sm text-gray-300">At least one round must reach 70% or higher after penalties.</div>
          </div>
        </div>
      </div>

      {constraints && (
        <div className="mt-4 text-xs text-gray-300/90">
          <div className="flex items-center justify-between">
            <span>Timer</span>
            <span className="font-semibold text-pink-300">{constraints.timerSeconds}s</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Year range</span>
            <span className="font-semibold text-pink-300">{constraints.minYear} — {constraints.maxYear}</span>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-center gap-2">
        <Button
          onClick={() => {
            if ((import.meta as any)?.env?.DEV) {
              try { console.log('[LevelUp][Intro] start'); } catch {}
            }
            onStart();
          }}
          className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-100"
        >
          Start Round 1
        </Button>
        {onClose && (
          <Button
            onClick={() => {
              if ((import.meta as any)?.env?.DEV) {
                try { console.log('[LevelUp][Intro] close'); } catch {}
              }
              onClose();
            }}
            variant="ghost"
            className="px-4 py-2 rounded-full bg-transparent text-gray-200 hover:bg-white/10"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default LevelUpIntro;
