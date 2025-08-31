import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { HINT_COSTS } from '@/constants/hints';
import { useEffect, useMemo, useRef, useState } from 'react';

// Zod schema: start with hints; allow unknown sections via passthrough so we can grow safely
export const HintCostSchema = z.object({
  xp: z.number().int().min(0),
  acc: z.number().int().min(0),
});

export const GameConfigSchema = z
  .object({
    hints: z.record(HintCostSchema).default({}),
  })
  .passthrough();

export type GameConfig = z.infer<typeof GameConfigSchema>;

// Defaults sourced from existing constants
const defaultConfig: GameConfig = {
  hints: HINT_COSTS,
};

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

export async function getGameConfig(): Promise<GameConfig> {
  const { data, error } = await supabase
    .from('game_config' as any)
    .select('config')
    .eq('id', 'global')
    .maybeSingle();
  if (error) {
    // Fallback to defaults on error
    return GameConfigSchema.parse(defaultConfig);
  }
  const dbCfg = (data?.config ?? {}) as any;
  const merged = deepMerge(defaultConfig, dbCfg);
  return GameConfigSchema.parse(merged);
}

// Real-time subscription hook
export function useGameConfig() {
  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const mounted = useRef(false);

  useEffect(() => {
    let isActive = true;
    (async () => {
      try {
        const cfg = await getGameConfig();
        if (!isActive) return;
        setConfig(cfg);
      } catch {}
    })();

    const channel = supabase
      .channel('game_config_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_config' }, async (payload) => {
        try {
          const cfg = await getGameConfig();
          setConfig(cfg);
        } catch {}
      })
      .subscribe((status) => {
        // no-op
      });

    mounted.current = true;
    return () => {
      isActive = false;
      try { supabase.removeChannel(channel); } catch {}
    };
  }, []);

  return config;
}

// Helpers
export function getHintPenalty(config: GameConfig, types: string[]): { xp: number; acc: number } {
  let xp = 0;
  let acc = 0;
  for (const t of types) {
    const c = config.hints?.[t];
    if (c) {
      xp += c.xp;
      acc += c.acc;
    }
  }
  return { xp, acc };
}
