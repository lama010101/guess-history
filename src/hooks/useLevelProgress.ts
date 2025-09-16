import { useCallback } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/integrations/supabase/types';

export function useLevelProgress() {
  const supabase = useSupabaseClient<Database>();

  const getCurrentLevel = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('level_up_best_level')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching level progress:', error);
      return 1; // Default to level 1 if there's an error
    }

    return data?.level_up_best_level || 1;
  }, [supabase]);

  const updateLevelProgress = useCallback(async (userId: string, completedLevel: number) => {
    const { data: currentData } = await supabase
      .from('profiles')
      .select('level_up_best_level')
      .eq('id', userId)
      .single();

    const currentBestLevel = currentData?.level_up_best_level || 0;
    
    // Only update if the completed level is higher than the current best
    if (completedLevel > currentBestLevel) {
      const { error } = await supabase
        .from('profiles')
        .update({ level_up_best_level: completedLevel })
        .eq('id', userId);

      if (error) {
        console.error('Error updating level progress:', error);
        return { success: false, error };
      }
      
      return { success: true, newLevel: completedLevel };
    }
    
    return { success: true, newLevel: currentBestLevel };
  }, [supabase]);

  return {
    getCurrentLevel,
    updateLevelProgress,
  };
}
