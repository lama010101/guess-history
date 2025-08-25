// Utility to compute per-level constraints for Level Up mode
// No UI changes here. Pure logic used by GameContext.startLevelUpGame

export interface LevelConstraints {
  minYear: number;
  maxYear: number;
  timerSeconds: number;
}

// Defaults chosen to broadly cover the likely dataset range while keeping gameplay reasonable
const DEFAULT_YEAR_MIN = 1700;
const DEFAULT_YEAR_MAX = 2025;

const START_WINDOW = 80; // years at level 1
const END_WINDOW = 10;   // years at level 100

const START_TIMER = 90;  // seconds at level 1
const END_TIMER = 30;    // seconds at level 100

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function getLevelConstraints(level: number, opts?: { yearMin?: number; yearMax?: number }): LevelConstraints {
  const lvl = clamp(Math.round(level), 1, 100);
  const yearMin = opts?.yearMin ?? DEFAULT_YEAR_MIN;
  const yearMax = opts?.yearMax ?? DEFAULT_YEAR_MAX;

  // Interpolate window size from START_WINDOW -> END_WINDOW as level increases
  const t = (lvl - 1) / 99; // 0..1
  const windowYears = Math.round(START_WINDOW + (END_WINDOW - START_WINDOW) * t);

  // Center the window around a mid-year in the overall range
  const mid = Math.round((yearMin + yearMax) / 2);
  let minYear = clamp(mid - Math.floor(windowYears / 2), yearMin, yearMax);
  let maxYear = clamp(minYear + windowYears, yearMin, yearMax);
  if (maxYear - minYear < windowYears) {
    // shift left if we hit the right bound
    minYear = clamp(maxYear - windowYears, yearMin, yearMax);
  }

  // Interpolate timer from START_TIMER -> END_TIMER as level increases
  const timerSeconds = Math.round(START_TIMER + (END_TIMER - START_TIMER) * t);

  return { minYear, maxYear, timerSeconds };
}
