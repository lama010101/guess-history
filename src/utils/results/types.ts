/**
 * Type definitions for game results
 */
import { Badge } from '@/utils/badges/types';

// Defines the structure for a hint debt record
export interface HintDebt {
  hintId: string;
  xpDebt: number;
  accDebt: number;
  label: string;
  hint_type: string;
}

export interface RoundResult {
  // Image/event data
  imageId: string;
  imageTitle: string;
  imageDescription: string;
  imageUrl: string;
  eventYear: number;
  eventLat: number;
  eventLng: number;
  locationName: string;
  
  // User guess data
  guessYear: number;
  guessLat: number;
  guessLng: number;
  
  // Calculated results
  distanceKm: number;
  yearDifference: number;
  locationAccuracy: number;
  timeAccuracy: number;
  xpWhere: number;
  xpWhen: number;
  xpTotal: number;
  timeDifferenceDesc: string;
  
  // Badges earned in this round
  earnedBadges?: Badge[];
  source_citation?: string;
  hintDebts?: HintDebt[];
}

// Maximum values for calculations
export const MAX_RADIUS_KM = 1000;
export const MAX_YEARS_DIFFERENCE = 100;
export const XP_WHERE_MAX = 100;
export const XP_WHEN_MAX = 100;
