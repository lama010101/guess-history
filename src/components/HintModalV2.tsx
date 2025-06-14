import React, { useState } from 'react';
import Popup from '@/components/ui/Popup';
import { Button } from "@/components/ui/button";
import { Hint } from "@/hooks/useHintV2";
import { XpIcon } from '@/components/ui/icons/XpIcon';
import { HINT_COSTS, HINT_LEVEL_DESCRIPTIONS, HINT_TYPE_ICONS, HINT_TYPE_NAMES } from '@/constants/hints';

interface HintModalV2Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  availableHints: Hint[];
  purchasedHintIds: string[];
  xpDebt: number;
  accDebt: number;
  onPurchaseHint: (hintId: string) => Promise<void>;
  isLoading: boolean;
  hintsByLevel: Record<number, Hint[]>;
}

// Helper function to generate level titles based on hint names
const getLevelTitle = (level: number, hints: Hint[]): string => {
  if (!hints || hints.length === 0) return `Level ${level} Hints`;
  
  // Get unique hint types for this level
  const hintTypes = [...new Set(hints.map(hint => hint.type))];
  
  // Map to display names and filter out duplicates
  const hintNames = hintTypes.map(type => HINT_TYPE_NAMES[type] || type.replace('_', ' '));
  
  // Join with ampersands
  return hintNames.join(' & ');
};

// Helper function to get hint cost and penalty from the constants
const getHintCostAndPenalty = (hintType: string): { xp: number, acc: number } => {
  // Convert from database hint type to constant key
  const keyMap: Record<string, keyof typeof HINT_COSTS> = {
    distant_landmark: 'distantLandmark',
    distant_distance: 'distantDistance',
    distant_event: 'distantEvent',
    distant_time_diff: 'distantTimeDiff',
    narrow_decade: 'narrowDecade',
    nearby_landmark: 'nearbyLandmark',
    nearby_distance: 'nearbyDistance',
    contemporary_event: 'contemporaryEvent',
    close_time_diff: 'closeTimeDiff',
  };

  const key = keyMap[hintType] || hintType as keyof typeof HINT_COSTS;
  return HINT_COSTS[key] || { xp: 0, acc: 0 };
};

export const HintModalV2: React.FC<HintModalV2Props> = ({
  isOpen,
  onOpenChange,
  availableHints,
  purchasedHintIds,
  xpDebt,
  accDebt,
  onPurchaseHint,
  isLoading,
  hintsByLevel,
}) => {
  const [purchasingHintId, setPurchasingHintId] = useState<string | null>(null);

  const handlePurchase = async (hintId: string) => {
    setPurchasingHintId(hintId);
    try {
      await onPurchaseHint(hintId);
    } catch (error) {
      console.error('Failed to purchase hint:', error);
    } finally {
      setPurchasingHintId(null);
    }
  };

  return (
    <Popup 
      isOpen={isOpen} 
      onClose={() => onOpenChange(false)} 
    >
      <div className="p-1 bg-white rounded-lg shadow-lg w-full mx-auto h-full overflow-y-auto fixed inset-0 z-[9999]">
        <div className="sticky top-0 bg-white p-4 z-10 border-b-2 border-gray-200 flex justify-between items-center">
          <div className="w-8"></div> {/* Spacer for centering */}
          <p className="text-center text-sm text-gray-600">
            Use your XP to buy hints. Penalties apply to your final score.
          </p>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="mt-3 flex justify-around p-2 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="font-bold text-lg text-red-500">-{xpDebt} XP</div>
              <div className="text-xs text-gray-500">Total Cost</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-blue-500">-{accDebt}%</div>
              <div className="text-xs text-gray-500">Accuracy Penalty</div>
            </div>
          </div>
        </div>

        {Object.entries(hintsByLevel).map(([level, hints]) => (
          <div key={level} className="mb-4 px-4">
            <h3 className="text-xl font-semibold my-3 text-gray-800 border-b pb-2">
              {Number(level) === 1 ? "GLOBAL" : 
               Number(level) === 2 ? "DISTANT" : 
               Number(level) === 3 ? "REGIONAL" : 
               Number(level) === 4 ? "NEARBY" : 
               `Level ${level}`}
            </h3>
            {/* Removed subtitles as requested */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hints.map((hint) => {
                const isPurchased = purchasedHintIds.includes(hint.id);
                const { xp: cost, acc: penalty } = getHintCostAndPenalty(hint.type);
                const canPurchase = !isPurchased;

                return (
                  <div 
                    key={hint.id} 
                    className={`p-3 rounded-lg border-2 transition-all duration-300 ${
                      isPurchased 
                        ? 'bg-green-50 border-green-400'
                        : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{HINT_TYPE_ICONS[hint.type] || '❓'}</span>
                      <div>
                        {/* Removed hint type name as requested */}
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="text-red-500">-{cost} XP</span>
                          <span className="mx-2">|</span>
                          <span className="text-blue-500">-{penalty}% Acc</span>
                        </div>
                      </div>
                    </div>
                    
                    {isPurchased ? (
                      <div className="p-2 bg-green-100 rounded-md">
                        <p className="text-sm text-green-800 font-semibold text-center">{hint.text}</p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Button 
                          onClick={() => handlePurchase(hint.id)}
                          disabled={!canPurchase || purchasingHintId !== null || isLoading}
                          className={`w-full text-xs py-1 text-white ${
                            canPurchase 
                              ? 'bg-black hover:bg-gray-800' 
                              : 'bg-gray-400 cursor-not-allowed'
                          }`}
                        >
                          {purchasingHintId === hint.id ? (
                            <span className="flex items-center justify-center">
                              <div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                              Purchasing...
                            </span>
                          ) : canPurchase ? (
                            HINT_TYPE_NAMES[hint.type] || 'Hint'
                          ) : (
                            'Already Purchased'
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(hintsByLevel).length === 0 && (
          <div className="text-center py-8 text-black">
            No hints available for this image
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-white p-4 mt-4 flex justify-center border-t-2 border-gray-200">
        <Button
          onClick={() => onOpenChange(false)}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          Continue Guessing
        </Button>
      </div>
    </Popup>
  );
};

export default HintModalV2;
