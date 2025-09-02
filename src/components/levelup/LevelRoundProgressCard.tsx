import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface LevelRoundProgressCardProps {
  roundIndex: number; // 0-based
  netPercent: number; // 0-100
}

const LevelRoundProgressCard: React.FC<LevelRoundProgressCardProps> = ({ roundIndex, netPercent }) => {
  const met = netPercent >= 70;
  return (
    <div className="w-full max-w-md mx-auto bg-[#1f1f1f] text-white rounded-xl p-4 border border-[#333]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">Level Up Progress</div>
        <div className="text-xs text-gray-400">Round {roundIndex + 1}</div>
      </div>
      <div className="flex items-center gap-3">
        <CheckCircle2 className={`h-5 w-5 ${met ? 'text-green-500' : 'text-red-500'}`} />
        <div className="flex-1">
          <div className="text-sm font-medium">
            {met ? (
              <>You passed the round with {Math.round(netPercent)}%</>
            ) : (
              <>This round: {Math.round(netPercent)}%</>
            )}
          </div>
          <div className="mt-2 w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${met ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.max(0, Math.min(100, Math.round(netPercent)))}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-300">Requirement ≥ 70% net</div>
        </div>
      </div>
    </div>
  );
};

export default LevelRoundProgressCard;
