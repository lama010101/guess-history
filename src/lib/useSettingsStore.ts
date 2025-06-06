import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

interface SettingsState {
  soundEnabled: boolean;
  timerSeconds: number;
  enableSound: () => void;
  disableSound: () => void;
  toggleSound: () => void;
  setTimerSeconds: (seconds: number) => void;
  syncToSupabase: (userId: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  soundEnabled: true,
  timerSeconds: 60, // Default to 60 seconds
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
  syncToSupabase: async (userId: string) => {
    if (!userId) return;
    
    // Store settings as JSON in value field
    await supabase
      .from('settings')
      .upsert({
        id: userId, // Use userId as the id
        value: {
          soundEnabled: get().soundEnabled,
          timerSeconds: get().timerSeconds
        }
      });
  }
})); 