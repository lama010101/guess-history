import React from 'react';
import { Zap } from 'lucide-react';
import { HintDebt } from '@/utils/results/types';
import { HINT_TYPE_NAMES } from '@/constants/hints';

interface HintDebtsCardProps {
  hintDebts: HintDebt[];
}

// Helper to get hint label if not present in debt object
const getHintLabel = (hintId: string): string => {
  return HINT_TYPE_NAMES[hintId] || hintId;
};

const HintDebtsCard: React.FC<HintDebtsCardProps> = ({ hintDebts }) => {
  if (!hintDebts || hintDebts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-[#202020] rounded-2xl shadow-lg p-4">
      <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center mb-3">
        <Zap className="mr-2 h-4 w-4" />
        Hint Penalties
      </h2>
      <ul className="space-y-2">
        {hintDebts.map((debt, index) => (
          <li key={index} className="flex justify-between items-center text-sm p-2 rounded-md bg-gray-100 dark:bg-transparent">
            <span>{debt.label || getHintLabel(debt.hintId)}</span>
            <div className="flex items-center gap-3">
              {debt.xpDebt > 0 && <span className="font-semibold text-red-500">-{debt.xpDebt} XP</span>}
              {debt.accDebt > 0 && <span className="font-semibold text-red-500">-{debt.accDebt}%</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HintDebtsCard;
