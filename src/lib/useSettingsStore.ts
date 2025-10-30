import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

const YEAR_MIN = -500;
const YEAR_MAX = 2025;
const YEAR_MIN_SPAN = 200;

export const YEAR_RANGE_MIN = YEAR_MIN;
export const YEAR_RANGE_MAX = YEAR_MAX;
export const YEAR_RANGE_MIN_SPAN = YEAR_MIN_SPAN;

export const sanitizeYearRange = (range?: [number, number]): [number, number] => {
  const rawStart = Array.isArray(range) && range.length > 0 ? range[0] : YEAR_MIN;
  const rawEnd = Array.isArray(range) && range.length > 1 ? range[1] : YEAR_MAX;
  let start = Math.min(Math.max(Number.isFinite(rawStart) ? Number(rawStart) : YEAR_MIN, YEAR_MIN), YEAR_MAX);
  let end = Math.min(Math.max(Number.isFinite(rawEnd) ? Number(rawEnd) : YEAR_MAX, YEAR_MIN), YEAR_MAX);

  if (end < start) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  if (start > YEAR_MAX - YEAR_MIN_SPAN) {
    start = YEAR_MAX - YEAR_MIN_SPAN;
  }

  if (end < YEAR_MIN + YEAR_MIN_SPAN) {
    end = YEAR_MIN + YEAR_MIN_SPAN;
  }

  if (end - start < YEAR_MIN_SPAN) {
    const expandedEnd = Math.min(YEAR_MAX, start + YEAR_MIN_SPAN);
    if (expandedEnd - start >= YEAR_MIN_SPAN) {
      end = expandedEnd;
    } else {
      start = Math.max(YEAR_MIN, end - YEAR_MIN_SPAN);
      end = Math.min(YEAR_MAX, start + YEAR_MIN_SPAN);
    }
  }

  // Final guards to keep values within range after adjustments
  if (start < YEAR_MIN) {
    start = YEAR_MIN;
    end = Math.min(YEAR_MAX, start + YEAR_MIN_SPAN);
  }

  if (end > YEAR_MAX) {
    end = YEAR_MAX;
    start = Math.max(YEAR_MIN, end - YEAR_MIN_SPAN);
  }

  return [start, end];
};

const readStoredYearRange = (): [number, number] => {
  if (typeof window === 'undefined') return [YEAR_MIN, YEAR_MAX];
  try {
    const saved = localStorage.getItem('globalGameSettings');
    if (!saved) return [YEAR_MIN, YEAR_MAX];
    const parsed = JSON.parse(saved);
    const stored: [number, number] = [parsed?.yearMin, parsed?.yearMax];
    return sanitizeYearRange(stored);
  } catch {
    return [YEAR_MIN, YEAR_MAX];
  }
};

interface SettingsState {
  soundEnabled: boolean;
  timerSeconds: number;
  vibrateEnabled: boolean;
  gyroscopeEnabled: boolean;
  // New: distance units and map label language preferences
  distanceUnit: 'km' | 'mi';
  mapLabelLanguage: 'local' | 'en';
  enableSound: () => void;
  disableSound: () => void;
  toggleSound: () => void;
  setTimerSeconds: (seconds: number) => void;
  toggleVibrate: () => void;
  toggleGyroscope: () => void;
  setDistanceUnit: (unit: 'km' | 'mi') => void;
  setMapLabelLanguage: (mode: 'local' | 'en') => void;
  setFromUserSettings: (settings: {
    sound_enabled?: boolean;
    vibrate_enabled?: boolean;
    gyroscope_enabled?: boolean;
    timer_seconds?: number;
    distance_unit?: 'km' | 'mi';
    language?: string;
    year_min?: number;
    year_max?: number;
  }) => void;
  syncToSupabase: (userId: string) => Promise<void>;
  yearRange: [number, number];
  setYearRange: (range: [number, number]) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: true,
  timerSeconds: 120, // Default to 120 seconds (2 minutes)
  vibrateEnabled: false,
  gyroscopeEnabled: false,
  distanceUnit: 'km',
  mapLabelLanguage: 'en',
  yearRange: readStoredYearRange(),
  enableSound: () => {
    set({ soundEnabled: true });
  },
  disableSound: () => {
    set({ soundEnabled: false });
  },
  toggleSound: () => {
    set(state => ({ soundEnabled: !state.soundEnabled }));
  },
  setTimerSeconds: (seconds: number) => {
    set({ timerSeconds: seconds });
  },
  toggleVibrate: () => {
    set(state => ({ vibrateEnabled: !state.vibrateEnabled }));
  },
  toggleGyroscope: () => {
    set(state => ({ gyroscopeEnabled: !state.gyroscopeEnabled }));
  },
  setDistanceUnit: (unit) => {
    set({ distanceUnit: unit });
  },
  setMapLabelLanguage: (mode) => {
    set({ mapLabelLanguage: mode });
  },
  setFromUserSettings: (settings) => {
    const providedYearRange =
      typeof settings.year_min === 'number' || typeof settings.year_max === 'number';
    const nextYearRange = providedYearRange
      ? sanitizeYearRange([settings.year_min as number | undefined, settings.year_max as number | undefined])
      : get().yearRange;
    set({
      soundEnabled: settings.sound_enabled ?? get().soundEnabled,
      vibrateEnabled: settings.vibrate_enabled ?? get().vibrateEnabled,
      gyroscopeEnabled: settings.gyroscope_enabled ?? get().gyroscopeEnabled,
      timerSeconds: settings.timer_seconds ?? get().timerSeconds,
      distanceUnit: settings.distance_unit ?? get().distanceUnit,
      mapLabelLanguage: (settings.language === 'en' ? 'en' : 'local'),
      yearRange: nextYearRange,
    });
  },
  syncToSupabase: async (userId: string) => {
    if (!userId) return;
    // Fetch current settings JSON to merge with latest local store
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('id', userId)
      .maybeSingle();

    const current = (data?.value as any) || {};
    const merged = {
      ...current,
      // Use snake_case keys to align with profileService
      sound_enabled: get().soundEnabled,
      vibrate_enabled: get().vibrateEnabled,
      gyroscope_enabled: get().gyroscopeEnabled,
      // timer is optional in profile service; keep if previously present
      timer_seconds: get().timerSeconds,
      distance_unit: get().distanceUnit,
      language: get().mapLabelLanguage === 'en' ? 'en' : 'local',
      year_min: get().yearRange[0],
      year_max: get().yearRange[1],
    };

    await supabase
      .from('settings')
      .upsert({ id: userId, value: merged });
  },
  setYearRange: (range) => {
    const sanitized = sanitizeYearRange(range);
    set({ yearRange: sanitized });
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('globalGameSettings');
        const parsed = saved ? JSON.parse(saved) : {};
        localStorage.setItem('globalGameSettings', JSON.stringify({
          ...parsed,
          yearMin: sanitized[0],
          yearMax: sanitized[1],
        }));
      } catch {}
    }
  }
}));