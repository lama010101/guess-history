import React from "react";
import { Bell, Check, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRoomInvites } from "@/hooks/useRoomInvites";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const InvitesBell: React.FC = () => {
  const { invites, pendingCount, declineInvite, fetchInvites } = useRoomInvites();
  const navigate = useNavigate();
  const { toast } = useToast();

  const hasInvites = pendingCount > 0;

  const accept = async (id: string, roomId: string) => {
    // Navigate to the active Room route and mark invite as handled (delete)
    navigate(`/room/${encodeURIComponent(roomId)}`);
    try {
      await declineInvite(id);
    } catch (e) {
      // ignore errors on cleanup
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center justify-center rounded-full p-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-history-secondary"
          aria-label={hasInvites ? `${pendingCount} pending invites` : "Invitations"}
          title="Invitations"
        >
          <Bell className="h-5 w-5" />
          {hasInvites && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-history-secondary text-black text-[10px] font-bold h-4 min-w-[16px] px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="bg-zinc-950/85 text-white border-l border-zinc-800 w-[85vw] sm:w-[420px]">
        <SheetHeader>
          <SheetTitle>Invitations</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {invites.length === 0 ? (
            <div className="text-sm text-zinc-400">No pending invites.</div>
          ) : (
            invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-\[\#444\] p-3">
                <div className="flex flex-col">
                  <div className="text-sm font-medium">{inv.inviter_display_name ? `${inv.inviter_display_name} invited you` : `Room ${inv.room_id}`}</div>
                  <div className="text-xs text-zinc-400">Room {inv.room_id} • Invited at {new Date(inv.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-500/90 text-black" onClick={() => accept(inv.id, inv.room_id)}>
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-500 hover:bg-red-500/90 text-white"
                    onClick={async () => {
                      try {
                        await declineInvite(inv.id);
                        await fetchInvites();
                        toast({ description: "Invite declined" });
                      } catch (e) {
                        toast({ description: "Failed to decline invite", variant: "destructive" });
                      }
                    }}
                  >
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InvitesBell;
