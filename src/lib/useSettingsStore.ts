import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface SettingsState {
  soundEnabled: boolean;
  timerSeconds: number;
  vibrateEnabled: boolean;
  gyroscopeEnabled: boolean;
  enableSound: () => void;
  disableSound: () => void;
  toggleSound: () => void;
  setTimerSeconds: (seconds: number) => void;
  toggleVibrate: () => void;
  toggleGyroscope: () => void;
  setFromUserSettings: (settings: {
    sound_enabled?: boolean;
    vibrate_enabled?: boolean;
    gyroscope_enabled?: boolean;
    timer_seconds?: number;
  }) => void;
  syncToSupabase: (userId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: true,
  timerSeconds: 60, // Default to 60 seconds
  vibrateEnabled: false,
  gyroscopeEnabled: false,
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
  setFromUserSettings: (settings) => {
    set({
      soundEnabled: settings.sound_enabled ?? get().soundEnabled,
      vibrateEnabled: settings.vibrate_enabled ?? get().vibrateEnabled,
      gyroscopeEnabled: settings.gyroscope_enabled ?? get().gyroscopeEnabled,
      timerSeconds: settings.timer_seconds ?? get().timerSeconds,
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
    };

    await supabase
      .from('settings')
      .upsert({ id: userId, value: merged });
  }
})); 