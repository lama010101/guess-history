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
      const category = hint.type.includes('when') || 
                       hint.type.includes('century') || 
                       hint.type.includes('decade') || 
                       hint.type.includes('event') ? 'when' : 'where';
      
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
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900">
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
                    
                    // Create pairs of WHEN/WHERE hints
                    const maxLength = Math.max(whenHints.length, whereHints.length);
                    
                    return Array.from({ length: maxLength }).map((_, index) => {
                      const whenHint = whenHints[index];
                      const whereHint = whereHints[index];
                      
                      return (
                        <div key={`${level}-${index}`} className="grid grid-cols-5 gap-2 items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-xs">
                          {/* Level */}
                          <div className="text-center font-bold text-black dark:text-white">
                            {level}
                          </div>
                          
                          {/* When */}
                          <div className="text-center">
                            {whenHint ? (
                              <div>
                                <div className="font-medium text-black dark:text-white">{whenHint.type}</div>
                                <div className="text-gray-600 dark:text-gray-400">{whenHint.xp_cost}XP</div>
                                {purchasedHintIds.includes(whenHint.id) ? (
                                  <div className="text-black dark:text-white bg-green-100 dark:bg-green-800 p-1 rounded mt-1">
                                    {whenHint.text}
                                  </div>
                                ) : whenHint.prerequisite && !purchasedHintIds.includes(whenHint.prerequisite) ? (
                                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mt-1">
                                    <Lock className="h-3 w-3" />
                                    <span>Locked</span>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handlePurchase(whenHint.id);
                                    }}
                                    disabled={isLoading}
                                    className="h-5 text-xs mt-1"
                                  >
                                    Hint
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                          
                          {/* Where */}
                          <div className="text-center">
                            {whereHint ? (
                              <div>
                                <div className="font-medium text-black dark:text-white">{whereHint.type}</div>
                                <div className="text-gray-600 dark:text-gray-400">{whereHint.xp_cost}XP</div>
                                {purchasedHintIds.includes(whereHint.id) ? (
                                  <div className="text-black dark:text-white bg-green-100 dark:bg-green-800 p-1 rounded mt-1">
                                    {whereHint.text}
                                  </div>
                                ) : whereHint.prerequisite && !purchasedHintIds.includes(whereHint.prerequisite) ? (
                                  <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 mt-1">
                                    <Lock className="h-3 w-3" />
                                    <span>Locked</span>
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handlePurchase(whereHint.id);
                                    }}
                                    disabled={isLoading}
                                    className="h-5 text-xs mt-1"
                                  >
                                    Hint
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </div>
                          
                          {/* Accuracy penalties */}
                          <div className="text-center">
                            {whenHint && (
                              <div className="text-gray-600 dark:text-gray-400">-{whenHint.accuracy_penalty}%</div>
                            )}
                            {whereHint && (
                              <div className="text-gray-600 dark:text-gray-400">-{whereHint.accuracy_penalty}%</div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HintModalV2New;
