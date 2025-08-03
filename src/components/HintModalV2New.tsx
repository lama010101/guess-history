import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import lockIcon from '@/assets/icons/lock.webp';
import { HINT_TYPE_NAMES } from '@/constants/hints';

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

const HintButtonUI: React.FC<{ 
  hint: Hint; 
  purchasedHintIds: string[];
  isLoading: boolean;
  onPurchase: (hint: Hint) => void;
}> = ({ hint, purchasedHintIds, isLoading, onPurchase }) => {
  const { xp: costXp, acc: penaltyAcc } = getHintCostAndPenalty(hint);
  const label1 = HINT_TYPE_NAMES[hint.type] ?? 
    hint.type.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/(when|where)/g, '').trim();
  const label2 = `-${penaltyAcc}% -${costXp}XP`;
  
  const isPurchased = purchasedHintIds.includes(hint.id);
  const isLocked = hint.prerequisite && !purchasedHintIds.includes(hint.prerequisite);

  return (
    <Button
      size="lg"
      variant={'outline'}
      disabled={isLoading || isLocked || isPurchased}
      className={`w-full py-3 text-base font-semibold flex items-center justify-center rounded-full h-auto whitespace-normal break-words leading-tight
        ${isPurchased 
            ? 'bg-[#3e9b0a] text-white border-transparent' // exact green for purchased
            : 'bg-white text-black border-gray-300 hover:bg-gray-100'
        }
        ${isLocked ? 'cursor-not-allowed !bg-gray-200 !text-gray-500 border-transparent opacity-70' : ''}`}
      style={isPurchased ? { backgroundColor: '#3e9b0a', color: '#fff' } : {}}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (!isPurchased && !isLocked) onPurchase(hint);
      }}
      title={isLocked ? 'Unlock prerequisite first' : label1}
    >
      {isPurchased ? (
        <span className="break-words whitespace-normal">
          {hint.type.includes('event_years') ? `${hint.text} years off` :
           hint.type.includes('landmark_km') ? `${hint.text} km away` :
           hint.text}
        </span>
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
    const when: Hint[] = [];
    const where: Hint[] = [];
    
    // Sort all hints by level
    const sortedHints = [...availableHints].sort((a, b) => a.level - b.level);
    
    sortedHints.forEach(hint => {
      if (hint.type.includes('when') || hint.type.includes('century') || hint.type.includes('decade') || hint.type === '5_when_clues') {
        when.push(hint);
      } else {
        where.push(hint);
      }
    });
    
    return { when, where };
  }, [availableHints]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen w-screen bg-black text-white flex flex-col">
        <DialogHeader className="p-4">
  <DialogTitle className="text-2xl font-bold text-white w-full flex justify-center items-center text-center">HINTS</DialogTitle>
</DialogHeader>

        <div className="flex-grow overflow-y-auto px-4">
        <div className="flex justify-around mb-6 text-sm">
  <style>{`.hint-modal-fixed-bottom-btn { position: fixed; left: 0; bottom: 0; width: 100vw; z-index: 50; background: #000; border-top: 1px solid #222; padding: 1.25rem 1.5rem; }`}</style>
          <div className="text-center">
            <p className="text-white">Accuracy Penalty</p>
            <Badge className="mt-1 text-base bg-blue-900 text-blue-100 border border-blue-700">-{accDebt}%</Badge>
          </div>
          <div className="text-center">
            <p className="text-white">Experience Penalty</p>
            <Badge className="mt-1 text-base bg-green-900 text-green-100 border border-green-700">-{xpDebt}XP</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4">
          <h3 className="text-center text-lg font-semibold mb-2 text-white">WHEN</h3>
          <h3 className="text-center text-lg font-semibold mb-2 text-white">WHERE</h3>
          
          <div className="space-y-3">
            {hintsByColumn.when.map((hint) => (
              <HintButtonUI 
                key={`when-${hint.id}`}
                hint={hint}
                purchasedHintIds={purchasedHintIds}
                isLoading={isLoading || purchasingHintId === hint.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>

          <div className="space-y-3">
            {hintsByColumn.where.map((hint) => (
              <HintButtonUI 
                key={`where-${hint.id}`}
                hint={hint}
                purchasedHintIds={purchasedHintIds}
                isLoading={isLoading || purchasingHintId === hint.id}
                onPurchase={handlePurchase}
              />
            ))}
          </div>
        </div>

        </div>
      <div className="p-4 border-t border-gray-800">
  <Button 
    size="lg" 
    className="w-full bg-white text-black hover:bg-gray-200 font-semibold" 
    onClick={() => onOpenChange(false)}
  >
    Continue Guessing
  </Button>
</div>
      </DialogContent>
    </Dialog>
  );
};

export default HintModalV2New;
