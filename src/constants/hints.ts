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
  distantDistance: { xp: 30, acc: 3 },
  distantEvent: { xp: 60, acc: 6 },
  distantTimeDiff: { xp: 30, acc: 3 },
  
  // Level 3 Hints (Advanced)
  region: { xp: 90, acc: 9 },
  narrowDecade: { xp: 90, acc: 9 },
  
  // Level 4 Hints (Precise)
  nearbyLandmark: { xp: 160, acc: 16 },
  nearbyDistance: { xp: 80, acc: 8 },
  contemporaryEvent: { xp: 160, acc: 16 },
  closeTimeDiff: { xp: 80, acc: 8 },
};

// Hint level descriptions
export const HINT_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "Basic Hints - General Location & Time Period",
  2: "Intermediate Hints - Distant References",
  3: "Advanced Hints - Narrower Location & Time",
  4: "Precise Hints - Specific Context",
  5: "Full Clues - Direct Location & Date"
};

// Hint type display names
export const HINT_TYPE_NAMES: Record<string, string> = {
  // Level 1
  '1_where_continent': "Continent",
  '1_when_century': "Century",
  
  // Level 2
  '2_where_landmark': "Distant Landmark",
  '2_where_landmark_km': "Distance Reference",
  '2_when_event': "Historical Context",
  '2_when_event_years': "Time Period Range",
  
  // Level 3
  '3_where_region': "Region/Country",
  '3_when_decade': "Decade",
  '4_where_landmark': "Nearby Landmark",
  '4_where_landmark_km': "Nearby Distance",
  
  // Level 4
  '4_when_event': "Contemporary Event",
  '4_when_event_years': "Exact Time Period",
  
  // Level 5
  '5_where_clues': "Location Clues",
  '5_when_clues': "Date Clues"
};

// Hint dependency map aligned with database schema
export const HINT_DEPENDENCIES: Record<string, string | null> = {
  // Level 1 - no dependencies
  '1_where_continent': null,
  '1_when_century': null,
  
  // Level 2 - distance fields depend on landmark fields
  '2_where_landmark': null,
  '2_where_landmark_km': '2_where_landmark',
  '2_when_event': null,
  '2_when_event_years': '2_when_event',
  
  // Level 3 - no dependencies
  '3_where_region': null,
  '3_when_decade': null,
  
  // Level 4 - distance fields depend on landmark fields
  '4_where_landmark': null,
  '4_where_landmark_km': '4_where_landmark',
  '4_when_event': null,
  '4_when_event_years': '4_when_event',
  
  // Level 5 - no dependencies
  '5_where_clues': null,
  '5_when_clues': null
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
  
  // Level 5
  where_clues: "🧭",
  when_clues: "📜",
  
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
