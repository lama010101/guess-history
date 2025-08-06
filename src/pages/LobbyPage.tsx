import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { MultiplayerLobby } from '@/components/MultiplayerLobby';
import { useAuth } from '@/contexts/AuthContext';

const LobbyPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { session, isLoading } = useAuth();

  if (!roomId) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8 bg-neutral-900 text-white">
        <div className="spinner"></div>
        <p className="ml-4">Authenticating...</p>
      </div>
    );
  }

  const jwt = session?.access_token;

  if (!jwt) {
    // Redirect or show an error if auth fails or is missing
    return <Navigate to="/?error=auth_failed" replace />;
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4 md:p-8 bg-neutral-900 text-white">
      <MultiplayerLobby roomId={roomId} jwt={jwt} />
    </div>
  );
};

export default LobbyPage;
