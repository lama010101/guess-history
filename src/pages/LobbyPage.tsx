import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { useAuth } from '@/contexts/AuthContext';

const LobbyPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { session } = useAuth();

  if (!roomId) return <Navigate to="/" replace />;

  // If you need JWT for the adapter, obtain it via Supabase session.
  const jwt = session?.access_token ?? '';

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8 bg-neutral-900 text-white">
      <MultiplayerLobby roomId={roomId} jwt={jwt} />
    </div>
  );
};

export default LobbyPage;
