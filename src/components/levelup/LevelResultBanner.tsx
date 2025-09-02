import React from 'react';
import { Crown, AlertTriangle } from 'lucide-react';

interface LevelResultBannerProps {
  passed: boolean;
  unlockedLevel?: number;
}

const LevelResultBanner: React.FC<LevelResultBannerProps> = ({ passed, unlockedLevel }) => {
  return (
    <div className={`w-full max-w-3xl mx-auto rounded-xl p-4 border ${passed ? 'bg-gradient-to-b from-emerald-600 to-emerald-700 border-emerald-500 text-white' : 'bg-gradient-to-b from-red-600 to-red-700 border-red-500 text-white'}`}>
      <div className="flex items-center gap-3">
        {passed ? (
          <Crown className="h-6 w-6 text-white/90" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-white/90" />
        )}
        <div>
          <div className="text-lg font-semibold">
            {passed
              ? (typeof unlockedLevel === 'number' ? `You Passed! Level ${unlockedLevel} Unlocked` : 'You Passed!')
              : 'Level Failed. Try Again'}
          </div>
          <div className="text-sm text-white/90">
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
