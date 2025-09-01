import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Clock, Calendar, Award } from 'lucide-react';
import type { LevelConstraints } from '@/lib/levelUpConfig';

interface LevelUpIntroProps {
  onStart: () => void;
  // Optional close handler (when shown from HUD)
  onClose?: () => void;
  // Loading state (e.g., while preloading images)
  isLoading?: boolean;
  // Level constraints from levelUpConfig
  constraints?: LevelConstraints;
  // Optional explicit level prop (for compatibility with existing callers)
  level?: number;
  // Live performance metrics (derived from actual round results)
  currentOverallNetPct?: number; // 0..100
  bestRoundNetPct?: number; // 0..100
  // When true, render without standalone panel styling to embed in a parent modal
  embedded?: boolean;
}

const LevelUpIntro: React.FC<LevelUpIntroProps> = ({ 
  onStart, 
  onClose, 
  isLoading = false,
  constraints,
  level: levelProp,
  currentOverallNetPct,
  bestRoundNetPct,
  embedded = false,
}) => {
  useEffect(() => {
    if ((import.meta as any)?.env?.DEV) {
      try {
        console.log('[LevelUp][Intro] show', { constraints });
      } catch {}
    }
  }, [constraints]);

  if (!constraints) {
    return (
      <div className={
        embedded
          ? 'w-full'
          : 'w-full max-w-md bg-[#111] text-white rounded-2xl shadow-2xl p-6 border border-[#2a2a2a]'
      }>
        <div className="flex items-center justify-center h-40">
          <div className="animate-pulse text-gray-400">Loading level data...</div>
        </div>
      </div>
    );
  }

  const {
    level,
    timerSec,
    levelYearRange,
    requiredOverallAccuracy,
    requiredRoundAccuracy,
    requiredQualifyingRounds
  } = constraints;

  const displayLevel = levelProp ?? level;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs === 0 ? `${mins}m` : `${mins}m ${secs}s`;
  };

  return (
    <div
      className={
        embedded
          ? 'w-full'
          : 'w-full max-w-md bg-[#111] text-white rounded-2xl shadow-2xl p-5 border border-pink-500/40'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 text-pink-300 text-center">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-lg font-bold text-center">Level Up Mode • Level {displayLevel}</h2>
      </div>

      <p className="mt-2 text-[13px] text-gray-200 text-center">
        Advance to the next level by meeting both requirements
      </p>

      {/* Requirements title */}
      <h3 className="mt-4 text-pink-400 font-bold text-xl">Requirements</h3>

      {/* Requirement: Overall net accuracy */}
      <div
        className={
          embedded
            ? 'mt-4 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-white/10 p-4'
            : 'mt-4 rounded-xl bg-[#1b1b1b] border border-[#2a2a2a] p-4'
        }
      >
        <div className="flex items-start gap-3">
          <Target className="h-5 w-5 text-pink-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-[15px]">
              Overall net accuracy ≥ <span className="text-pink-300">{requiredOverallAccuracy}%</span>
            </div>
            <div className="text-xs text-gray-300 mt-1">
              Your final average must be at least {requiredOverallAccuracy}% after hint penalties.
            </div>
            {typeof currentOverallNetPct === 'number' && (
              <div className="mt-3">
                <div className="h-2 rounded bg-[#2d2d2d] overflow-hidden">
                  <div
                    className="h-full bg-pink-500"
                    style={{ width: `${Math.max(0, Math.min(100, currentOverallNetPct))}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-300">
                  Current: <span className="text-pink-300 font-medium">{Math.round(currentOverallNetPct)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirement: Any round threshold */}
      <div
        className={
          embedded
            ? 'mt-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-white/10 p-4'
            : 'mt-3 rounded-xl bg-[#1b1b1b] border border-[#2a2a2a] p-4'
        }
      >
        <div className="flex items-start gap-3">
          <Award className="h-5 w-5 text-pink-400 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-[15px]">
              Any round ≥ <span className="text-pink-300">{requiredRoundAccuracy}%</span> net
            </div>
            <div className="text-xs text-gray-300 mt-1">
              At least one round must reach {requiredRoundAccuracy}% or higher after penalties.
            </div>
            {typeof bestRoundNetPct === 'number' && (
              <div className="mt-2 text-xs text-gray-300">
                Best: <span className="text-pink-300 font-medium">{Math.round(bestRoundNetPct)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Parameters title */}
      <h3 className="mt-5 text-pink-400 font-bold text-xl">Parameters</h3>

      {/* Timer card */}
      <div
        className={
          embedded
            ? 'mt-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-white/10 p-4'
            : 'mt-3 rounded-xl bg-[#1b1b1b] border border-[#2a2a2a] p-4'
        }
      >
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-pink-400" />
          <div className="font-semibold text-[15px]">
            Timer: <span className="text-pink-300">{timerSec}s</span>
          </div>
        </div>
      </div>

      {/* Year range card */}
      <div
        className={
          embedded
            ? 'mt-3 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-white/10 p-4'
            : 'mt-3 rounded-xl bg-[#1b1b1b] border border-[#2a2a2a] p-4'
        }
      >
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-pink-400" />
          <div className="font-semibold text-[15px]">
            Year range: <span className="text-pink-300">{levelYearRange.start} — {levelYearRange.end}</span>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-5">
        {onClose && (
          <Button
            onClick={() => {
              if ((import.meta as any)?.env?.DEV) {
                try { console.log('[LevelUp][Intro] close'); } catch {}
              }
              onClose();
            }}
            className="w-full px-6 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors"
            disabled={isLoading}
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
};

export default LevelUpIntro;
