import React from 'react';
import { Crown, AlertTriangle } from 'lucide-react';

interface LevelResultBannerProps {
  passed: boolean;
  unlockedLevel?: number;
}

const LevelResultBanner: React.FC<LevelResultBannerProps> = ({ passed, unlockedLevel }) => {
  return (
    <div className={`w-full max-w-3xl mx-auto rounded-xl p-4 border ${passed ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-100' : 'bg-red-600/20 border-red-600/40 text-red-100'}`}>
      <div className="flex items-center gap-3">
        {passed ? (
          <Crown className="h-6 w-6 text-emerald-300" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-red-300" />
        )}
        <div>
          <div className="text-lg font-semibold">
            {passed
              ? (typeof unlockedLevel === 'number' ? `You Passed! Level ${unlockedLevel} Unlocked` : 'You Passed!')
              : 'Level Failed. Try Again'}
          </div>
          <div className="text-sm text-gray-300">
            {passed
              ? 'You met both requirements. Your progress has been saved.'
              : 'Meet both requirements to level up: overall net ≥ 50% and any round ≥ 70% net.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelResultBanner;
