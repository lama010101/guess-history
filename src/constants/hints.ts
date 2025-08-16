/**
 * Hint system constants for Guess-History
 * Defines costs, penalties, and display information for the v2 hint system
 */

// Hint costs and accuracy penalties
export const HINT_COSTS = {
  // Level 1 Hints (Basic)
  continent: { xp: 10, acc: 1 },
  century: { xp: 10, acc: 1 },
  
  // Level 2 Hints (Intermediate)
  distantLandmark: { xp: 20, acc: 2 },
  distantDistance: { xp: 10, acc: 1 },
  distantEvent: { xp: 20, acc: 2 },
  distantTimeDiff: { xp: 10, acc: 1 },
  
  // Level 3 Hints (Advanced)
  region: { xp: 50, acc: 5 },
  narrowDecade: { xp: 50, acc: 5 },
  
  // Level 4 Hints (Precise)
  nearbyLandmark: { xp: 30, acc: 3 },
  nearbyDistance: { xp: 10, acc: 1 },
  contemporaryEvent: { xp: 30, acc: 3 },
  closeTimeDiff: { xp: 10, acc: 1 },

  // Level 5 Hints (Full Clues)
  whereClues: { xp: 40, acc: 4 },
  whenClues: { xp: 40, acc: 4 },
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
  
  // Level 2
  'distant_landmark': 'Remote Landmark',
  'distant_distance': 'KM Far Reference',
  'distant_event': 'Historical Context',
  'distant_time_diff': 'Time Period Range',
  
  // Level 3
  'region': 'Region',
  'narrow_decade': 'Decade',
  'nearby_landmark': 'Nearby Landmark',
  
  // Level 4
  'contemporary_event': 'Near Event',
  'nearby_distance': 'Distance Nearby',
  'close_time_diff': 'Time Difference (Close)',
  
  // Level 5
  'where_clues': 'Geographical Clues',
  'when_clues': 'Temporal Clues',
  
  // New hint types with numeric prefixes
  // Level 1
  '1_when_century': "Century",
  
  // Level 2
  '2_where_landmark': "Remote Landmark",
  '2_where_landmark_km': "Distance to Remote Landmark",
  '2_when_event': "Remote Event",
  '2_when_event_years': "Years From Remote Event",
  
  // Level 3
  '3_where_region': "Region",
  '3_when_decade': "Decade",
  
  // Level 4
  '4_where_landmark': "Nearby Landmark",
  '4_where_landmark_km': "Distance to Nearby Landmark",
  '4_when_event': "Nearby Event",
  '4_when_event_years': "Years From Nearby Event",
  
  // Level 5
  '5_where_clues': "Geographical Clues",
  '5_when_clues': "Temporal Clues"
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
