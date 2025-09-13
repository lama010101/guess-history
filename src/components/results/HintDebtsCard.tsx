import React from 'react';
import { Zap } from 'lucide-react';
import { HintDebt } from '@/utils/results/types';
import { HINT_TYPE_NAMES } from '@/constants/hints';
import { formatInteger, kmToMi } from '@/utils/format';
import { useSettingsStore } from '@/lib/useSettingsStore';

interface HintDebtsCardProps {
  hintDebts: HintDebt[];
  yearDifference?: number | null;
  distanceKm?: number | null;
}

// Helper to derive a human-readable hint label.
// Preference order: specific mapping via hintId → mapping via hintType →
// base/prefix ID match → cost-based inference (xp/acc + category) →
// inferred titles from the raw label (Century/Continent/Decade) →
// category defaults for numeric-only sub-hints → generic category fallback.
const getHintLabel = (
  hintType?: string,
  hintId?: string,
  rawLabel?: string,
  unit?: 'years off' | 'km away' | null,
  labelIsNumeric?: boolean,
  xpDebt?: number,
  accDebt?: number
): string => {
  // Try specific mappings
  if (hintId && HINT_TYPE_NAMES[hintId]) return HINT_TYPE_NAMES[hintId];
  if (hintType && HINT_TYPE_NAMES[hintType]) return HINT_TYPE_NAMES[hintType];
  
  // Debug logging to see what's actually being passed
  console.log('HintDebtsCard getHintLabel debug:', { hintId, hintType, rawLabel, availableKeys: Object.keys(HINT_TYPE_NAMES).filter(k => k.includes('where') || k.includes('when')).slice(0, 10) });
  
  // Try partial matching for hint IDs that might have suffixes (e.g., with image ID)
  if (hintId) {
    // Extract base hint type by removing image ID suffix (everything after the last dash)
    const baseHintId = hintId.includes('-') ? hintId.substring(0, hintId.lastIndexOf('-')) : hintId;
    
    // Try exact match with base hint ID first
    if (HINT_TYPE_NAMES[baseHintId]) {
      console.log('Found base match:', baseHintId, 'for hintId:', hintId);
      return HINT_TYPE_NAMES[baseHintId];
    }
    
    // Try prefix matching as fallback
    const prefixMatch = Object.keys(HINT_TYPE_NAMES).find(key => hintId.startsWith(key));
    if (prefixMatch) {
      console.log('Found prefix match:', prefixMatch, 'for hintId:', hintId);
      return HINT_TYPE_NAMES[prefixMatch];
    }
  }

  const raw = (rawLabel || '').trim();

  // Cost-based inference: map known XP/ACC combinations to specific titles per category
  // This recovers specificity when DB only stores generic hint_type ('where' | 'when').
  if (typeof xpDebt === 'number' && typeof accDebt === 'number') {
    const type = (hintType || '').toLowerCase();
    if (type === 'where') {
      if (xpDebt === 50 && accDebt === 5) return 'Region';
      if (xpDebt === 20 && accDebt === 2) return 'Remote Landmark';
      if (xpDebt === 30 && accDebt === 3) return 'Nearby Landmark';
      if (xpDebt === 40 && accDebt === 4) return 'Geographical Clues';
      if (xpDebt === 10 && accDebt === 1) {
        // Distinguish continent vs landmark distance
        if (labelIsNumeric || unit === 'km away') return 'Distance to Landmark';
        // If the label is a known continent, handled below by continent heuristic.
      }
    }
    if (type === 'when') {
      if (xpDebt === 50 && accDebt === 5) return 'Decade';
      if (xpDebt === 20 && accDebt === 2) return 'Distant Event';
      if (xpDebt === 30 && accDebt === 3) return 'Recent Event';
      if (xpDebt === 40 && accDebt === 4) return 'Temporal Clues';
      if (xpDebt === 10 && accDebt === 1) {
        // Differentiate century vs years-from-event below via heuristics
        if (labelIsNumeric || unit === 'years off') return 'Years From Event';
      }
    }
  }

  // Infer well-known titles from the raw answer where safe
  const isCentury = hintType === 'when' && (
    /^[0-9]{1,2}(st|nd|rd|th)$/i.test(raw) ||
    /\b[0-9]{1,2}(st|nd|rd|th)?\s*century\b/i.test(raw)
  );
  if (isCentury) return 'Century';

  const isDecade = hintType === 'when' && /(^|\b)[0-9]{3,4}s\b/i.test(raw);
  if (isDecade) return 'Decade';

  const CONTINENTS = new Set([
    'Africa',
    'Antarctica',
    'Asia',
    'Europe',
    'North America',
    'South America',
    'Oceania',
    'Australia'
  ]);
  const isContinent = hintType === 'where' && CONTINENTS.has(raw);
  if (isContinent) return 'Continent';

  // Provide category-aware defaults ONLY for numeric sub-hints
  if (labelIsNumeric && unit === 'years off') return 'Years From Event';
  if (labelIsNumeric && unit === 'km away') return 'Distance to Landmark';

  // Generic category fallback as last resort
  if (hintType === 'when') return 'Time Hint';
  if (hintType === 'where') return 'Location Hint';
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
  const distanceUnit = useSettingsStore(s => s.distanceUnit);
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
            <div className="flex items-center min-w-0">
              {(() => {
                const raw = (debt.label || '').trim();
                const labelIsNumeric = /^\d+$/.test(raw);
                let unit = getNumericUnit(debt.hint_type || debt.hintId);
                // For answer formatting only: if label is numeric and no unit inferred from keys,
                // fall back to category so we can show years/km appropriately.
                if (!unit && labelIsNumeric && (debt.hint_type === 'when' || debt.hint_type === 'where')) {
                  unit = debt.hint_type === 'when' ? 'years off' : 'km away';
                }
                // Always use a human-friendly label based on hint_type/hintId/raw
                const title = getHintLabel(debt.hint_type, debt.hintId, raw, unit, labelIsNumeric, debt.xpDebt, debt.accDebt);
                // Determine numeric fallback value from raw or props
                let value: number | null = null;
                if (labelIsNumeric) {
                  value = parseInt(raw, 10);
                  if (unit === 'km away' && distanceUnit === 'mi' && Number.isFinite(value)) {
                    value = Math.round(kmToMi(value) );
                  }
                } else if (unit === 'years off' && yearDifference != null) {
                  value = Math.abs(yearDifference);
                } else if (unit === 'km away' && distanceKm != null) {
                  const baseKm = Math.abs(distanceKm);
                  value = distanceUnit === 'mi' ? Math.round(kmToMi(baseKm)) : Math.round(baseKm);
                }
                // Build answer string: prefer a readable raw label; otherwise numeric value with units
                let answer: string;
                if (!looksLikeId(raw) && raw !== '' && !labelIsNumeric) {
                  // Non-numeric, human-friendly answer (e.g., '20th', 'Europe')
                  answer = raw;
                } else if (value != null) {
                  if (unit === 'years off') {
                    answer = `${formatInteger(value)} ${value === 1 ? 'year' : 'years'}`;
                  } else if (unit === 'km away') {
                    const label = distanceUnit === 'mi' ? 'mi' : 'km';
                    answer = `${formatInteger(value)} ${label}`;
                  } else {
                    answer = `${formatInteger(value)}`;
                  }
                } else {
                  // Last resort: show raw if available, else repeat title
                  answer = raw || title;
                }
                return (
                  <div className="truncate">
                    <span className="text-foreground font-medium">{title}</span>
                    <span className="mx-2 text-muted-foreground">·</span>
                    <span className="text-foreground">{answer}</span>
                  </div>
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
