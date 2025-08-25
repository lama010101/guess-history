import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type RoomInvite = Database["public"]["Tables"]["room_invites"]["Row"];
export type Invite = RoomInvite & { inviter_display_name?: string };

// De-duplicate invite toasts across multiple hook instances (InviteListener, InvitesBell)
const shownInviteToastIds = new Set<string>();
const POLL_INTERVAL_MS = 8000; // fallback polling to reconcile missed realtime events

export function useRoomInvites() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  // Unique id per hook instance to avoid reusing the same channel object across components
  const instanceIdRef = useRef<string>("");
  if (!instanceIdRef.current) {
    // lightweight unique id for channel suffix
    instanceIdRef.current = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Track whether we've completed an initial fetch to avoid spamming toasts for historical invites
  const loadedOnceRef = useRef(false);

  const fetchInvites = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (authLoading || !userId) return;
      if (!opts?.silent) setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("room_invites")
        .select("id, room_id, inviter_user_id, friend_id, created_at")
        .eq("friend_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        const rows = data ?? [];
        // Optionally toast for newly discovered invites (post-initial-load or silent polls)
        if (loadedOnceRef.current) {
          const newlyDiscovered = rows.filter((r) => !shownInviteToastIds.has(r.id));
          for (const r of newlyDiscovered) {
            shownInviteToastIds.add(r.id);
            toast({
              title: "New room invite",
              description: `You have a new invite to room ${r.room_id}`,
              duration: 5000,
            });
            // Best-effort: enrich inviter's display name and update toast
            supabase
              .from('profiles')
              .select('display_name')
              .eq('id', r.inviter_user_id as string)
              .maybeSingle()
              .then(({ data: prof }) => {
                const host = (prof?.display_name || r.inviter_user_id) as string;
                toast({ title: "New room invite", description: `${host} invites you to room ${r.room_id}` });
                setInvites((prev) => prev.map((i) => (i.id === r.id ? { ...i, inviter_display_name: host } : i)));
              })
              .catch(() => { /* ignore */ });
          }
        }
        // Seed the dedupe set on first load so we don't toast historical invites later
        if (!loadedOnceRef.current && rows.length) {
          for (const r of rows) shownInviteToastIds.add(r.id);
        }
        setInvites(rows);
      }
      if (!opts?.silent) setLoading(false);
      loadedOnceRef.current = true;
    },
    [authLoading, userId, toast]
  );

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    if (authLoading || !userId) return;
    // Use a unique channel name per hook instance to prevent calling subscribe() twice
    const channelName = `room_invites:user:${userId}:${instanceIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_invites",
          filter: `friend_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[useRoomInvites] Received new invite payload at:', new Date().toISOString(), payload);
          const newInvite = payload.new as RoomInvite;

          // Show toast immediately
          const isFirstToastForThisInvite = !shownInviteToastIds.has(newInvite.id);
          if (isFirstToastForThisInvite) {
            shownInviteToastIds.add(newInvite.id);
            toast({
              title: "New room invite",
              description: `You have a new invite to room ${newInvite.room_id}`,
              duration: 5000,
            });
          }

          // Add invite to list immediately, then fetch profile for eventual consistency
          setInvites((prev) => {
            const exists = prev.some((i) => i.id === newInvite.id);
            if (exists) return prev;

            const inviteWithPlaceholder: Invite = { ...newInvite, inviter_display_name: '...' };
            return [inviteWithPlaceholder, ...prev];
          });

          (async () => {
            try {
              console.log('[useRoomInvites] Fetching profile for invite list at:', new Date().toISOString());
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', newInvite.inviter_user_id as string)
                .maybeSingle();
              console.log('[useRoomInvites] Profile fetched at:', new Date().toISOString());

              const host = profile?.display_name || newInvite.inviter_user_id;

              // Update toast with the host's name
              if (isFirstToastForThisInvite) {
                toast({
                  title: "New room invite",
                  description: `${host} invites you to room ${newInvite.room_id}`,
                });
              }

              setInvites((prev) =>
                prev.map((i) =>
                  i.id === newInvite.id ? { ...i, inviter_display_name: host } : i
                )
              );
            } catch (e) {
              console.error('Failed to fetch inviter profile', e);
              setInvites((prev) =>
                prev.map((i) =>
                  i.id === newInvite.id
                    ? { ...i, inviter_display_name: newInvite.inviter_user_id }
                    : i
                )
              );
            }
          })();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "room_invites",
          filter: `friend_id=eq.${userId}`,
        },
        (payload) => {
          const oldInvite = payload.old as RoomInvite;
          setInvites((prev) => prev.filter((i) => i.id !== oldInvite.id));
        }
      );

    // Subscribe with status callback for diagnostics
    channel.subscribe((status) => {
      try {
        console.log('[useRoomInvites] Channel status', { channel: channelName, status, at: new Date().toISOString() });
      } catch {}
      if (status === 'SUBSCRIBED') {
        // Opportunistically refetch to reconcile any missed rows
        fetchInvites();
      }
      if (status === 'CHANNEL_ERROR') {
        try { console.error('[useRoomInvites] Channel error', channelName); } catch {}
      }
    });

    return () => {
      try { console.log('[useRoomInvites] Removing channel', channelName); } catch {}
      supabase.removeChannel(channel);
    };
  }, [authLoading, userId, toast]);

  // Polling fallback: reconcile missed events periodically without affecting UI loading state
  useEffect(() => {
    if (authLoading || !userId) return;
    const id = setInterval(() => {
      fetchInvites({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [authLoading, userId, fetchInvites]);

  const declineInvite = useCallback(async (id: string) => {
    const { error } = await supabase.from("room_invites").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const pendingCount = useMemo(() => invites.length, [invites]);

  return { invites, pendingCount, loading, error, fetchInvites, declineInvite };
}
