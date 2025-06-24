/**
 * Hint system constants for Guess-History
 * Defines costs, penalties, and display information for the v2 hint system
 */

// Hint costs and accuracy penalties
export const HINT_COSTS = {
  // Level 1 Hints (Basic)
  continent: { xp: 30, acc: 3 },
  century: { xp: 30, acc: 3 },
  
  // Level 2 Hints (Intermediate)
  distantLandmark: { xp: 60, acc: 6 },
  distantDistance: { xp: 60, acc: 6 },
  distantEvent: { xp: 60, acc: 6 },
  distantTimeDiff: { xp: 60, acc: 6 },
  
  // Level 3 Hints (Advanced)
  region: { xp: 90, acc: 9 },
  narrowDecade: { xp: 90, acc: 9 },
  
  // Level 4 Hints (Precise)
  nearbyLandmark: { xp: 160, acc: 16 },
  nearbyDistance: { xp: 160, acc: 16 },
  contemporaryEvent: { xp: 160, acc: 16 },
  closeTimeDiff: { xp: 160, acc: 16 }
};

// Hint level descriptions
export const HINT_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "GLOBAL",
  2: "DISTANT",
  3: "REGIONAL",
  4: "NEARBY"
};

// Hint type display names
export const HINT_TYPE_NAMES: Record<string, string> = {
  // Level 1
  continent: "Continent",
  century: "Century",
  
  // Level 2
  distant_landmark: "Distant Landmark",
  distant_distance: "Distance Reference",
  distant_event: "Historical Context",
  distant_time_diff: "Time Period Range",
  
  // Level 3
  region: "Region/Country",
  narrow_decade: "Decade",
  nearby_landmark: "Nearby Landmark",
  nearby_distance: "Nearby Distance",
  
  // Level 4
  contemporary_event: "Contemporary Event",
  close_time_diff: "Exact Time Period",
  
  // Legacy mappings
  decade: "Decade",
  where: "Location",
  when: "Time Period"
};

// Hint type icons/emojis
export const HINT_TYPE_ICONS: Record<string, string> = {
  // Level 1
  continent: "🌍",
  century: "📅",
  
  // Level 2
  distant_landmark: "🏛️",
  distant_distance: "📏",
  distant_event: "📚",
  distant_time_diff: "⏳",
  
  // Level 3
  region: "🗺️",
  narrow_decade: "📆",
  nearby_landmark: "🏰",
  nearby_distance: "📍",
  
  // Level 4
  contemporary_event: "📰",
  close_time_diff: "⏱️",
  
  // Legacy mappings
  decade: "📆",
  where: "🌍",
  when: "📅"
};

// Legacy hint penalty constant for backward compatibility
export const HINT_PENALTY = {
  XP: 50,
  ACCURACY_PERCENT: 5
};
