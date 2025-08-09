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
 * Deterministic image selection for multiplayer rooms.
 * All clients fetch the same ordered list (by id) and then apply the same seeded shuffle.
 * @param count number of images to select
 * @param seed any string; same seed yields same order
 */
export async function getImagesForRoom(count: number, seed: string) {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .eq('ready', true)
    .order('id', { ascending: true }); // stable base order across clients
  if (error) throw error;

  const list = (data ?? []).slice();
  const rng = seededRng(seed);
  seededShuffle(list, rng);
  return list.slice(0, count);
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

    // No existing session: compute with seed and persist
    const computed = await getImagesForRoom(count, seed);
    const imageIds = computed.map((i: any) => i.id);
    const { error: insErr } = await supabase
      .from('game_sessions')
      .upsert({ room_id: roomId, seed, image_ids: imageIds, started_at: new Date().toISOString() }, { onConflict: 'room_id' })
      .select('room_id')
      .single();
    if (insErr && insErr.code !== '42P01') {
      console.warn('getOrPersistRoomImages: insert error', insErr);
    }
    return computed;
  } catch (e: any) {
    // Fallback if the table is missing or any other error occurs
    console.warn('getOrPersistRoomImages fallback due to error:', e?.message || e);
    return getImagesForRoom(count, seed);
  }
}

// --- Seeded RNG + shuffle helpers ---
function hashStr32(str: string): number {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRng(seed: string) {
  return mulberry32(hashStr32(seed));
}

function seededShuffle<T>(array: T[], rnd: () => number) {
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(rnd() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
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
