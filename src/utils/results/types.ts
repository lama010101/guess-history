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
  isCorrect?: boolean; // True if the answer is correct (e.g., locationAccuracy >= 95)

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
  guessYear: number | null;
  guessLat: number | null;
  guessLng: number | null;
  
  // Calculated results
  distanceKm: number | null;
  yearDifference: number | null;
  locationAccuracy: number;
  timeAccuracy: number;
  accuracy: number;
  xpWhere: number;
  xpWhen: number;
  xpTotal: number;
  timeDifferenceDesc: string;
  
  // Badges earned in this round
  earnedBadges?: Badge[];
  source_citation?: string;
  hintDebts?: HintDebt[];
  confidence?: number;
  hintsUsed?: number;
}

// Maximum values for calculations
export const MAX_RADIUS_KM = 1000;
export const MAX_YEARS_DIFFERENCE = 100;
export const XP_WHERE_MAX = 100;
export const XP_WHEN_MAX = 100;
