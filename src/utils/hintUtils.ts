import { HINT_COSTS } from '@/constants/hints';
// Hint interface defined in useHintV2.ts
interface Hint {
  id: string;
  type: string;
  text: string;
  level: number;
  image_id: string;
  xp_cost: number;
  accuracy_penalty: number;
}

/**
 * Groups hints by their level for display in the modal
 */
export const groupHintsByLevel = (hints: Hint[]): Record<number, Hint[]> => {
  const grouped: Record<number, Hint[]> = {};
  
  hints.forEach(hint => {
    const level = getHintLevel(hint.type);
    if (!grouped[level]) {
      grouped[level] = [];
    }
    grouped[level].push(hint);
  });
  
  // Ensure levels 1-5 exist even if empty
  for (let level = 1; level <= 5; level++) {
    if (!grouped[level]) {
      grouped[level] = [];
    }
  }
  
  return grouped;
};

/**
 * Determines the level of a hint based on its type
 */
const getHintLevel = (hintType: string): number => {
  const levelMap: Record<string, number> = {
    // V2 numeric-prefixed types
    '1_where_continent': 1,
    '1_when_century': 1,
    '2_where_landmark': 2,
    '2_where_landmark_km': 2,
    '2_when_event': 2,
    '2_when_event_years': 2,
    '3_where_region': 3,
    '3_when_decade': 3,
    '4_where_landmark': 4,
    '4_where_landmark_km': 4,
    '4_when_event': 4,
    '4_when_event_years': 4,
    '5_where_clues': 5,
    '5_when_clues': 5,

    // Legacy types (backward compatibility)
    continent: 1,
    century: 1,
    distantLandmark: 2,
    distantDistance: 2,
    distantEvent: 2,
    distantTimeDiff: 2,
    region: 3,
    narrowDecade: 3,
    nearbyLandmark: 4,
    nearbyDistance: 4,
    contemporaryEvent: 4,
    closeTimeDiff: 4,
    whereClues: 5,
    whenClues: 5,
  };

  return levelMap[hintType] ?? 1;
};

/**
 * Gets the cost and penalty for a hint type
 */
export const getHintCostAndPenalty = (hintType: string): { xp: number; acc: number } => {
  const fromMap = (HINT_COSTS as Record<string, { xp: number; acc: number } | undefined>)[hintType];
  if (fromMap) return { xp: fromMap.xp, acc: fromMap.acc };
  // Fallback to level-based heuristic if not explicitly mapped
  const level = getHintLevel(hintType);
  return { xp: level * 10, acc: level * 5 };
};

/**
 * Gets the display title for a hint level
 */
export const getLevelTitle = (level: number): string => {
  const titles: Record<number, string> = {
    1: "Basic Hints - General Location & Time Period",
    2: "Intermediate Hints - Distant References",
    3: "Advanced Hints - Narrower Location & Time",
    4: "Precise Hints - Specific Context",
    5: "Full Clues - Direct Location & Date"
  };
  
  return titles[level] || `Level ${level}`;
};
