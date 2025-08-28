import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Trophy } from 'lucide-react';

interface LevelUpIntroProps {
  onStart: () => void;
}

const LevelUpIntro: React.FC<LevelUpIntroProps> = ({ onStart }) => {
  return (
    <div className="w-full max-w-lg bg-[#1f1f1f] text-white rounded-2xl shadow-2xl p-6 border border-[#333]">
      <div className="flex items-center gap-2 text-pink-300">
        <Sparkles className="h-5 w-5" />
        <h2 className="text-xl font-bold">Level Up Mode</h2>
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

      <div className="mt-6 flex justify-center">
        <Button onClick={onStart} className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-100">
          Start Round 1
        </Button>
      </div>
    </div>
  );
};

export default LevelUpIntro;
