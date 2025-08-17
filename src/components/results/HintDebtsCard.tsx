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

// Helper to derive a human-readable hint label, preferring hint_type over hintId,
// with sensible defaults for generic categories and numeric sub-hints.
const getHintLabel = (hintType?: string, hintId?: string, unit?: 'years off' | 'km away' | null): string => {
  if (hintType && HINT_TYPE_NAMES[hintType]) return HINT_TYPE_NAMES[hintType];
  if (hintId && HINT_TYPE_NAMES[hintId]) return HINT_TYPE_NAMES[hintId];
  // Provide category-aware defaults for numeric sub-hints
  if (unit === 'years off') return 'Years From Event';
  if (unit === 'km away') return 'Distance to Landmark';
  if (hintType === 'when') return 'Time Hint';
  if (hintType === 'where') return 'Location Hint';
  // Fall back to the most informative available key
  return hintType || hintId || '';
};

// Determine if the hint is a numeric-valued hint and what unit to display (prefer hint_type)
const getNumericUnit = (hintKey?: string): 'years off' | 'km away' | null => {
  if (!hintKey) return null;
  const id = hintKey.toLowerCase();
  if (id.includes('event_years') || id.endsWith('_years') || id.includes('when_event_years')) return 'years off';
  if (id.includes('landmark_km') || id.endsWith('_km') || id.includes('where_landmark_km')) return 'km away';
  return null;
};

// Heuristic to detect UUID-like labels or otherwise non-human-friendly IDs
const looksLikeId = (s?: string): boolean => {
  if (!s) return true;
  const t = s.trim();
  // UUID v4-ish or long hex with dashes
  return /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(t) || (t.length > 24 && /[0-9a-f]/i.test(t) && t.includes('-'));
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
                const labelIsNumeric = /^\d+$/.test(raw);
                let unit = getNumericUnit(debt.hint_type || debt.hintId);
                // If we couldn't infer unit from keys, but the category is known, derive it from category for numeric-style debts
                if (!unit && (debt.hint_type === 'when' || debt.hint_type === 'where')) {
                  unit = debt.hint_type === 'when' ? 'years off' : 'km away';
                }
                // Prefer human title from map when label is missing or looks like an ID
                const title = looksLikeId(raw) || labelIsNumeric || raw === '' ? getHintLabel(debt.hint_type, debt.hintId, unit) : raw;
                // Determine value: prefer numeric label; otherwise fallback from props by unit
                let value: number | null = null;
                if (labelIsNumeric) {
                  value = parseInt(raw, 10);
                } else if (unit === 'years off' && yearDifference != null) {
                  value = Math.abs(yearDifference);
                } else if (unit === 'km away' && distanceKm != null) {
                  value = Math.abs(Math.round(distanceKm));
                }
                return (
                  <>
                    <span>{title}</span>
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
