
import { useState, useEffect, useCallback } from 'react';
import { GameImage } from '@/contexts/GameContext';

export type HintType = 'where' | 'when' | null;

interface HintState {
  selectedHintType: HintType;
  hintContent: string | null;
  canSelectHintType: boolean;
}

// Helper functions to generate hint content
const getRegionHint = (data: { location_name: string; latitude: number; longitude: number }): string => {
  // In a real implementation, you might use a geo library to determine the region
  // For now, using a simplified mapping based on location name or coordinates
  const location = data.location_name.toLowerCase();
  if (location.includes("berlin")) return "Central Europe";
  if (location.includes("paris")) return "Western Europe";
  if (location.includes("tokyo")) return "East Asia";
  // Default fallback
  return "Europe";
};

const getDecadeHint = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
};

// Removed getDescriptionHint as we're no longer using the 'what' hint type

// HINT SYSTEM CONSTANTS
export const HINTS_PER_ROUND = 2; // Maximum hints allowed per round
export const HINTS_PER_GAME = 10; // Maximum hints allowed per game
export const HINT_PENALTY = 30; // 30 XP or 30% accuracy penalty per hint used

export const useHint = (imageData: GameImage | null = null) => {
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(0);
  const [hintsUsedTotal, setHintsUsedTotal] = useState(0);
  const [hintState, setHintState] = useState<HintState>(() => {
    const savedHint = localStorage.getItem('currentHint');
    return savedHint ? JSON.parse(savedHint) : {
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    };
  });

  useEffect(() => {
    if (hintState.selectedHintType) {
      localStorage.setItem('currentHint', JSON.stringify(hintState));
    }
  }, [hintState]);

  const canSelectHint = hintsUsedThisRound < HINTS_PER_ROUND && hintsUsedTotal < HINTS_PER_GAME && !hintState.selectedHintType;
  const canSelectHintType = (hintType: HintType): boolean => canSelectHint && hintType !== null;

  const selectHint = useCallback((hintType: HintType) => {
    if (!canSelectHint) {
      console.warn('Cannot select hint: no hints available or already selected');
      return;
    }
    
    if (!imageData) {
      console.error('Cannot select hint: no image data available');
      return;
    }
    
    let content: string | null = null;
    try {
      switch (hintType) {
        case 'where':
          content = getRegionHint({
            location_name: imageData.location_name || 'unknown location',
            latitude: imageData.latitude || 0,
            longitude: imageData.longitude || 0
          });
          break;
        case 'when':
          content = getDecadeHint(imageData.year || new Date().getFullYear());
          break;
        default:
          content = 'No hint available';
      }
    } catch (error) {
      console.error('Error generating hint content:', error);
      content = 'Error generating hint. Please try again.';
    }
    
    setHintState({
      selectedHintType: hintType,
      hintContent: content,
      canSelectHintType: false
    });
    setHintsUsedThisRound(h => h + 1);
    setHintsUsedTotal(t => t + 1);
  }, [canSelectHint, imageData]);

  // Function to reset hint for next round
  const resetHint = useCallback(() => {
    localStorage.removeItem('currentHint');
    setHintState({
      selectedHintType: null,
      hintContent: null,
      canSelectHintType: true
    });
    setHintsUsedThisRound(0);
  }, []);

  const resetHintsForRound = useCallback(() => {
    setHintsUsedThisRound(0);
  }, []);

  const incrementHints = useCallback(() => {
    setHintsUsedTotal(t => t + 1);
  }, []);

  return {
    selectedHintType: hintState.selectedHintType,
    hintContent: hintState.hintContent,
    canSelectHintType: canSelectHint && hintState.canSelectHintType,
    hintsUsedThisRound,
    hintsUsedTotal,
    hintsUsed: hintsUsedThisRound, // For backward compatibility
    hintsAllowed: HINTS_PER_ROUND, // The maximum hints allowed per round
    canSelectHint,
    selectHint,
    resetHint,
    resetHintsForRound,
    incrementHints,
    HINTS_PER_ROUND,
    HINTS_PER_GAME,
    HINT_PENALTY
  };
};
