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
    <div className={`flex items-start gap-3 rounded-xl p-4 border w-full max-w-3xl mx-auto ${met ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-100' : 'bg-red-600/20 border-red-600/40 text-red-100'}`}>
      {met ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-300 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-red-300 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm opacity-90 mt-1 flex items-center gap-3">
          <span>{currentLabel}</span>
          <span className="opacity-50">•</span>
          <span>{targetLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default LevelRequirementCard;
