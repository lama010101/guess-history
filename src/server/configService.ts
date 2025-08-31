import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GameConfigSchema } from '@/config/gameConfig';

// A deep-partial version for patch validation
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export const GameConfigPatchSchema = GameConfigSchema.deepPartial();

export type GameConfig = z.infer<typeof GameConfigSchema>;
export type GameConfigPatch = DeepPartial<GameConfig>;

function deepMerge<T>(base: T, override: any): T {
  if (override == null) return base;
  if (Array.isArray(base) || typeof base !== 'object') return (override as T) ?? base;
  const out: any = { ...(base as any) };
  for (const k of Object.keys(override)) {
    const bv = (base as any)[k];
    const ov = (override as any)[k];
    if (bv && typeof bv === 'object' && !Array.isArray(bv) && ov && typeof ov === 'object' && !Array.isArray(ov)) {
      out[k] = deepMerge(bv, ov);
    } else {
      out[k] = ov;
    }
  }
  return out as T;
}

export async function fetchConfigRow(client: SupabaseClient): Promise<any> {
  const { data, error } = await client
    .from('game_config' as any)
    .select('id, config, updated_at')
    .eq('id', 'global')
    .maybeSingle();
  if (error) throw error;
  return data ?? { id: 'global', config: {}, updated_at: null };
}

export async function saveConfigPatch(client: SupabaseClient, patch: GameConfigPatch) {
  // Validate patch shape (deep partial)
  const validatedPatch = GameConfigPatchSchema.parse(patch) as GameConfigPatch;

  // Load current row
  const current = await fetchConfigRow(client);
  const currentConfig = (current?.config ?? {}) as any;

  // Merge and validate final
  const merged = deepMerge(currentConfig, validatedPatch);
  const finalConfig = GameConfigSchema.parse(merged);

  // Upsert
  const { data, error } = await client
    .from('game_config' as any)
    .upsert({ id: 'global', config: finalConfig })
    .select('id, updated_at')
    .single();
  if (error) throw error;
  return { ok: true, updated_at: data?.updated_at };
}
