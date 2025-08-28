import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface LevelRequirementCardProps {
  title: string;
  met: boolean;
  currentLabel: string; // e.g. "Current: 48%"
  targetLabel: string;  // e.g. "Target: ≥ 50%"
}

const LevelRequirementCard: React.FC<LevelRequirementCardProps> = ({ title, met, currentLabel, targetLabel }) => {
  return (
    <div className="flex items-start gap-3 bg-[#1f1f1f] text-white rounded-xl p-4 border border-[#333] w-full max-w-3xl mx-auto">
      {met ? (
        <CheckCircle2 className="h-5 w-5 text-pink-300 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-300 mt-1 flex items-center gap-3">
          <span>{currentLabel}</span>
          <span className="opacity-50">•</span>
          <span>{targetLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default LevelRequirementCard;
