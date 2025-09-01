// Utility to compute per-level constraints for Level Up mode
// Pure logic only. Used by GameContext.startLevelUpGame and admin wiring.

/**
 * Complete set of constraints for a Level Up level
 */
export interface LevelConstraints {
  // Gameplay constraints
  timerSec: number;
  levelYearRange: {
    start: number;
    end: number;
  };
  
  // Accuracy requirements
  requiredOverallAccuracy: number;
  requiredRoundAccuracy: number;
  requiredQualifyingRounds: number;
  
  // Metadata
  level: number;
}

/**
 * Admin-tunable parameters for Level Up mode
 */
export interface LevelUpTuneables {
  // Game settings
  ROUNDS_PER_GAME: number;       // Default: 5
  
  // Timer settings (in seconds)
  TIMER_MAX_SEC: number;         // Level 1 timer (e.g., 300)
  TIMER_MIN_SEC: number;         // Level 100 timer (e.g., 5)
  
  // Year range settings
  YEAR_END_FIXED: number;        // Fixed upper bound (2025)
  YEAR_START_L1: number;         // Level 1 start year (e.g., 1975)
  YEAR_START_L100_OVERRIDE: number | null; // Optional override for L100 start year
  
  // Accuracy requirements (percentages)
  OVERALL_ACC_L1: number;        // Overall accuracy required at level 1 (e.g., 50)
  OVERALL_ACC_L100: number;      // Overall accuracy required at level 100 (e.g., 100)
  ROUND_ACC_L1: number;          // Round accuracy required at level 1 (e.g., 70)
  ROUND_ACC_L100: number;        // Round accuracy required at level 100 (e.g., 100)
  
  // Development
  logging?: boolean;             // Enable debug logging
}

// Default configuration (matches spec)
export const defaultLevelUpTuneables: LevelUpTuneables = {
  ROUNDS_PER_GAME: 5,
  TIMER_MAX_SEC: 300,    // 5 minutes
  TIMER_MIN_SEC: 5,      // 5 seconds
  YEAR_END_FIXED: 2025,
  YEAR_START_L1: 1975,
  YEAR_START_L100_OVERRIDE: null, // Will use DB's oldest year if null
  OVERALL_ACC_L1: 50,
  OVERALL_ACC_L100: 100,
  ROUND_ACC_L1: 70,
  ROUND_ACC_L100: 100,
  logging: false,
};

// Linear interpolation helper
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Clamp a value between min and max
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Development logging
const isDev = (import.meta as any)?.env?.DEV === true;
function log(enabled: boolean | undefined, ...args: any[]) {
  if (enabled && isDev) console.log('[LevelUp][Config]', ...args);
}

/**
 * Computes the oldest event year from a collection of years
 * @param years Array of years to check
 * @returns Oldest year or null if no valid years found
 */
export function getOldestEventYear(years: number[]): number | null {
  if (!Array.isArray(years) || years.length === 0) return null;
  return years.reduce((min, y) => 
    Number.isFinite(y) && y < min ? Math.floor(y) : min, 
    Number.POSITIVE_INFINITY
  );
}

/**
 * Factory function to create a constraints getter with bound tuneables and dataset bounds
 */
export function makeGetLevelUpConstraints(
  tune: Partial<LevelUpTuneables> = {}, 
  oldestYearInDb?: number
) {
  const t: LevelUpTuneables = { ...defaultLevelUpTuneables, ...tune };
  
  // Determine the oldest year to use (admin override or from DB)
  const effectiveOldestYear = t.YEAR_START_L100_OVERRIDE !== null 
    ? Math.min(t.YEAR_START_L100_OVERRIDE, t.YEAR_END_FIXED - 1)
    : oldestYearInDb;
  
  // If we have a valid oldest year, ensure it's not newer than our L1 start
  const oldestValidYear = effectiveOldestYear && Number.isFinite(effectiveOldestYear)
    ? Math.min(effectiveOldestYear, t.YEAR_START_L1 - 1)
    : t.YEAR_START_L1 - 1;

  return function getLevelUpConstraints(level: number): LevelConstraints {
    const lvl = clamp(Math.round(level), 1, 100);
    const progress = (lvl - 1) / 99; // 0 at level 1, 1 at level 100
    
    // Calculate year range
    const yearStart = Math.round(
      lerp(t.YEAR_START_L1, oldestValidYear, progress)
    );
    
    // Calculate timer (decreases from max to min)
    const timerSec = Math.round(
      lerp(t.TIMER_MAX_SEC, t.TIMER_MIN_SEC, progress)
    );
    
    // Calculate accuracy requirements
    const requiredOverallAccuracy = Math.round(
      lerp(t.OVERALL_ACC_L1, t.OVERALL_ACC_L100, progress)
    );
    
    const requiredRoundAccuracy = Math.round(
      lerp(t.ROUND_ACC_L1, t.ROUND_ACC_L100, progress)
    );
    
    // Qualifying rounds increase with level (ceil to ensure at least 1)
    const requiredQualifyingRounds = Math.max(1, Math.ceil(
      lerp(1, t.ROUNDS_PER_GAME, progress)
    ));
    
    const constraints = {
      level: lvl,
      timerSec,
      levelYearRange: {
        start: yearStart,
        end: t.YEAR_END_FIXED
      },
      requiredOverallAccuracy,
      requiredRoundAccuracy,
      requiredQualifyingRounds,
    };
    
    log(t.logging, `[LevelUp][Start] constraints`, constraints);
    return constraints;
  };
}

// Backward compatibility alias
export const getLevelUpConstraints = makeGetLevelUpConstraints();
