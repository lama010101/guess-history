import React from 'react';
import { Crown, AlertTriangle } from 'lucide-react';

interface LevelResultBannerProps {
  passed: boolean;
}

const LevelResultBanner: React.FC<LevelResultBannerProps> = ({ passed }) => {
  return (
    <div className={`w-full max-w-3xl mx-auto rounded-xl p-4 border ${passed ? 'bg-[#1f1f1f] border-[#333] text-white' : 'bg-[#2b1f24] border-[#4b2530] text-white'}`}>
      <div className="flex items-center gap-3">
        {passed ? (
          <Crown className="h-6 w-6 text-pink-300" />
        ) : (
          <AlertTriangle className="h-6 w-6 text-pink-300" />
        )}
        <div>
          <div className="text-lg font-semibold">
            {passed ? 'Level Passed! Next Level Unlocked' : 'Level Failed. Try Again'}
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
