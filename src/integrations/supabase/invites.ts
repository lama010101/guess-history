import { supabase } from './client';
import type { Tables } from './types';

export type RoomInviteRow = Tables<'room_invites'>;

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
  const { data, error } = await supabase.functions.invoke<{ payload: string; signature: string }>('create-invite', {
    body: { roomId, mode }
  });
  if (error) {
    console.error('[invite] create-invite function error', error);
    throw error;
  }
  if (!data?.payload || !data?.signature) {
    throw new Error('create-invite function returned invalid response');
  }
  const decoded: InvitePayload = JSON.parse(atob(data.payload));
  if (decoded.roomId !== roomId) {
    throw new Error('create-invite payload room mismatch');
  }
  return signInvitePayload(decoded, data.signature);
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
