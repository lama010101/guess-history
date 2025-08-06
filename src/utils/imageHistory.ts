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
