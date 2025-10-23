import { supabase } from './client';
import type { Tables } from './types';

export type RoomInviteRow = Tables<'room_invites'>;

type InvitePayload = {
  roomId: string;
  expiresAt: number;
  mode: 'sync' | 'async';
};

type CreateInviteResponse = {
  payload: string;
  signature: string;
};

const TOKEN_STORAGE_PREFIX = 'lobbyInviteToken:';

function storageKey(roomId: string): string {
  return `${TOKEN_STORAGE_PREFIX}${roomId}`;
}

function signInvitePayload(payload: InvitePayload, signature: string): string {
  return `${payload.roomId}.${signature}`;
}

export function cacheRoomInviteToken(roomId: string, token: string): void {
  try {
    sessionStorage.setItem(storageKey(roomId), token);
  } catch {
    /* ignore storage errors */
  }
}

export function getCachedRoomInviteToken(roomId: string | null | undefined): string | null {
  if (!roomId) return null;
  try {
    const cached = sessionStorage.getItem(storageKey(roomId));
    return cached && cached.trim().length > 0 ? cached : null;
  } catch {
    return null;
  }
}

/**
 * Fetch incoming invites for the given user for a specific room.
 * RLS permits the invited friend (friend_id = auth.uid()) to SELECT.
 */
export async function fetchIncomingInvites(roomId: string, userId: string) {
  const { data, error } = await supabase
    .from('room_invites')
    .select('id, room_id, inviter_user_id, friend_id, created_at')
    .eq('room_id', roomId)
    .eq('friend_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RoomInviteRow[];
}

export async function createInviteToken(roomId: string, mode: 'sync' | 'async'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('create-invite', {
    body: { roomId, mode }
  });
  if (error) {
    console.error('[invite] create-invite function error', error);
    throw error;
  }
  if (!data?.payload || !data?.signature) {
    throw new Error('create-invite function returned invalid response');
  }
  const typed = data as CreateInviteResponse;
  const decoded: InvitePayload = JSON.parse(atob(typed.payload));
  if (decoded.roomId !== roomId) {
    throw new Error('create-invite payload room mismatch');
  }
  const token = signInvitePayload(decoded, typed.signature);
  cacheRoomInviteToken(roomId, token);
  return token;
}

export async function ensureRoomInviteToken(roomId: string, mode: 'sync' | 'async' = 'sync'): Promise<string | null> {
  const cached = getCachedRoomInviteToken(roomId);
  if (cached) return cached;
  try {
    const token = await createInviteToken(roomId, mode);
    return token;
  } catch (error) {
    console.error('[invite] ensureRoomInviteToken failed', error);
    return null;
  }
}

/**
 * Decline a single invite by deleting it.
 * RLS allows either the inviter (owner) or the invited friend to delete their row.
 */
export async function declineInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('room_invites').delete().eq('id', inviteId);
  if (error) throw error;
}

/**
 * Decline all invites for a given room for the current user (friend).
 * Useful when an invited user dismisses an Invitation modal for a room.
 */
export async function declineInviteForRoom(roomId: string, userId: string): Promise<number> {
  const { error, data } = await supabase
    .from('room_invites')
    .delete()
    .eq('room_id', roomId)
    .eq('friend_id', userId)
    .select('id');
  if (error) throw error;
  return (data || []).length;
}
