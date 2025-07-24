import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, CheckCircle, Sparkles } from 'lucide-react';
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

// Renders a single hint as a large button with label and answer/lock logic
const HintButtonUI: React.FC<{
  hint: Hint;
  purchasedHintIds: string[];
  isLoading: boolean;
  onPurchase: (hintId: string) => void;
}> = ({ hint, purchasedHintIds, isLoading, onPurchase }) => {
  const label1 = HINT_TYPE_NAMES[hint.type] ?? hint.type;
  const label2 = `-${hint.xp_cost}XP -${hint.accuracy_penalty}%`;
  const isPurchased = purchasedHintIds.includes(hint.id);
  const isLocked = hint.prerequisite && !purchasedHintIds.includes(hint.prerequisite);

  return (
    <Button
      size="lg"
      variant={'outline'}
      disabled={isLoading || isLocked || isPurchased}
      className={`w-full py-3 text-base font-semibold flex items-center justify-center ${isPurchased ? 'bg-green-600 text-white' : ''}`}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        if (!isPurchased && !isLocked) onPurchase(hint.id);
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
        <span className="flex items-center justify-center gap-1 text-xs break-words whitespace-normal">
          <Lock className="h-4 w-4 shrink-0" />
          <span className="flex flex-col items-center">
            <span>{label1}</span>
            <span className="text-gray-300">{label2}</span>
          </span>
        </span>
      ) : (
        <span className="flex flex-col items-center break-words whitespace-normal">
          <span>{label1}</span>
          <span className="text-xs text-gray-300">{label2}</span>
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
  // Group hints by level and category
  const hintsByLevel = React.useMemo(() => {
    const grouped: Record<number, { when: Hint[], where: Hint[] }> = {
      1: { when: [], where: [] },
      2: { when: [], where: [] },
      3: { when: [], where: [] },
      4: { when: [], where: [] },
      5: { when: [], where: [] },
    };

    availableHints.forEach(hint => {
      // Determine category based on database column naming pattern
      let category: 'when' | 'where';
      if (hint.type.includes('_when_') || hint.type.endsWith('century') || hint.type.endsWith('decade') || hint.type.includes('time_diff') || hint.type === '5_when_clues') {
          category = 'when';
      } else {
          category = 'where';
      }

      if (grouped[hint.level]) {
        grouped[hint.level][category].push(hint);
      }
    });
    return grouped;
  }, [availableHints]);

  const handlePurchase = async (hintId: string) => {
    try {
      await onPurchaseHint(hintId);
    } catch (error) {
      console.error('Error purchasing hint:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-screen overflow-y-auto bg-white dark:bg-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-black dark:text-white">
            <Sparkles className="h-6 w-6 text-blue-500" />
            Hints V2 ({purchasedHintIds.length}/14)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div>
              <span className="font-semibold text-black dark:text-white">Total XP Debt:</span>
              <Badge variant="outline" className="ml-2">{xpDebt} XP</Badge>
            </div>
            <div>
              <span className="font-semibold text-black dark:text-white">Accuracy Debt:</span>
              <Badge variant="outline" className="ml-2">{accDebt}%</Badge>
            </div>
          </div>

          {Object.entries(hintsByLevel)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([level, categoryHints]) => (
              <div key={level} className="border border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                <div className="space-y-1">
                  {/* Level / When / Where format */}
                  {(() => {
                    const whenHints = categoryHints.when || [];
                    const whereHints = categoryHints.where || [];
                    const maxLength = Math.max(whenHints.length, whereHints.length);

                    if (level === '2' || level === '4') {
                      // For level 2 and 4 we have paired rows (event/landmark + timeDiff/distance)
                      const eventWhen = whenHints.find(h => h.type === (level === '2' ? '2_when_event' : '4_when_event'));
                      const eventWhere = whereHints.find(h => h.type === (level === '2' ? '2_where_landmark' : '4_where_landmark'));
                      const timeDiffWhen = whenHints.find(h => h.type === (level === '2' ? '2_when_event_years' : '4_when_event_years'));
                      const distanceWhere = whereHints.find(h => h.type === (level === '2' ? '2_where_landmark_km' : '4_where_landmark_km'));

                      return (
                        <>
                          {/* Row 1: Event / Landmark */}
                          <div key={`${level}-event`} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-xs">
                            <div className="text-center font-bold text-black dark:text-white">{level}</div>
                            <div className="text-center">
                              {eventWhen ? <HintButtonUI hint={eventWhen} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                            <div className="text-center">
                              {eventWhere ? <HintButtonUI hint={eventWhere} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                          </div>
                          {/* Row 2: TimeDiff / Distance */}
                          <div key={`${level}-timediff`} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-xs">
                            <div className="text-center font-bold text-black dark:text-white">{level}</div>
                            <div className="text-center">
                              {timeDiffWhen ? <HintButtonUI hint={timeDiffWhen} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                            <div className="text-center">
                              {distanceWhere ? <HintButtonUI hint={distanceWhere} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                          </div>
                        </>
                      );
                    } else if (level === '5') {
                      // Render level 5 as a single row: Level / When / Where
                      const whenHint = whenHints.find(h => h.type === '5_when_clues');
                      const whereHint = whereHints.find(h => h.type === '5_where_clues');
                      return (
                        <div key={`${level}-single`} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-xs">
                          <div className="text-center font-bold text-black dark:text-white">{level}</div>
                          <div className="text-center">
                            {whenHint ? <HintButtonUI hint={whenHint} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                          </div>
                          <div className="text-center">
                            {whereHint ? <HintButtonUI hint={whereHint} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                          </div>
                        </div>
                      );
                    } else {
                      // Default rendering for other levels
                      return Array.from({ length: maxLength }).map((_, index) => {
                        const whenHint = whenHints[index];
                        const whereHint = whereHints[index];
                        return (
                          <div key={`${level}-${index}`} className="grid grid-cols-3 gap-2 items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-xs">
                            <div className="text-center font-bold text-black dark:text-white">{level}</div>
                            <div className="text-center">
                              {whenHint ? <HintButtonUI hint={whenHint} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                            <div className="text-center">
                              {whereHint ? <HintButtonUI hint={whereHint} purchasedHintIds={purchasedHintIds} isLoading={isLoading} onPurchase={handlePurchase} /> : <span className="text-gray-500">—</span>}
                            </div>
                          </div>
                        );
                      });
                    }
                  })()}
                </div>
              </div>
            ))}
        </div>
        <div className="pt-4 border-t border-gray-300 dark:border-gray-700 mt-4">
          <Button 
            size="lg" 
            className="w-full"
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
