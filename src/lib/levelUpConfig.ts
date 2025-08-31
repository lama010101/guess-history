// Utility to compute per-level constraints for Level Up mode
// No UI changes here. Pure logic used by GameContext.startLevelUpGame

export interface LevelConstraints {
  minYear: number;
  maxYear: number;
  timerSeconds: number;
}

// Spec:
// - Fixed max year at 2026
// - Start year shifts older as level increases: level 1 -> 1925, level 100 -> 1826
// - Timer interpolates: level 1 -> 90s, level 100 -> 30s
const FIXED_MAX_YEAR = 2026;
const L1_START_MIN_YEAR = 1925;
const L100_START_MIN_YEAR = 1826;

const START_TIMER = 90; // seconds at level 1
const END_TIMER = 30;   // seconds at level 100

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getLevelConstraints(
  level: number,
  opts?: {
    fixedMaxYear?: number;
    startMinYearL1?: number;
    startMinYearL100?: number;
    startTimerSec?: number;
    endTimerSec?: number;
  }
): LevelConstraints {
  const lvl = clamp(Math.round(level), 1, 100);
  const maxYear = opts?.fixedMaxYear ?? FIXED_MAX_YEAR;
  const startMinL1 = opts?.startMinYearL1 ?? L1_START_MIN_YEAR;
  const startMinL100 = opts?.startMinYearL100 ?? L100_START_MIN_YEAR;
  const startTimer = opts?.startTimerSec ?? START_TIMER;
  const endTimer = opts?.endTimerSec ?? END_TIMER;

  // Interpolate t in [0,1] across 100 levels
  const t = (lvl - 1) / 99;

  // Linearly interpolate the start (min) year older as level increases
  const minYearFloat = startMinL1 + (startMinL100 - startMinL1) * t; // moves older with higher level
  const minYear = Math.round(minYearFloat);

  // Fixed max year
  const maxYearClamped = Math.max(minYear, maxYear);

  // Interpolate timer from start -> end
  const timerSeconds = Math.round(startTimer + (endTimer - startTimer) * t);

  return { minYear, maxYear: maxYearClamped, timerSeconds };
}

// Alias for clarity with documentation and planning notes
export const getLevelUpConstraints = getLevelConstraints;
