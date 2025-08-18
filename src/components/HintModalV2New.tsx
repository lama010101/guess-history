import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, X } from 'lucide-react';

import { HINT_TYPE_NAMES, HINT_DEPENDENCIES, HINT_LEVEL_DESCRIPTIONS, HINT_TYPE_DESCRIPTIONS } from '@/constants/hints';
import { formatInteger } from '@/utils/format';

interface Hint {
  id: string;
  type: string;
  text: string;
  level: number;
  image_id: string;
  xp_cost: number;
  accuracy_penalty: number;
  prerequisite?: string;
}

interface HintModalV2NewProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableHints: Hint[];
  purchasedHintIds: string[];
  xpDebt: number;
  accDebt: number;
  onPurchaseHint: (hintId: string) => Promise<void>;
  isLoading: boolean;
}

const getHintCostAndPenalty = (hint: Hint): { xp: number, acc: number } => {
  return {
    xp: hint.xp_cost || 0,
    acc: hint.accuracy_penalty || 0
  };
};

// Helper: returns unit for numeric hints based on type
const getNumericUnitFromType = (type?: string): 'years off' | 'km away' | null => {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('event_years') || t.endsWith('_years') || t.includes('when_event_years')) return 'years off';
  if (t.includes('landmark_km') || t.endsWith('_km') || t.includes('where_landmark_km')) return 'km away';
  return null;
};

const HintButtonUI: React.FC<{ 
  hint: Hint; 
  purchasedHintIds: string[];
  isLoading: boolean;
  onPurchase: (hint: Hint) => void;
  isLocked: boolean;
}> = ({ hint, purchasedHintIds, isLoading, onPurchase, isLocked }) => {
  const [lockedClicked, setLockedClicked] = useState(false);
  const { xp: costXp, acc: penaltyAcc } = getHintCostAndPenalty(hint);
  const label1 = HINT_TYPE_NAMES[hint.type] ??
    hint.type.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/(when|where)/g, '').trim();

  const isPurchased = purchasedHintIds.includes(hint.id);

  return (
    <div className="relative">
      <button
        disabled={isLoading || isPurchased}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (isLocked) {
            setLockedClicked(true);
            return;
          }
          if (!isPurchased) onPurchase(hint);
        }}
        title={label1}
        className={`w-full rounded-md border border-[#2f2f2f] px-4 py-3 text-left flex items-center justify-between transition-colors
          ${isPurchased ? 'bg-[#3e9b0a] text-white' : 'bg-[#333333] text-white hover:bg-[#3a3a3a]'}
          ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="min-w-0">
          <div className={`font-semibold capitalize ${isPurchased ? '' : ''}`}>{label1}</div>
          {isPurchased ? (
            <div className="text-sm opacity-90 whitespace-normal break-words">
              {(() => {
                const raw = (hint.text || '').trim();
                const isNum = /^\d+$/.test(raw);
                const unit = isNum ? getNumericUnitFromType(hint.type) : null;
                if (isNum && unit) {
                  return `${formatInteger(parseInt(raw, 10))} ${unit}`;
                }
                return hint.text;
              })()}
            </div>
          ) : (
            <div className="text-xs text-gray-300 opacity-90 whitespace-normal break-words">
              {(() => {
                // Prefer unique, per-type copy
                const typeDesc = HINT_TYPE_DESCRIPTIONS[hint.type];
                if (typeDesc) return typeDesc;
                const unit = getNumericUnitFromType(hint.type);
                if (unit === 'years off') return 'Years from the chosen event';
                if (unit === 'km away') return 'Distance to the chosen landmark';
                return HINT_LEVEL_DESCRIPTIONS[hint.level] ?? '';
              })()}
            </div>
          )}
        </div>
        {!isPurchased && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-full bg-green-600 text-white text-xs font-semibold px-2 py-1">-{penaltyAcc}%</span>
            <span className="rounded-full bg-blue-600 text-white text-xs font-semibold px-2 py-1">-{costXp} XP</span>
          </div>
        )}
      </button>
      {isLocked && lockedClicked && (
        <p className="mt-1 text-xs text-red-500">You must first use the hint above</p>
      )}
    </div>
  );
};

const HintModalV2New: React.FC<HintModalV2NewProps> = ({
  isOpen,
  onOpenChange,
  availableHints,
  purchasedHintIds,
  xpDebt,
  accDebt,
  onPurchaseHint,
  isLoading,
}) => {
  const [purchasingHintId, setPurchasingHintId] = useState<string | null>(null);
  const [lockedInfoOpen, setLockedInfoOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'when' | 'where'>('when');

  const isHintPurchased = (hintId: string): boolean => purchasedHintIds.includes(hintId);

  // Dependencies are defined centrally in `src/constants/hints.ts`

  const getHintState = (hint: Hint): 'purchased' | 'locked' | 'available' => {
    if (isHintPurchased(hint.id)) return 'purchased';
    const dependencyType = HINT_DEPENDENCIES[hint.type];
    if (dependencyType) {
      const dependencyHint = availableHints.find(h => h.type === dependencyType);
      if (dependencyHint && !isHintPurchased(dependencyHint.id)) return 'locked';
    }
    return 'available';
  };

  const handlePurchase = async (hint: Hint) => {
    if (purchasingHintId) return;
    setPurchasingHintId(hint.id);
    try {
      await onPurchaseHint(hint.id);
    } catch (error) {
      console.error("Error purchasing hint:", error);
    } finally {
      setPurchasingHintId(null);
    }
  };

  const hintsByColumn = useMemo(() => {
    // Explicit UI order
    const whenOrder = [
      '1_when_century',
      '2_when_event',
      '2_when_event_years',
      '4_when_event',
      '4_when_event_years',
      '5_when_clues',
      '3_when_decade',
    ];
    const whereOrder = [
      '1_where_continent',
      '2_where_landmark',
      '2_where_landmark_km',
      '4_where_landmark',
      '4_where_landmark_km',
      '5_where_clues',
      '3_where_region',
    ];

    const byType = availableHints.reduce<Record<string, Hint[]>>((acc, h) => {
      (acc[h.type] ||= []).push(h);
      return acc;
    }, {});

    const pickInOrder = (order: string[], predicate: (t: string) => boolean): Hint[] => {
      const picked: Hint[] = [];
      const seen = new Set<string>();
      for (const t of order) {
        const arr = byType[t];
        if (arr && arr.length) {
          picked.push(...arr);
          seen.add(t);
        }
      }
      const rest = availableHints
        .filter(h => predicate(h.type) && !seen.has(h.type))
        .sort((a, b) => a.level - b.level || a.type.localeCompare(b.type));
      return [...picked, ...rest];
    };

    const isWhenType = (t: string) => t.includes('when') || t.includes('century') || t.includes('decade') || t === '5_when_clues';
    const when = pickInOrder(whenOrder, isWhenType);
    const where = pickInOrder(whereOrder, (t) => !isWhenType(t));

    return { when, where };
  }, [availableHints]);

  // Determine if a hint is locked based on central dependency map
  const isHintLocked = (hint: Hint): boolean => {
    const dependencyType = HINT_DEPENDENCIES[hint.type];
    if (dependencyType) {
      const dependencyHint = availableHints.find(h => h.type === dependencyType);
      if (dependencyHint && !isHintPurchased(dependencyHint.id)) return true;
    }
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 translate-x-0 translate-y-0 max-w-none h-screen w-screen bg-black text-white overflow-y-auto p-0 border-0">
        <DialogHeader className="sticky top-0 z-10 pt-4 pb-0 px-4 border-b border-gray-800 bg-black">
          <div className="relative flex items-center justify-center w-full">
            <DialogTitle className="text-2xl font-bold text-white">HINTS</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="absolute right-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md h-8 w-8"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <p className="text-gray-400 italic text-center text-sm mt-0">Using a hint will reduce your score.</p>
        </DialogHeader>

        <div className="p-4 pt-0">
          {/* Summary pills */}
          <div className="mt-0 rounded-lg border border-gray-800 bg-[#202020] p-3">
            <div className="flex justify-around text-sm">
              <div className="text-center">
                <p className="text-white">Accuracy Penalty</p>
                <Badge className="mt-1 text-base bg-green-600 text-white border border-green-700">-{accDebt}%</Badge>
              </div>
              <div className="text-center">
                <p className="text-white">Experience Penalty</p>
                <Badge className="mt-1 text-base bg-blue-600 text-white border border-blue-700">-{xpDebt} XP</Badge>
              </div>
            </div>
          </div>

          {/* Segmented control */}
          <div className="mt-3">
            <div className="flex w-full overflow-hidden border border-gray-800 bg-[#202020]">
              <button
                className={`flex-1 px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 rounded-[2px] ${activeTab === 'when' ? 'bg-white text-black' : 'text-gray-300'}`}
                onClick={() => setActiveTab('when')}
              >
                <Clock className="w-4 h-4" /> When
              </button>
              <button
                className={`flex-1 px-4 py-2 text-sm font-semibold flex items-center justify-center gap-2 rounded-[2px] ${activeTab === 'where' ? 'bg-white text-black' : 'text-gray-300'}`}
                onClick={() => setActiveTab('where')}
              >
                <MapPin className="w-4 h-4" /> Where
              </button>
            </div>
          </div>

          {/* Hint list for active tab */}
          <div className="mt-3 space-y-3">
            {(activeTab === 'when' ? hintsByColumn.when : hintsByColumn.where).map((hint) => (
              <HintButtonUI
                key={`${activeTab}-${hint.id}`}
                hint={hint}
                purchasedHintIds={purchasedHintIds}
                isLoading={isLoading || purchasingHintId === hint.id}
                onPurchase={handlePurchase}
                isLocked={isHintLocked(hint)}
              />
            ))}
          </div>

        </div>
  <div className="sticky bottom-0 z-10 p-4 border-t border-gray-800 bg-black">
  <Button 
    size="lg" 
    className="w-full bg-orange-600 text-white hover:bg-orange-700 font-semibold rounded-md" 
    onClick={() => onOpenChange(false)}
  >
    Continue Guessing
  </Button>
</div>
      </DialogContent>
      {/* Locked info popup retained for future use but not shown automatically */}
      <Dialog open={false} onOpenChange={setLockedInfoOpen}>
        <DialogContent className="max-w-sm bg-[#202020] text-white">
          <DialogHeader>
            <DialogTitle>Hint Locked</DialogTitle>
          </DialogHeader>
          <p className="text-sm">You must first use the related hint above.</p>
          <div className="mt-4">
            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700 rounded-md" onClick={() => setLockedInfoOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default HintModalV2New;
