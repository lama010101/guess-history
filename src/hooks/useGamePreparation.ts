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
}

export type PrepStatus = 'idle' | 'selecting' | 'fetching' | 'preloading' | 'done' | 'error';

export function useGamePreparation() {
  const [status, setStatus] = useState<PrepStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
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
    abortRef.current = false;

    const userId = opts.userId ?? null;
    const roomId = opts.roomId ?? null;
    const count = Math.max(1, opts.count);

    // 1) Select image IDs (and persist to game_sessions when roomId provided)
    const rpcArgs: any = {
      p_user_id: userId,
      p_room_id: roomId,
      p_count: count,
    };
    if (opts.seed) rpcArgs.p_seed = opts.seed; // omit to use DB default when not provided

    const { data: rows, error: pickErr } = await supabase.rpc(
      'create_game_session_and_pick_images',
      rpcArgs as any,
    );

    if (pickErr) {
      setStatus('error');
      setError(pickErr.message || 'Failed to select images');
      throw pickErr;
    }

    const ordered = Array.isArray(rows)
      ? rows
          .filter((r: any) => r && r.image_id)
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
      : [];

    const ids: string[] = ordered.map((r: any) => r.image_id);

    if (ids.length < count) {
      const err = new Error(`Only ${ids.length} eligible images found (need ${count}).`);
      setStatus('error');
      setError(err.message);
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
      throw fetchErr;
    }

    const byId = new Map((imgs ?? []).map((i: any) => [i.id, i]));
    const orderedImgs = ids.map((id) => byId.get(id)).filter(Boolean);

    // 3) Resolve final URLs and shape to PreparedImage[]
    const prepared: PreparedImage[] = orderedImgs.map((img: any) => {
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

    // 4) Preload + decode with progress
    setStatus('preloading');
    setTotal(prepared.length);
    setLoaded(0);

    for (let i = 0; i < prepared.length; i++) {
      if (abortRef.current) break;
      await preloadOne(prepared[i].url);
      setLoaded((prev) => Math.min(prepared.length, prev + 1));
    }

    if (abortRef.current) {
      setStatus('error');
      const err = new Error('Preparation aborted');
      setError(err.message);
      throw err;
    }

    setStatus('done');
    return { images: prepared, ids };
  }, [resolveImageUrl]);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  return {
    prepare,
    abort,
    status,
    error,
    progress: { loaded, total },
  };
}
