import React from 'react';
import { Zap } from 'lucide-react';
import { HintDebt } from '@/utils/results/types';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { formatInteger } from '@/utils/format';

interface HintDebtsCardProps {
  hintDebts: HintDebt[];
  yearDifference?: number | null;
  distanceKm?: number | null;
}

// Helper to get hint label if not present in debt object
const getHintLabel = (hintId: string): string => {
  return HINT_TYPE_NAMES[hintId] || hintId;
};

// Determine if the hint is a numeric-valued hint and what unit to display
const getNumericUnit = (hintId?: string): 'years off' | 'km away' | null => {
  if (!hintId) return null;
  const id = hintId.toLowerCase();
  if (id.includes('event_years') || id.endsWith('_years') || id.includes('when_event_years')) return 'years off';
  if (id.includes('landmark_km') || id.endsWith('_km') || id.includes('where_landmark_km')) return 'km away';
  return null;
};

const HintDebtsCard: React.FC<HintDebtsCardProps> = ({ hintDebts, yearDifference = null, distanceKm = null }) => {
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
            <div className="flex items-center">
              {(() => {
                const raw = (debt.label || '').trim();
                const isNum = /^\d+$/.test(raw);
                const title = isNum ? getHintLabel(debt.hintId) : (debt.label || getHintLabel(debt.hintId));
                const unit = isNum ? getNumericUnit(debt.hintId) : null;
                return (
                  <>
                    <span>{title}</span>
                    {isNum && unit && (
                      <span className="ml-1 text-muted-foreground">{formatInteger(parseInt(raw, 10))} {unit}</span>
                    )}
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-3">
              {debt.xpDebt > 0 && <span className="font-semibold text-red-500">-{debt.xpDebt} XP</span>}
              {debt.accDebt > 0 && (
                <span className="font-semibold text-red-500">
                  -{debt.accDebt}%
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HintDebtsCard;
