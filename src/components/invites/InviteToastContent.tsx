import React from 'react';
import { Button } from '@/components/ui/button';

interface InviteToastContentProps {
  hostName?: string | null;
  roomId: string;
  onAccept: () => void;
  onDecline: () => void;
}

const InviteToastContent: React.FC<InviteToastContentProps> = ({ hostName, roomId, onAccept, onDecline }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm">
        <span className="font-medium">{hostName ?? 'Someone'}</span> invites you to room <span className="font-mono">{roomId}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-500/90 text-black" onClick={onAccept}>
          Accept
        </Button>
        <Button size="sm" className="bg-red-500 hover:bg-red-500/90 text-white" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </div>
  );
};

export default InviteToastContent;
