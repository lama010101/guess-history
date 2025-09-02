/**
 * Hint system constants for Guess-History
 * Defines costs, penalties, and display information for the v2 hint system
 */

// Hint costs and accuracy penalties
export const HINT_COSTS = {
  // Level 1 Hints (Basic)
  continent: { xp: 10, acc: 10 },
  century: { xp: 10, acc: 10 },
  
  // Level 2 Hints (Intermediate)
  distantLandmark: { xp: 20, acc: 20 },
  distantDistance: { xp: 10, acc: 10 },
  distantEvent: { xp: 20, acc: 20 },
  distantTimeDiff: { xp: 10, acc: 10 },
  
  // Level 3 Hints (Advanced)
  region: { xp: 50, acc: 50 },
  narrowDecade: { xp: 50, acc: 50 },
  
  // Level 4 Hints (Precise)
  nearbyLandmark: { xp: 30, acc: 30 },
  nearbyDistance: { xp: 10, acc: 10 },
  contemporaryEvent: { xp: 30, acc: 30 },
  closeTimeDiff: { xp: 10, acc: 10 },

  // Level 5 Hints (Full Clues)
  whereClues: { xp: 40, acc: 40 },
  whenClues: { xp: 40, acc: 40 },

  // V2 numeric-prefixed hint types
  // Level 1
  '1_where_continent': { xp: 10, acc: 10 },
  '1_when_century': { xp: 10, acc: 10 },

  // Level 2
  '2_where_landmark': { xp: 20, acc: 20 },
  '2_where_landmark_km': { xp: 10, acc: 10 },
  '2_when_event': { xp: 20, acc: 20 },
  '2_when_event_years': { xp: 10, acc: 10 },

  // Level 3
  '3_where_region': { xp: 50, acc: 50 },
  '3_when_decade': { xp: 50, acc: 50 },

  // Level 4
  '4_where_landmark': { xp: 30, acc: 30 },
  '4_where_landmark_km': { xp: 10, acc: 10 },
  '4_when_event': { xp: 30, acc: 30 },
  '4_when_event_years': { xp: 10, acc: 10 },

  // Level 5
  '5_where_clues': { xp: 40, acc: 40 },
  '5_when_clues': { xp: 40, acc: 40 },
};

// Hint level descriptions
export const HINT_LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "eg: 20th",
  2: "Event over 10 years before current one.",
  3: "eg: 1930s",
  4: "Event within 10 years of the current one",
  5: "Visual clues "
};

// Hint type names for display
export const HINT_TYPE_NAMES: Record<string, string> = {
  // Level 1
  'continent': 'Continent',
  'century': 'Century',
  
  // Legacy Level 2–4 snake_case names removed (replaced by numeric-prefixed types below)
  
  // Level 5
  'where_clues': 'Geographical Clues',
  'when_clues': 'Temporal Clues',
  
  // New hint types with numeric prefixes
  // Level 1
  '1_where_continent': "Continent",
  '1_when_century': "Century",
  
  // Level 2
  '2_where_landmark': "Remote Landmark",
  '2_where_landmark_km': "Distance to Remote Landmark",
  '2_when_event': "Distant Event",
  '2_when_event_years': "Years From Distant Event",
  
  // Level 3
  '3_where_region': "Region",
  '3_when_decade': "Decade",
  
  // Level 4
  '4_where_landmark': "Nearby Landmark",
  '4_where_landmark_km': "Distance to the nearby landmark",
  '4_when_event': "Recent Event",
  '4_when_event_years': "Years from the recent event",
  
  // Level 5
  '5_where_clues': "Geographical Clues",
  '5_when_clues': "Temporal Clues"
};

// Unique, per-type UI descriptions used by the Hint Modal
export const HINT_TYPE_DESCRIPTIONS: Record<string, string> = {
  // Level 1
  '1_where_continent': 'eg: Europe',
  '1_when_century': 'eg: 20th',
  
  // Level 2 (remote)
  '2_where_landmark': 'More than 100km (60 mi) away',
  '2_where_landmark_km': 'Distance in km or miles',
  '2_when_event': 'More than 10 years off',
  '2_when_event_years': 'Number of years off',
  
  // Level 3
  '3_where_region': 'eg: California',
  '3_when_decade': 'eg: 1930s',
  
  // Level 4 (nearby)
  '4_where_landmark': 'Less than 100km (60 mi) away',
  '4_where_landmark_km': 'Distance in km or miles',
  '4_when_event': 'Less than 10 years off',
  '4_when_event_years': 'Number of years',
  
  // Level 5
  '5_where_clues': 'Scene elements (can be precise or general)',
  '5_when_clues': 'Scene elements (can be precise or general)',
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

// Legacy hint penalty constant for backward compatibility
export const HINT_PENALTY = {
  XP: 50,
  ACCURACY_PERCENT: 5
};
