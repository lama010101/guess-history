import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface LevelRequirementCardProps {
  title: string;
  met: boolean;
  valuePercent: number; // numeric percent to emphasize
  targetLabel: string;  // e.g. "Target > 50%"
  icon?: React.ReactNode;
}

const LevelRequirementCard: React.FC<LevelRequirementCardProps> = ({ title, met, valuePercent, targetLabel, icon }) => {
  const valueColor = met ? 'text-emerald-400' : 'text-red-400';
  const borderColor = met ? 'border-emerald-700/40' : 'border-red-700/40';
  const bgColor = 'bg-black/30';
  return (
    <div className={`flex items-center justify-between rounded-xl p-4 border w-full max-w-3xl mx-auto ${bgColor} ${borderColor} text-white`}>
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="h-6 w-6 opacity-90 flex items-center justify-center">{icon}</div>
        ) : (
          met ? <CheckCircle2 className="h-5 w-5 text-emerald-300" /> : <XCircle className="h-5 w-5 text-red-300" />
        )}
        <div className="text-base font-medium">
          {title}
          <span> = </span>
          <span className={`font-semibold ${valueColor}`}>{Math.round(valuePercent)}%</span>
        </div>
      </div>
      <div className="text-sm text-gray-300 whitespace-nowrap">{targetLabel}</div>
    </div>
  );
};

export default LevelRequirementCard;
