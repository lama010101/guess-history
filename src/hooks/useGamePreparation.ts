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
  url: string; // resolved final URL for rendering/preloading
  firebase_url?: string; 
  confidence?: number; 
}

export interface PrepareOptions {
  userId: string | null;
  roomId?: string | null;
  count: number;
  seed?: string | null;
  nonBlocking?: boolean;
}

export type PrepStatus = 'idle' | 'selecting' | 'fetching' | 'preloading' | 'done' | 'error';

export function useGamePreparation() {
  const [status, setStatus] = useState<PrepStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  // New: expose prepared images and which indices finished loading for UI previews
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
      // Some browsers support these hints; TS DOM lib may not type them
      (img as any).decoding = 'sync';
      (img as any).loading = 'eager';
      img.src = src;
      // Prefer decode when available
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

  const prepare = useCallback(async (opts: PrepareOptions) => {
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
    // Enforce multiplayer gating before any work
    if (roomId && !opts.seed) {
      try {
        console.warn('[useGamePreparation] Multiplayer roomId provided without seed. Gating: not starting preparation.');
      } catch {}
      setStatus('idle');
      setPrepared([]);
      setLoadedIndices(new Set());
      throw new Error('Missing seed for multiplayer preparation');
    }

    try {
      console.debug('[useGamePreparation] begin prepare', {
        roomId,
        count,
        seed_present: !!opts.seed,
      });
    } catch {}

    // 1) Select image IDs (and persist to game_sessions when roomId provided)
    const rpcArgs: any = {
      p_user_id: userId,
      p_room_id: roomId,
      p_count: count,
    };
    if (opts.seed) rpcArgs.p_seed = opts.seed; // omit to use DB default when not provided

    // Log sanitized args for diagnostics (avoid dumping large data)
    try {
      console.debug('[useGamePreparation] RPC create_game_session_and_pick_images args', {
        p_user_id: rpcArgs.p_user_id,
        p_room_id: rpcArgs.p_room_id,
        p_count: rpcArgs.p_count,
        p_seed_present: !!rpcArgs.p_seed,
      });
    } catch {}

    const { data: rows, error: pickErr } = await supabase.rpc(
      'create_game_session_and_pick_images',
      rpcArgs as any,
    );

    if (pickErr) {
      setStatus('error');
      setError(pickErr.message || 'Failed to select images');
      // Include code/details for quicker diagnosis (e.g., 404 on RPC missing, RLS, etc.)
      try {
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
      } catch {}
      throw pickErr;
    }

    const ordered = Array.isArray(rows)
      ? rows
          .filter((r: any) => r && r.image_id)
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : [];

    const ids: string[] = ordered.map((r: any) => r.image_id);
    if (abortRef.current) {
      try {
        console.warn('[useGamePreparation] aborted after selection phase');
      } catch {}
      setStatus('error');
      const err = new Error('Preparation aborted');
      setError(err.message);
      throw err;
    }
    try {
      console.debug('[useGamePreparation] selected image IDs (first 5)', {
        first5: ids.slice(0, 5),
        total: ids.length,
        seed_present: !!opts.seed,
        roomId,
      });
    } catch {}

    if (ids.length < count) {
      const err = new Error(`Only ${ids.length} eligible images found (need ${count}).`);
      setStatus('error');
      setError(err.message);
      try {
        console.warn('[useGamePreparation] Insufficient images selected', {
          wanted: count,
          got: ids.length,
          roomId,
          userId,
        });
      } catch {}
      throw err;
    }

    // 2) Fetch metadata in one query
    setStatus('fetching');
    const { data: imgs, error: fetchErr } = await supabase
      .from('images')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      setStatus('error');
      setError(fetchErr.message || 'Failed to fetch image metadata');
      try {
        console.warn('[useGamePreparation] images fetch failed', {
          code: (fetchErr as any).code,
          message: fetchErr.message,
          details: (fetchErr as any).details,
          idsRequested: ids.length,
        });
      } catch {}
      throw fetchErr;
    }

    if (abortRef.current) {
      try {
        console.warn('[useGamePreparation] aborted after metadata fetch');
      } catch {}
      setStatus('error');
      const err = new Error('Preparation aborted');
      setError(err.message);
      throw err;
    }

    const byId = new Map((imgs ?? []).map((i: any) => [i.id, i]));
    const orderedImgs = ids.map((id) => byId.get(id)).filter(Boolean);

    // 3) Resolve final URLs and shape to PreparedImage[]
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

    // 3.5) Early abort before committing prepared list
    if (abortRef.current) {
      try {
        console.warn('[useGamePreparation] aborted before commit prepared list');
      } catch {}
      setStatus('error');
      const err = new Error('Preparation aborted');
      setError(err.message);
      throw err;
    }

    // 4) Preload + decode with progress
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
        try {
          console.warn('[useGamePreparation] preparation aborted mid-preload', {
            planned: preparedList.length,
          });
        } catch {}
        setStatus('error');
        setError('Preparation aborted');
        return;
      }
      setStatus('done');
    };

    if (opts.nonBlocking) {
      try {
        console.debug('[useGamePreparation] starting non-blocking preload');
      } catch {}
      // Fire and forget
      void runPreload();
      return { images: preparedList, ids };
    }

    await runPreload();
    if (status === 'error') {
      throw new Error(error || 'Preparation aborted');
    }
    return { images: preparedList, ids };
  }, [resolveImageUrl]);

  const abort = useCallback(() => {
    abortRef.current = true;
    try {
      console.debug('[useGamePreparation] abort() called');
    } catch {}
  }, []);

  return {
    prepare,
    abort,
    status,
    error,
    progress: { loaded, total },
    prepared,
    loadedIndices,
  };
}
