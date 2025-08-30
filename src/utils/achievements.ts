import { supabase } from '@/integrations/supabase/client';
import type { RoundResult } from '@/types';

// Helper: upsert an achievement, deduped by (user_id, type, context_id)
async function upsertAchievement(params: {
  userId: string;
  type: string;
  level?: string | null;
  value?: number | null;
  contextId?: string | null;
}) {
  const { userId, type, level = null, value = null, contextId = null } = params;
  const { error } = await supabase
    .from('achievements')
    .upsert(
      {
        user_id: userId,
        type,
        level,
        value,
        context_id: contextId,
      },
      { onConflict: 'user_id,type,context_id' }
    );
  if (error) {
    console.warn('[achievements] upsert failed', { type, contextId, error });
  }
}

export async function awardRoundAchievements(params: {
  userId: string;
  contextId: string | null;
  actualYear: number;
  result: RoundResult;
}): Promise<string[]> {
  const { userId, contextId, actualYear, result } = params;
  const awarded: string[] = [];

  // Perfect time (year diff == 0)
  const yearDiff = typeof result.guessYear === 'number' ? Math.abs(result.guessYear - actualYear) : null;
  if (yearDiff === 0) {
    await upsertAchievement({ userId, type: 'gold_time_round', level: 'gold', value: 1, contextId });
    awarded.push('gold_time_round');
  }

  // Perfect location (distance == 0)
  if (result.distanceKm === 0) {
    await upsertAchievement({ userId, type: 'gold_location_round', level: 'gold', value: 1, contextId });
    awarded.push('gold_location_round');
  }

  // Perfect combo (both perfect)
  if (yearDiff === 0 && result.distanceKm === 0) {
    await upsertAchievement({ userId, type: 'gold_combo_round', level: 'gold', value: 1, contextId });
    awarded.push('gold_combo_round');
  }

  return awarded;
}

export async function awardGameAchievements(params: {
  userId: string;
  contextId: string | null;
  actualYears: number[];
  results: RoundResult[];
}): Promise<string[]> {
  const { userId, contextId, actualYears, results } = params;
  const awarded: string[] = [];
  if (!results.length || actualYears.length !== results.length) return awarded;

  // Check perfect across game
  let allPerfectYear = true;
  let allPerfectLocation = true;

  // Compute longest consecutive combo-perfect streak within this game
  let currentComboStreak = 0;
  let maxComboStreak = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const diff = typeof r.guessYear === 'number' ? Math.abs(r.guessYear - actualYears[i]) : null;
    const timePerfect = diff === 0;
    const locPerfect = r.distanceKm === 0;

    if (!timePerfect) allPerfectYear = false;
    if (!locPerfect) allPerfectLocation = false;

    if (timePerfect && locPerfect) {
      currentComboStreak += 1;
      if (currentComboStreak > maxComboStreak) maxComboStreak = currentComboStreak;
    } else {
      currentComboStreak = 0;
    }
  }

  if (allPerfectYear) {
    await upsertAchievement({ userId, type: 'gold_time_game', level: 'gold', value: results.length, contextId });
    awarded.push('gold_time_game');
  }
  if (allPerfectLocation) {
    await upsertAchievement({ userId, type: 'gold_location_game', level: 'gold', value: results.length, contextId });
    awarded.push('gold_location_game');
  }
  if (allPerfectYear && allPerfectLocation) {
    await upsertAchievement({ userId, type: 'gold_combo_game', level: 'gold', value: results.length, contextId });
    awarded.push('gold_combo_game');
  }

  // Record the longest combo streak within this session/game
  if (maxComboStreak > 0) {
    await upsertAchievement({ userId, type: 'round_streak', level: null, value: maxComboStreak, contextId });
    awarded.push('round_streak');
  }

  return awarded;
}
