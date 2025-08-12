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
 
import { HINT_TYPE_NAMES, HINT_DEPENDENCIES } from '@/constants/hints';

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
  onLockedClick?: () => void;
}> = ({ hint, purchasedHintIds, isLoading, onPurchase, onLockedClick }) => {
  const { xp: costXp, acc: penaltyAcc } = getHintCostAndPenalty(hint);
  const label1 = HINT_TYPE_NAMES[hint.type] ?? 
    hint.type.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/(when|where)/g, '').trim();
  const label2 = `-${penaltyAcc}% -${costXp}XP`;
  
  const isPurchased = purchasedHintIds.includes(hint.id);
  const isLocked = !!(hint.prerequisite && !purchasedHintIds.includes(hint.prerequisite));

  return (
    <Button
      size="lg"
      variant={'outline'}
      disabled={isLoading || isPurchased}
      className={`w-full py-3 text-base font-semibold flex items-center justify-center rounded-[0.75rem] h-auto whitespace-normal break-words leading-tight
        ${isPurchased 
            ? 'bg-[#3e9b0a] text-white border-transparent' // exact green for purchased
            : 'bg-white text-black border-gray-300 hover:bg-gray-100'
        }
        ${isLocked ? 'cursor-not-allowed !bg-gray-200 !text-gray-500 border-transparent opacity-70' : ''}`}
      style={isPurchased ? { backgroundColor: '#3e9b0a', color: '#fff' } : {}}
      aria-disabled={isLocked}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (isLocked) { onLockedClick?.(); return; }
        if (!isPurchased) onPurchase(hint);
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
          <img src="/icons/lock.webp" alt="Locked" className="h-4 w-4 shrink-0 bg-transparent" />
          <span className="flex flex-col items-center">
            <span className="capitalize">{label1}</span>
            <span className="text-xs text-red-500 font-normal">{label2}</span>
          </span>
        </span>
      ) : (
        <span className="flex flex-col items-center">
          <span className="capitalize">{label1}</span>
          <span className="text-xs text-red-500 font-normal">{label2}</span>
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
  const [lockedInfoOpen, setLockedInfoOpen] = useState(false);

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
      <DialogContent className="h-screen w-screen bg-black text-white overflow-y-auto p-0 border-0">
        <DialogHeader className="sticky top-0 z-10 pt-4 px-4 border-b border-gray-800 bg-black">
          <div className="relative flex items-center justify-center w-full">
            <DialogTitle className="text-2xl font-bold text-white">HINTS</DialogTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="absolute right-0 text-gray-400 hover:text-white hover:bg-gray-800 rounded-full h-8 w-8"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <p className="text-red-500 text-center mt-1">Using a hint will reduce your score.</p>
        </DialogHeader>

        <div className="p-4 pt-0">
          <div className="mt-0.5 rounded-lg border border-gray-800 bg-[#202020] p-3">
            <div className="flex justify-around text-sm">
              <div className="text-center">
                <p className="text-white">Accuracy Penalty</p>
                <Badge className="mt-1 text-base bg-blue-900 text-red-500 border border-blue-700">-{accDebt}%</Badge>
              </div>
              <div className="text-center">
                <p className="text-white">Experience Penalty</p>
                <Badge className="mt-1 text-base bg-green-900 text-red-500 border border-green-700">-{xpDebt}XP</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="rounded-lg border border-gray-800 bg-[#202020] p-3">
              <h3 className="flex items-center justify-center text-center text-lg font-semibold mb-3 text-white"><Clock className="w-5 h-5 mr-2" />WHEN</h3>
              <div className="space-y-3">
                {hintsByColumn.when.map((hint) => (
                  <HintButtonUI 
                    key={`when-${hint.id}`}
                    hint={hint}
                    purchasedHintIds={purchasedHintIds}
                    isLoading={isLoading || purchasingHintId === hint.id}
                    onPurchase={handlePurchase}
                    onLockedClick={() => setLockedInfoOpen(true)}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-[#202020] p-3">
              <h3 className="flex items-center justify-center text-center text-lg font-semibold mb-3 text-white"><MapPin className="w-5 h-5 mr-2" />WHERE</h3>
              <div className="space-y-3">
                {hintsByColumn.where.map((hint) => (
                  <HintButtonUI 
                    key={`where-${hint.id}`}
                    hint={hint}
                    purchasedHintIds={purchasedHintIds}
                    isLoading={isLoading || purchasingHintId === hint.id}
                    onPurchase={handlePurchase}
                    onLockedClick={() => setLockedInfoOpen(true)}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
  <div className="sticky bottom-0 z-10 p-4 border-t border-gray-800 bg-black">
  <Button 
    size="lg" 
    className="w-full bg-orange-600 text-white hover:bg-orange-700 font-semibold" 
    onClick={() => onOpenChange(false)}
  >
    Continue Guessing
  </Button>
</div>
      </DialogContent>
      {/* Locked info popup */}
      <Dialog open={lockedInfoOpen} onOpenChange={setLockedInfoOpen}>
        <DialogContent className="max-w-sm bg-[#202020] text-white">
          <DialogHeader>
            <DialogTitle>Hint Locked</DialogTitle>
          </DialogHeader>
          <p className="text-sm">You must first use the related hint above.</p>
          <div className="mt-4">
            <Button className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={() => setLockedInfoOpen(false)}>OK</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default HintModalV2New;
