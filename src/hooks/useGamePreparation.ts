import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PreparedImage {
  id: string;
  title: string;
  description?: string | null;
  source_citation?: string | null;
  latitude: number;
  longitude: number;
  year: number;
  image_url: string;
  location_name: string;
  url: string;
  firebase_url?: string;
  confidence?: number;
}

export interface PrepareOptions {
  userId: string | null;
  roomId?: string | null;
  count: number;
  seed?: string | null;
  usePlayerHistory?: boolean;
  minYear?: number | null;
  maxYear?: number | null;
  nonBlocking?: boolean;
}

export type PrepStatus = 'idle' | 'selecting' | 'fetching' | 'preloading' | 'done' | 'error';

export function useGamePreparation() {
  const [status, setStatus] = useState<PrepStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [prepared, setPrepared] = useState<PreparedImage[]>([]);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());
  const abortRef = useRef<boolean>(false);

  const resolveImageUrl = useCallback((img: any) => {
    if (img.firebase_url) return String(img.firebase_url);
    let finalUrl = img.image_url as string | null;
    if (finalUrl && !finalUrl.startsWith('http')) {
      const { data } = supabase.storage.from('images').getPublicUrl(finalUrl);
      finalUrl = data?.publicUrl || '';
    }
    return finalUrl || '';
  }, []);

  async function preloadOne(src: string): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!src) return resolve();
      const img = new Image() as HTMLImageElement;
      (img as any).decoding = 'sync';
      (img as any).loading = 'eager';
      img.src = src;
      const anyImg = img as any;
      if (typeof anyImg.decode === 'function') {
        anyImg
          .decode()
          .then(() => resolve())
          .catch(() => resolve());
      } else {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      }
    });
  }

  const selectFromSession = useCallback(
    async (roomId: string | null, count: number): Promise<string[]> => {
      if (!roomId) return [];
      try {
        const { data, error: sessionErr } = await supabase
          .from('game_sessions')
          .select('image_ids')
          .eq('room_id', roomId)
          .maybeSingle();
        if (sessionErr && sessionErr.code !== 'PGRST116') {
          console.warn('[useGamePreparation] game_sessions fetch failed', {
            roomId,
            code: sessionErr.code,
            message: sessionErr.message,
            details: sessionErr.details,
          });
          return [];
        }
        if (data && Array.isArray(data.image_ids) && data.image_ids.length > 0) {
          return (data.image_ids as string[])
            .map((id) => String(id))
            .filter((id) => id.length > 0)
            .slice(0, count);
        }
      } catch (e) {
        console.warn('[useGamePreparation] selectFromSession exception', e);
      }
      return [];
    },
    [],
  );

  const prepare = useCallback(
    async (opts: PrepareOptions) => {
      setStatus('selecting');
      setError(null);
      setLoaded(0);
      setTotal(0);
      setPrepared([]);
      setLoadedIndices(new Set());
      abortRef.current = false;

      const userId = opts.userId ?? null;
      const roomId = opts.roomId ?? null;
      const count = Math.max(1, opts.count);
      const usePlayerHistory = !!opts.usePlayerHistory && !!userId && !!roomId;

      if (roomId && !opts.seed) {
        console.warn('[useGamePreparation] Multiplayer roomId provided without seed. Gating preparation.');
        setStatus('idle');
        throw new Error('Missing seed for multiplayer preparation');
      }

      try {
        console.debug('[useGamePreparation] begin prepare', {
          roomId,
          count,
          seed_present: !!opts.seed,
          minYear: opts.minYear ?? null,
          maxYear: opts.maxYear ?? null,
          usePlayerHistory,
        });
      } catch {}

      let ids: string[] = [];
      let selectionSource: 'persisted' | 'rpc' = 'rpc';

      if (roomId && !usePlayerHistory) {
        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          ids = await selectFromSession(roomId, count);
          if (ids.length > 0) {
            selectionSource = 'persisted';
            break;
          }
          if (attempt < maxAttempts - 1) {
            const delayMs = 150 * Math.pow(2, attempt);
            try {
              console.debug('[useGamePreparation] waiting for host selection to persist', {
                roomId,
                attempt,
                delayMs,
              });
            } catch {}
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      if (ids.length === 0) {
        const effectiveUserIdForRpc = roomId ? (usePlayerHistory ? userId : null) : userId;
        const rpcArgs: any = {
          p_user_id: effectiveUserIdForRpc,
          p_room_id: roomId,
          p_count: count,
          p_min_year: opts.minYear ?? null,
          p_max_year: opts.maxYear ?? null,
        };
        if (opts.seed) {
          rpcArgs.p_seed = opts.seed;
        }

        try {
          console.debug('[useGamePreparation] RPC create_game_session_and_pick_images args', {
            p_user_id: rpcArgs.p_user_id,
            p_room_id: rpcArgs.p_room_id,
            p_count: rpcArgs.p_count,
            p_seed_present: !!rpcArgs.p_seed,
            p_min_year: rpcArgs.p_min_year,
            p_max_year: rpcArgs.p_max_year,
            use_player_history: usePlayerHistory,
          });
        } catch {}

        const { data: rows, error: pickErr } = await supabase.rpc('create_game_session_and_pick_images', rpcArgs as any);

        if (pickErr) {
          setStatus('error');
          setError(pickErr.message || 'Failed to select images');
          console.warn('[useGamePreparation] RPC failed', {
            code: (pickErr as any).code,
            message: pickErr.message,
            details: (pickErr as any).details,
            hint: (pickErr as any).hint,
            rpcArgs: {
              p_user_id: rpcArgs.p_user_id,
              p_room_id: rpcArgs.p_room_id,
              p_count: rpcArgs.p_count,
              p_seed_present: !!rpcArgs.p_seed,
            },
          });
          throw pickErr;
        }

        const ordered = Array.isArray(rows)
          ? rows
              .filter((r: any) => r && r.image_id)
              .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          : [];

        ids = ordered.map((r: any) => r.image_id);
        selectionSource = 'rpc';
      }

      try {
        console.debug('[useGamePreparation] selected image IDs', {
          first5: ids.slice(0, 5),
          total: ids.length,
          roomId,
          seed_present: !!opts.seed,
          selectionSource,
          usedPlayerHistory: usePlayerHistory,
        });
      } catch {}

      if (abortRef.current) {
        setStatus('error');
        const err = new Error('Preparation aborted');
        setError(err.message);
        throw err;
      }

      if (ids.length < count) {
        const err = new Error(`Only ${ids.length} eligible images found (need ${count}).`);
        setStatus('error');
        setError(err.message);
        console.warn('[useGamePreparation] Insufficient images selected', {
          wanted: count,
          got: ids.length,
          roomId,
          userId,
        });
        throw err;
      }

      setStatus('fetching');
      const { data: imgs, error: fetchErr } = await supabase.from('images').select('*').in('id', ids);

      if (fetchErr) {
        setStatus('error');
        setError(fetchErr.message || 'Failed to fetch image metadata');
        console.warn('[useGamePreparation] images fetch failed', {
          code: (fetchErr as any).code,
          message: fetchErr.message,
          details: (fetchErr as any).details,
          idsRequested: ids.length,
        });
        throw fetchErr;
      }

      if (abortRef.current) {
        setStatus('error');
        const err = new Error('Preparation aborted');
        setError(err.message);
        throw err;
      }

      const byId = new Map((imgs ?? []).map((i: any) => [i.id, i]));
      const orderedImgs = ids.map((id) => byId.get(id)).filter(Boolean);

      const preparedList: PreparedImage[] = orderedImgs.map((img: any) => {
        const url = resolveImageUrl(img);
        return {
          id: String(img.id),
          title: img.title || 'Untitled',
          description: img.description || null,
          source_citation: img.source_citation || null,
          latitude: Number(img.latitude || 0),
          longitude: Number(img.longitude || 0),
          year: Number(img.year || 0),
          image_url: img.image_url,
          location_name: img.location_name || 'Unknown Location',
          url,
          firebase_url: img.firebase_url ?? undefined,
          confidence: img.confidence,
        };
      });

      if (abortRef.current) {
        setStatus('error');
        const err = new Error('Preparation aborted');
        setError(err.message);
        throw err;
      }

      setStatus('preloading');
      setTotal(preparedList.length);
      setLoaded(0);
      setPrepared(preparedList);

      const runPreload = async () => {
        for (let i = 0; i < preparedList.length; i++) {
          if (abortRef.current) break;
          await preloadOne(preparedList[i].url);
          setLoaded((prev) => Math.min(preparedList.length, prev + 1));
          setLoadedIndices((prev) => {
            const next = new Set(prev);
            next.add(i);
            return next;
          });
        }

        if (abortRef.current) {
          setStatus('error');
          setError('Preparation aborted');
          return;
        }
        setStatus('done');
      };

      if (opts.nonBlocking) {
        void runPreload();
        return { images: preparedList, ids };
      }

      await runPreload();
      if (status === 'error') {
        throw new Error(error || 'Preparation aborted');
      }
      return { images: preparedList, ids };
    },
    [resolveImageUrl, selectFromSession, status, error],
  );

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const reset = useCallback(() => {
    abortRef.current = false;
    setStatus('idle');
    setError(null);
    setLoaded(0);
    setTotal(0);
    setPrepared([]);
    setLoadedIndices(new Set());
  }, []);

  return {
    prepare,
    abort,
    reset,
    status,
    error,
    progress: { loaded, total },
    prepared,
    loadedIndices,
  };
}
