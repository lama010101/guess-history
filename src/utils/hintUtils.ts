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
  };
  
  return levelMap[hintType] || 1;
};

/**
 * Gets the cost and penalty for a hint type
 */
export const getHintCostAndPenalty = (hintType: string): { xp: number; acc: number } => {
  // Cost increases with level
  const level = getHintLevel(hintType);
  const xpCost = level * 10; // 10 XP per level
  const accPenalty = level * 5; // 5% accuracy penalty per level
  
  return { xp: xpCost, acc: accPenalty };
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
