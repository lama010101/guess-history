import React from "react";
import { Button } from "@/components/ui/button";

interface InviteToastContentProps {
  roomId: string;
  hostName?: string | null;
  onAccept: () => void | Promise<void>;
  onDecline: () => void | Promise<void>;
}

const InviteToastContent: React.FC<InviteToastContentProps> = ({ roomId, hostName, onAccept, onDecline }) => {
  return (
    <div className="space-y-2">
      <div className="text-sm">
        {hostName ? (
          <span>
            <span className="font-medium">{hostName}</span> invites you to room {roomId}
          </span>
        ) : (
          <span>New invite to room {roomId}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-500/90 text-black flex-1"
          onClick={onAccept}
        >
          Accept
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="bg-red-500 hover:bg-red-500/90 text-white w-auto px-4"
          onClick={onDecline}
        >
          Decline
        </Button>
      </div>
    </div>
  );
};

export default InviteToastContent;
