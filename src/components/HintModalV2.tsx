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
    // Level 1 hints
    'continent': 'continent',                 // 1_where_continent
    'century': 'century',                     // 1_when_century
    
    // Level 2 hints
    'distant_landmark': 'distantLandmark',    // 2_where_landmark
    'distant_distance': 'distantDistance',    // 2_where_landmark_km
    'distant_event': 'distantEvent',          // 2_when_event
    'distant_time_diff': 'distantTimeDiff',   // 2_when_event_years
    
    // Level 3 hints
    'region': 'region',                       // 3_where_region
    'narrow_decade': 'narrowDecade',          // 3_when_decade
    
    // Level 4 hints
    'nearby_landmark': 'nearbyLandmark',      // 4_where_landmark
    'nearby_distance': 'nearbyDistance',      // 4_where_landmark_km
    'contemporary_event': 'contemporaryEvent', // 4_when_event
    'close_time_diff': 'closeTimeDiff',       // 4_when_event_years
    
    // Database column names to constants mapping
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
    
    // Legacy mappings
    'decade': 'century',
    'where': 'continent',
    'when': 'century',
  };
  
  const key = keyMap[hintType] || 'continent';
  return HINT_COSTS[key] || { xp: 30, acc: 3 };
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
  hintsByLevel
}: HintModalV2Props) => {
  const [purchasingHintId, setPurchasingHintId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Check if a hint is already purchased
  const isHintPurchased = (hintId: string): boolean => {
    return purchasedHintIds.includes(hintId);
  };

  // Dependency map must mirror the one used in useHintV2
  const HINT_DEPENDENCIES: Record<string, string | null> = {
    continent: null,
    century: null,
    distant_landmark: null,
    distant_distance: 'distant_landmark',
    distant_event: null,
    distant_time_diff: 'distant_event',
    region: null,
    narrow_decade: null,
    nearby_landmark: null,
    nearby_distance: 'nearby_landmark',
    contemporary_event: null,
    close_time_diff: 'contemporary_event',
    where_clues: null,
    when_clues: null
  };

  // Check if user can purchase a hint (dependency + duplicate check)
  const canPurchaseHint = (hint: Hint): boolean => {
    if (isHintPurchased(hint.id)) return false;
    const prereqKey = HINT_DEPENDENCIES[hint.type];
    if (!prereqKey) return true;
    const prereqHint = availableHints.find(h => h.type === prereqKey);
    if (!prereqHint) return false;
    return purchasedHintIds.includes(prereqHint.id);
  };

  // Handle hint purchase
  const handlePurchaseHint = async (hint: Hint) => {
    if (purchasingHintId !== null) return; // Prevent multiple purchases at once
    
    try {
      setPurchasingHintId(hint.id);
      setPurchaseError(null);
      setPurchaseSuccess(null);
      
      await onPurchaseHint(hint.id);
      
      setPurchaseSuccess(`Successfully purchased ${HINT_TYPE_NAMES[hint.type] || hint.type} hint! You'll pay ${hint.xp_cost} XP at end of round.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPurchaseSuccess(null);
      }, 3000);
    } catch (error) {
      console.error("Error purchasing hint:", error);
      setPurchaseError(`Failed to purchase hint: ${error}`);
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setPurchaseError(null);
      }, 3000);
    } finally {
      setPurchasingHintId(null);
    }
  };

  return (
    <Popup isOpen={isOpen} onClose={() => onOpenChange(false)} ariaLabelledBy="hint-modal-title" className="w-[95vw] max-w-4xl h-[90vh]">
      <div className="text-center">
        <h2 id="hint-modal-title" className="text-xl font-bold text-black mb-2">
          Hints
        </h2>
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="flex items-center">
            <XpIcon className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium text-black">Spent {xpDebt} XP</span>
          </div>
        </div>
      </div>

      {purchaseError && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-black text-sm">{purchaseError}</p>
        </div>
      )}

      {purchaseSuccess && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-black text-sm">{purchaseSuccess}</p>
        </div>
      )}

      <div className="mt-2 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {/* Render hints by level */}
        {Object.entries(hintsByLevel).sort(([a], [b]) => Number(a) - Number(b)).map(([level, hints]) => (
          <div key={level} className="bg-white/90 rounded-lg p-3 shadow-md">
            <h3 className="text-md font-medium mb-2 flex items-center text-black">
              <span className="bg-history-secondary/80 text-xs rounded-full w-5 h-5 inline-flex items-center justify-center mr-2">
                {level}
              </span>
              {getLevelTitle(Number(level), hints)}
            </h3>
            <div className="space-y-2">
              {hints.map(hint => {
                // Get cost and penalty from constants
                const { xp: costXp, acc: penaltyAcc } = getHintCostAndPenalty(hint.type);
                const isPurchased = isHintPurchased(hint.id);
                const canPurchase = canPurchaseHint(hint);
                
                return (
                  <div 
                    key={hint.id} 
                    className={`p-3 rounded-md ${
                      isPurchased 
                        ? 'bg-orange-100 border border-orange-300' 
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="mr-2 text-xl">
                          {HINT_TYPE_ICONS[hint.type] || '🔍'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-black capitalize">
                            <span className="inline-block mr-2 px-1.5 py-0.5 bg-gray-100 text-xs rounded-md">
                              {hint.type.includes('continent') || hint.type.includes('region') || hint.type.includes('landmark') || hint.type.includes('distance') ? 'Where' : 'When'}
                            </span>
                            {HINT_TYPE_NAMES[hint.type] || hint.type.replace('_', ' ')}
                          </div>
                          {isPurchased && (
                            <p className="text-sm mt-1 text-black">{hint.text}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {!isPurchased ? (
                          <>
                            <div className="flex items-center justify-end mb-1">
                              <XpIcon className="w-4 h-4 mr-1" />
                              <span className="text-xs text-black">{costXp} XP</span>
                            </div>
                            <div className="text-xs text-red-600">-{penaltyAcc}% accuracy</div>
                          </>
                        ) : (
                          <div className="text-xs text-green-600 font-medium">Purchased</div>
                        )}
                      </div>
                    </div>
                    
                    {!isPurchased && (
                      <div className="mt-2">
                        <Button 
                          onClick={() => handlePurchaseHint(hint)}
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
                            'Purchase Hint'
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

      <div className="mt-4 flex justify-center">
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
