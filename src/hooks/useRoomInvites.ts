import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";

export type RoomInvite = Database["public"]["Tables"]["room_invites"]["Row"];

export function useRoomInvites() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invites, setInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id;

  const fetchInvites = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("room_invites")
      .select("id, room_id, inviter_user_id, friend_id, created_at")
      .eq("friend_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      setError(error.message);
    } else {
      setInvites(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`room_invites:user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_invites",
          filter: `friend_id=eq.${userId}`,
        },
        (payload) => {
          const newInvite = payload.new as RoomInvite;
          setInvites((prev) => {
            const exists = prev.some((i) => i.id === newInvite.id);
            const next = exists ? prev : [newInvite, ...prev];
            return next;
          });
          toast({
            title: "New room invite",
            description: `You were invited to join room ${newInvite.room_id}`,
          });
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
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  const declineInvite = useCallback(async (id: string) => {
    const { error } = await supabase.from("room_invites").delete().eq("id", id);
    if (error) throw error;
  }, []);

  const pendingCount = useMemo(() => invites.length, [invites]);

  return { invites, pendingCount, loading, error, fetchInvites, declineInvite };
}
