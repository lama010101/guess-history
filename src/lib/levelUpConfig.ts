// Utility to compute per-level constraints for Level Up mode
// Pure logic only. Used by GameContext.startLevelUpGame and admin wiring.

export interface LevelConstraints {
  minYear: number;
  maxYear: number;
  timerSeconds: number;
}

// Public shape for admin tuneables
export interface LevelUpTuneables {
  fixedMaxYear: number;        // hard ceiling for year slider upper bound
  startMinYearL1: number;      // min year at level 1
  startMinYearL100: number;    // min year at level 100 (older)
  startTimerSec: number;       // seconds at level 1
  endTimerSec: number;         // seconds at level 100
  logging?: boolean;           // enables dev logging in this module
}

// Defaults per spec (admin can override later via persistence layer)
export const defaultLevelUpTuneables: LevelUpTuneables = {
  fixedMaxYear: 2026,
  startMinYearL1: 1925,
  startMinYearL100: 1826,
  startTimerSec: 300,
  endTimerSec: 30,
  logging: false,
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Optional dev guard
const isDev = (import.meta as any)?.env?.DEV === true;
function log(enabled: boolean | undefined, ...args: any[]) {
  if (enabled && isDev) console.log('[LevelUp][Config]', ...args);
}

// Helper: compute oldest event year from a collection (pure, no IO)
export function getOldestEventYear(years: number[]): number | null {
  if (!Array.isArray(years) || years.length === 0) return null;
  return years.reduce((min, y) => (Number.isFinite(y) && y < min ? y : min), Number.POSITIVE_INFINITY);
}

// Factory to build a constraints getter bound to tuneables and dataset bound (oldestYear)
export function makeGetLevelUpConstraints(tune: Partial<LevelUpTuneables> = {}, oldestYear?: number) {
  const t: LevelUpTuneables = { ...defaultLevelUpTuneables, ...tune };
  const hasOldest = Number.isFinite(oldestYear);

  return function get(level: number): LevelConstraints {
    const lvl = clamp(Math.round(level), 1, 100);
    const tau = (lvl - 1) / 99; // t in [0,1]

    // Interpolate min year towards older bound
    const minYearFloat = t.startMinYearL1 + (t.startMinYearL100 - t.startMinYearL1) * tau;
    let minYear = Math.round(minYearFloat);

    // Respect dataset lower bound if provided
    if (hasOldest && typeof oldestYear === 'number') {
      minYear = Math.max(minYear, oldestYear as number);
    }

    // Upper bound is fixed but never below minYear
    const maxYear = Math.max(minYear, t.fixedMaxYear);

    // Interpolate timer
    const timerSeconds = Math.round(t.startTimerSec + (t.endTimerSec - t.startTimerSec) * tau);

    log(t.logging, { lvl, tau, minYear, maxYear, timerSeconds });
    return { minYear, maxYear, timerSeconds };
  };
}

// Back-compat: thin wrapper using defaults with optional opt overrides
export function getLevelConstraints(
  level: number,
  opts?: Partial<LevelUpTuneables>
): LevelConstraints {
  const getter = makeGetLevelUpConstraints(opts);
  return getter(level);
}

// Alias maintained for clarity in callers/docs
export const getLevelUpConstraints = getLevelConstraints;
