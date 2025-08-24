import React from "react";
import { useRoomInvites } from "@/hooks/useRoomInvites";

// Headless listener to ensure realtime invite subscription is always active
const InviteListener: React.FC = () => {
  useRoomInvites();
  return null;
};

export default InviteListener;
