import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, CheckCircle, HelpCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// Define interfaces based on useHintV2 return type
interface Hint {
  id: string;
  type: string;
  text: string;
  level: number;
  image_id: string;
  xp_cost: number;
  accuracy_penalty: number;
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
  const [selectedHint, setSelectedHint] = useState<Hint | null>(null);

  // Group hints by level
  const hintsByLevel = React.useMemo(() => {
    const grouped: Record<number, Hint[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    availableHints.forEach(hint => {
      if (grouped[hint.level]) {
        grouped[hint.level].push(hint);
      }
    });

    return grouped;
  }, [availableHints]);

  const isHintPurchased = (hintId: string) => purchasedHintIds.includes(hintId);

  const getLevelTitle = (level: number) => {
    const titles = {
      1: "🎯 Basic Hints",
      2: "📍 Distant References",
      3: "🔍 Narrower Context",
      4: "⚡ Precise Clues",
      5: "💡 Direct Answers",
    };
    return titles[level as keyof typeof titles] || `Level ${level}`;
  };

  const getLevelDescription = (level: number) => {
    const descriptions = {
      1: "General location and time period",
      2: "Distant landmarks and events",
      3: "Regional context and decades",
      4: "Specific landmarks and events",
      5: "Direct location and date clues",
    };
    return descriptions[level as keyof typeof descriptions] || "";
  };

  const handlePurchaseHint = async (hint: Hint) => {
    if (!isHintPurchased(hint.id) && !isLoading) {
      await onPurchaseHint(hint.id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500" />
            Available Hints
          </DialogTitle>
          <DialogDescription>
            Purchase hints to help identify the image. Each hint costs XP and reduces accuracy.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 overflow-hidden">
          {/* Left panel - Hints grouped by level */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {[1, 2, 3, 4, 5].map(level => (
              <div key={level} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{getLevelTitle(level)}</h3>
                  <Badge variant="outline" className="text-xs">
                    Level {level}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getLevelDescription(level)}
                </p>
                
                <div className="space-y-2">
                  {hintsByLevel[level].map(hint => {
                    const isPurchased = isHintPurchased(hint.id);
                    
                    return (
                      <Card
                        key={hint.id}
                        className={cn(
                          "cursor-pointer transition-all",
                          selectedHint?.id === hint.id && "ring-2 ring-blue-500",
                          isPurchased && "bg-green-50 dark:bg-green-900/20"
                        )}
                        onClick={() => setSelectedHint(hint)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{hint.text}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="destructive" className="text-xs">
                                  -{hint.xp_cost} XP
                                </Badge>
                                <Badge variant="warning" className="text-xs">
                                  -{hint.accuracy_penalty}% ACC
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="ml-2">
                              {isPurchased ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right panel - Selected hint details */}
          <div className="w-80 border-l pl-4">
            {selectedHint ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Selected Hint</h4>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm mb-4">{selectedHint.text}</p>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Cost:</span>
                          <span className="font-semibold text-red-500">
                            {selectedHint.xp_cost} XP
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Accuracy Penalty:</span>
                          <span className="font-semibold text-orange-500">
                            {selectedHint.accuracy_penalty}%
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-semibold">Current XP Debt:</span> {xpDebt}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Current Accuracy Debt:</span> {accDebt}%
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchaseHint(selectedHint)}
                  disabled={isHintPurchased(selectedHint.id) || isLoading}
                  className="w-full"
                >
                  {isHintPurchased(selectedHint.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Purchased
                    </>
                  ) : (
                    <>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      Purchase Hint
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Select a hint to see details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HintModalV2New;
