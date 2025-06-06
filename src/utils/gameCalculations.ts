/**
 * Game Scoring System
 * 
 * This file contains all the constants and formulas for the Guess History game scoring system.
 * It provides a standardized way to calculate scores across the entire application.
 */

// Maximum thresholds
export const MAX_TIME_DIFF = 30;        // years
export const MAX_DIST_KM = 5000;       // kilometers
export const MAX_XP_TIME = 100;        // maximum XP for time accuracy
export const MAX_XP_LOC = 100;         // maximum XP for location accuracy
export const ROUNDS_PER_GAME = 5;      // standard number of rounds per game

/**
 * Calculate distance between two lat/lng points in kilometers using the Haversine formula
 */
export const calculateDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

/**
 * Calculate time-based XP (0-100)
 * @param guessedYear - The year guessed by the player
 * @param actualYear - The actual year of the historical event
 * @returns XP earned for time accuracy (0-100)
 */
export const calculateTimeXP = (guessedYear: number, actualYear: number): number => {
  return Math.round(Math.max(
    0,
    (1 - Math.min(Math.abs(guessedYear - actualYear), MAX_TIME_DIFF) / MAX_TIME_DIFF) * MAX_XP_TIME
  ));
};

/**
 * Calculate location-based XP (0-100)
 * @param distanceKm - Distance between guess and actual location in kilometers
 * @returns XP earned for location accuracy (0-100)
 */
export const calculateLocationXP = (distanceKm: number): number => {
  return Math.round(Math.max(
    0,
    (1 - Math.min(distanceKm, MAX_DIST_KM) / MAX_DIST_KM) * MAX_XP_LOC
  ));
};

/**
 * Calculate time accuracy percentage (0-100%)
 * @param guessedYear - The year guessed by the player
 * @param actualYear - The actual year of the historical event
 * @returns Accuracy percentage for time (0-100%)
 */
export const calculateTimeAccuracy = (guessedYear: number, actualYear: number): number => {
  const timeXP = calculateTimeXP(guessedYear, actualYear);
  return (timeXP / MAX_XP_TIME) * 100;
};

/**
 * Calculate location accuracy percentage (0-100%)
 * @param distanceKm - Distance between guess and actual location in kilometers
 * @returns Accuracy percentage for location (0-100%)
 */
export const calculateLocationAccuracy = (distanceKm: number): number => {
  const locationXP = calculateLocationXP(distanceKm);
  return (locationXP / MAX_XP_LOC) * 100;
};

/**
 * Calculate XP awarded based on accuracy (for backward compatibility)
 * @deprecated Use calculateTimeXP and calculateLocationXP instead
 */
export const calculateXP = (
  locationAccuracy: number, 
  timeAccuracy: number, 
  xpWhereMax: number = MAX_XP_LOC, 
  xpWhenMax: number = MAX_XP_TIME
): {
  xpWhere: number;
  xpWhen: number;
  xpTotal: number;
} => {
  const xpWhere = Math.round(locationAccuracy * xpWhereMax / 100);
  const xpWhen = Math.round(timeAccuracy * xpWhenMax / 100);
  const xpTotal = xpWhere + xpWhen;
  
  return { xpWhere, xpWhen, xpTotal };
};

/**
 * Calculate round XP and accuracy
 * @param distanceKm - Distance between guess and actual location in kilometers
 * @param guessedYear - The year guessed by the player
 * @param actualYear - The actual year of the historical event
 * @param hintsUsed - Number of hints used in this round
 * @param hintPenalty - XP penalty per hint used (default: 30)
 * @returns Object containing XP and accuracy metrics for the round
 */
export const calculateRoundScore = (
  distanceKm: number, 
  guessedYear: number, 
  actualYear: number, 
  hintsUsed: number = 0,
  hintPenalty: number = 30
): {
  timeXP: number;
  locationXP: number;
  hintPenalty: number;
  hintPenaltyPercent: number;
  roundXP: number;
  roundPercent: number;
} => {
  const timeXP = calculateTimeXP(guessedYear, actualYear);
  const locationXP = calculateLocationXP(distanceKm);
  
  // Calculate hint penalties
  const totalHintPenalty = hintsUsed * hintPenalty;
  const hintPenaltyPercent = hintsUsed * 30; // 30% per hint
  
  // Combined per-round values with rounding and hint penalties
  const roundXPBeforePenalty = timeXP + locationXP; // 0-200
  const roundXP = Math.max(0, Math.round(roundXPBeforePenalty - totalHintPenalty));
  
  // Calculate percentage with hint penalty
  const percentBeforePenalty = (roundXPBeforePenalty / (MAX_XP_TIME + MAX_XP_LOC)) * 100;
  const roundPercent = Math.max(0, Math.round(percentBeforePenalty - hintPenaltyPercent));
  
  return {
    timeXP,
    locationXP,
    hintPenalty: totalHintPenalty,
    hintPenaltyPercent,
    roundXP,
    roundPercent
  };
};

/**
 * Calculate final game score from all rounds
 * @param roundScores - Array of round scores
 * @returns Object containing final XP and accuracy for the game
 */
export const calculateFinalScore = (roundScores: Array<{
  roundXP: number;
  roundPercent: number;
  hintPenalty?: number;
  hintPenaltyPercent?: number;
}>): {
  finalXP: number;
  finalPercent: number;
  totalHintPenalty: number;
  totalHintPenaltyPercent: number;
} => {
  // Calculate total hint penalties
  const totalHintPenalty = roundScores.reduce((sum, round) => sum + (round.hintPenalty || 0), 0);
  const totalHintPenaltyPercent = roundScores.reduce((sum, round) => sum + (round.hintPenaltyPercent || 0), 0) / roundScores.length;
  
  // Sum up all round XP values and round to nearest integer
  const finalXP = Math.round(roundScores.reduce((sum, round) => sum + round.roundXP, 0));
  
  // Average of all round percentages and round to nearest integer
  const finalPercent = roundScores.length > 0 ?
    Math.round(roundScores.reduce((sum, round) => sum + round.roundPercent, 0) / roundScores.length) :
    0;
    
  console.log('[GameCalculations] Final Score:', {
    roundScores: roundScores.map((r, i) => ({
      round: i + 1,
      roundXP: r.roundXP,
      roundPercent: r.roundPercent,
      hintPenalty: r.hintPenalty || 0,
      hintPenaltyPercent: r.hintPenaltyPercent || 0
    })),
    finalXP,
    finalPercent,
    totalHintPenalty,
    totalHintPenaltyPercent
  });
  
  return {
    finalXP,
    finalPercent,
    totalHintPenalty,
    totalHintPenaltyPercent
  };
};

/**
 * Calculate global stats from all games played
 * @param gameScores - Array of game scores
 * @returns Object containing global XP and accuracy
 */
export const calculateGlobalStats = (gameScores: Array<{
  finalXP: number;
  finalPercent: number;
}>): {
  globalXP: number;
  globalPercent: number;
} => {
  // Sum up XP from all games
  const globalXP = gameScores.reduce((sum, game) => sum + game.finalXP, 0);
  
  // Average accuracy across all games
  const globalPercent = gameScores.length > 0 ?
    gameScores.reduce((sum, game) => sum + game.finalPercent, 0) / gameScores.length :
    0;
  
  return {
    globalXP,
    globalPercent
  };
};

/**
 * Get time difference description
 */
export const getTimeDifferenceDescription = (guessYear: number, actualYear: number): string => {
  const diff = Math.abs(guessYear - actualYear);
  if (diff === 0) return "Perfect!";
  
  return `${diff} year${diff !== 1 ? 's' : ''} off`;
};
