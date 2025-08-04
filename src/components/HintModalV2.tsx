import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
const lockIcon = '/icons/lock.webp';
import { HINT_COSTS, HINT_TYPE_NAMES } from '@/constants/hints';
import { Hint } from '@/hooks/useHintV2';

interface HintModalV2Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableHints: Hint[];
  purchasedHintIds: string[];
  xpDebt: number;
  accDebt: number;
  onPurchaseHint: (hintId: string) => Promise<void>;
  isLoading: boolean;
}

const getHintCostAndPenalty = (hintType: string): { xp: number, acc: number } => {
  const keyMap: Record<string, keyof typeof HINT_COSTS> = {
    '1_where_continent': 'continent',
    '1_when_century': 'century',
    '2_where_landmark': 'distantLandmark',
    '2_where_landmark_km': 'distantDistance',
    '2_when_event': 'distantEvent',
    '2_when_event_years': 'distantTimeDiff',
    '3_where_region': 'region',
    '3_when_decade': 'narrowDecade',
    '4_where_landmark': 'nearbyLandmark',
    '4_where_landmark_km': 'nearbyDistance',
    '4_when_event': 'contemporaryEvent',
    '4_when_event_years': 'closeTimeDiff',
    '5_where_clues': 'locationClues',
    '5_when_clues': 'dateClues',
  };
  const key = keyMap[hintType] || hintType as keyof typeof HINT_COSTS;
  return HINT_COSTS[key] || { xp: 0, acc: 0 };
};

const HintModalV2 = ({
  isOpen,
  onOpenChange,
  availableHints,
  purchasedHintIds,
  xpDebt,
  accDebt,
  onPurchaseHint,
  isLoading,
}: HintModalV2Props) => {
  const [purchasingHintId, setPurchasingHintId] = useState<string | null>(null);

  const isHintPurchased = (hintId: string): boolean => purchasedHintIds.includes(hintId);

  const HINT_DEPENDENCIES: Record<string, string | null> = {
    '2_where_landmark_km': '2_where_landmark',
    '2_when_event_years': '2_when_event',
    '4_where_landmark_km': '4_where_landmark',
    '4_when_event_years': '4_when_event',
  };

  const getHintState = (hint: Hint): 'purchased' | 'locked' | 'available' => {
    if (isHintPurchased(hint.id)) return 'purchased';
    const dependencyType = HINT_DEPENDENCIES[hint.type];
    if (dependencyType) {
      const dependencyHint = availableHints.find(h => h.type === dependencyType);
      if (dependencyHint && !isHintPurchased(dependencyHint.id)) return 'locked';
    }
    return 'available';
  };

  const handlePurchaseHint = async (hint: Hint) => {
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
    const when: Hint[] = [];
    const where: Hint[] = [];
    availableHints.forEach(hint => {
      if (hint.type.includes('when') || hint.type.includes('century') || hint.type.includes('decade')) {
        when.push(hint);
      } else {
        where.push(hint);
      }
    });
    // Sort by level
    when.sort((a, b) => a.level - b.level);
    where.sort((a, b) => a.level - b.level);
    return { when, where };
  }, [availableHints]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full mx-auto bg-black p-6 rounded-lg shadow-lg border border-gray-700">
        <DialogHeader className="text-center mb-4">
          <DialogTitle className="text-2xl font-bold text-white">HINTS</DialogTitle>
        </DialogHeader>

        <div className="flex justify-around mb-6 text-sm">
          <div className="text-center">
            <p className="text-gray-400">Accuracy Penalty</p>
            <Badge className="mt-1 text-base bg-blue-900 text-blue-200 border border-blue-700">{accDebt}%</Badge>
          </div>
          <div className="text-center">
            <p className="text-gray-400">Experience Penalty</p>
            <Badge className="mt-1 text-base bg-green-900 text-green-200 border border-green-700">+{xpDebt} XP</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4">
          <h3 className="text-center text-lg font-semibold mb-2 text-white">WHEN</h3>
          <h3 className="text-center text-lg font-semibold mb-2 text-white">WHERE</h3>
          
          <div className="space-y-3">
            {hintsByColumn.when.map(hint => (
              <HintButtonUI key={hint.id} hint={hint} hintState={getHintState(hint)} onPurchase={handlePurchaseHint} isLoading={isLoading || purchasingHintId === hint.id} />
            ))}
          </div>

          <div className="space-y-3">
            {hintsByColumn.where.map(hint => (
              <HintButtonUI key={hint.id} hint={hint} hintState={getHintState(hint)} onPurchase={handlePurchaseHint} isLoading={isLoading || purchasingHintId === hint.id} />
            ))}
          </div>
        </div>

        <div className="pt-6 mt-4">
          <Button size="lg" className="w-full bg-gray-200 text-black hover:bg-gray-300" onClick={() => onOpenChange(false)}>
            Continue Guessing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const HintButtonUI: React.FC<{ 
  hint: Hint; 
  hintState: 'purchased' | 'locked' | 'available';
  isLoading: boolean;
  onPurchase: (hint: Hint) => void;
}> = ({ hint, hintState, isLoading, onPurchase }) => {
  const { xp: costXp, acc: penaltyAcc } = getHintCostAndPenalty(hint.type);
  const label1 = HINT_TYPE_NAMES[hint.type] ?? hint.type.replace(/_\d+|_/g, ' ').replace(/\b(when|where)\b/g, '').trim();
  const label2 = `-${penaltyAcc}% -${costXp}XP`;

  const isPurchased = hintState === 'purchased';
  const isLocked = hintState === 'locked';

  return (
    <Button
      size="lg"
      variant={'outline'}
      disabled={isLoading || isLocked || isPurchased}
      className={`w-full py-3 text-base font-semibold flex items-center justify-center rounded-full h-auto whitespace-normal break-words leading-tight
        ${isPurchased 
            ? 'bg-green-600 text-white border-transparent'
            : 'bg-black text-white border-gray-600 hover:bg-gray-800'
        }
        ${isLocked ? 'cursor-not-allowed !bg-gray-700 !text-gray-400 border-transparent opacity-70' : ''}`
      }
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (hintState === 'available') onPurchase(hint);
      }}
      title={isLocked ? 'Unlock prerequisite first' : label1}
    >
      {isPurchased ? (
        <span>{hint.text}</span>
      ) : isLocked ? (
        <span className="flex items-center justify-center gap-2">
          <img src={lockIcon} alt="Locked" className="h-4 w-4 shrink-0 invert" />
          <span className="flex flex-col items-center">
            <span className="capitalize">{label1}</span>
            <span className="text-xs text-gray-400 font-normal">{label2}</span>
          </span>
        </span>
      ) : (
        <span className="flex flex-col items-center">
          <span className="capitalize">{label1}</span>
          <span className="text-xs text-gray-400 font-normal">{label2}</span>
        </span>
      )}
    </Button>
  );
};

export default HintModalV2;
