import { supabase } from '@/integrations/supabase/client';

/*
 * Utility helpers for the "no-repeat" image system.
 * These helpers talk to Supabase RPCs for logged-in users and
 * fall back to localStorage for guests.
 */

const LOCAL_KEY = 'gh_played_images';
const MAX_HISTORY = 100;

/**
 * Fetch a fresh set of images that the player has not seen in their last 100 plays.
 * @param userId Auth user's id or null if guest
 * @param count  Number of images to fetch
 */
export async function getNewImages(userId: string | null, count: number) {
  if (userId) {
    // Logged-in: call database RPC that excludes recent history
    const { data, error } = await supabase.rpc('get_images_excluding_history', {
      p_user_id: userId,
      p_limit_count: count,
    });
    if (error) throw error;
    return data ?? [];
  }

  // Guest flow – maintain recent IDs in localStorage
  const historyRaw = localStorage.getItem(LOCAL_KEY);
  const localHistory: string[] = historyRaw ? JSON.parse(historyRaw) : [];

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('ready', true);
  if (error) throw error;

  const unseen = (data ?? []).filter((img) => !localHistory.includes(img.id));
  // Shuffle and slice locally
  const shuffled = unseen.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Persist and retrieve deterministic image order for a room.
 * If a record exists for the room, return those images in stored order.
 * Otherwise, compute with seed, persist, and return.
 */
export async function getOrPersistRoomImages(roomId: string, seed: string, count: number) {
  try {
    // Try to load existing session
    const { data: session, error: sesErr } = await supabase
      .from('game_sessions')
      .select('image_ids, seed')
      .eq('room_id', roomId)
      .maybeSingle();

    if (sesErr && sesErr.code !== 'PGRST116' /* not found */) {
      // If table missing or other error, fall back below
      if (sesErr.code === '42P01') {
        // table does not exist
      } else {
        console.warn('getOrPersistRoomImages: select error', sesErr);
      }
    }

    if (session && Array.isArray(session.image_ids) && session.image_ids.length > 0) {
      // Fetch images by IDs and restore original order
      const { data: imgs, error: imgErr } = await supabase
        .from('images')
        .select('*')
        .in('id', session.image_ids);
      if (imgErr) throw imgErr;
      const byId = new Map((imgs ?? []).map((i: any) => [i.id, i]));
      const ordered = (session.image_ids as string[]).map((id) => byId.get(id)).filter(Boolean);
      return ordered.slice(0, count);
    }
    // No existing session: call RPC to create one with shared seed
    const rpcArgs: any = {
      p_room_id: roomId,
      p_count: count,
      p_user_id: null,
      p_min_year: null,
      p_max_year: null,
    };
    if (seed) {
      rpcArgs.p_seed = seed;
    }

    const { data: rows, error: rpcErr } = await (supabase as any).rpc('create_game_session_and_pick_images', rpcArgs);
    if (rpcErr) {
      throw rpcErr;
    }

    const orderedIds: string[] = Array.isArray(rows)
      ? rows
          .filter((r: any) => r && r.image_id)
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((r: any) => r.image_id)
      : [];

    if (orderedIds.length === 0) {
      return [];
    }

    const { data: imgs, error: imgErr } = await supabase
      .from('images')
      .select('*')
      .in('id', orderedIds);
    if (imgErr) throw imgErr;
    const byId = new Map((imgs ?? []).map((i: any) => [i.id, i]));
    return orderedIds.map((id) => byId.get(id)).filter(Boolean);
  } catch (e: any) {
    console.warn('getOrPersistRoomImages fallback due to error:', e?.message || e);
    throw e;
  }
}

/**
 * Persist the list of played images for the user / guest.
 * @param userId Auth user's id or null if guest
 * @param imageIds IDs played in the latest round / game
 */
export async function recordPlayedImages(userId: string | null, imageIds: string[]) {
  if (userId) {
    const rows = imageIds.map((id) => ({ user_id: userId, image_id: id }));
    const { error } = await supabase.from('played_images').upsert(rows, {
      onConflict: 'user_id,image_id',
    });
    if (error) throw error;
    return;
  }

  // Guest – merge with localStorage list and keep last MAX_HISTORY entries
  const historyRaw = localStorage.getItem(LOCAL_KEY);
  const history: string[] = historyRaw ? JSON.parse(historyRaw) : [];
  const merged = Array.from(new Set([...imageIds, ...history])).slice(0, MAX_HISTORY);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
}

/**
 * Analytics helpers – only available to logged-in users
 */
export async function getImagePlayStats(userId: string) {
  const { data, error } = await supabase.rpc('get_image_play_stats', {
    user_id: userId,
  });
  if (error) throw error;
  return data;
}
