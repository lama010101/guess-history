import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useGameRoom } from '../hooks/useGameRoom';
import { AvatarDisplay } from './AvatarDisplay';
import { LeaderboardPanel } from './LeaderboardPanel';

interface MultiplayerLobbyProps {
  roomId: string;
  jwt: string;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ roomId, jwt }) => {
  const { isConnected, players, leaderboard, connect, adapter } = useGameRoom(roomId, jwt);

  // Automatically connect on mount, only if we have a JWT
  useEffect(() => {
    if (jwt) {
      connect();
    }
  }, [connect, jwt]);

  // derive hostId and self player
  const hostId = useMemo(() => {
    const host = players.find((p: any) => p.isHost);
    return host?.id;
  }, [players]);

  const selfPlayer = useMemo(() => players.find((p: any) => p.id === (adapter as any)?.selfId), [players, adapter]);
  const isHost = selfPlayer?.id === hostId;

  // derive ready state stats
  const readyCount = players.filter((p: any) => p.isReady).length;

  const handleToggleReady = () => {
    const newReady = !selfPlayer?.isReady;
    adapter?.send('PLAYER_READY_TOGGLE', { isReady: newReady });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    adapter?.send('START_GAME', null);
  };

  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/room/${roomId}`;
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback ignored
    }
  }, [inviteLink]);

  useEffect(() => {
    connect();
  }, [connect]);

  if (!isConnected) {
    return (
      <div className="lobby-loading">
        <div className="spinner"></div>
        <p>Connecting to game room...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-neutral-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-neutral-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Game Room</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-400">Room ID: {roomId}</span>
            <button 
              onClick={copyLink} 
              className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm flex items-center"
            >
              {copied ? 'Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-neutral-400">
            <span className="font-medium">{readyCount}</span> of <span className="font-medium">{players.length}</span> players ready
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleToggleReady}
              className={`px-4 py-2 rounded font-medium ${selfPlayer?.isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-neutral-600 hover:bg-neutral-500'}`}
            >
              {selfPlayer?.isReady ? 'Ready!' : 'Ready Up'}
            </button>
            
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={readyCount < players.length}
                className={`px-4 py-2 rounded font-medium ${readyCount === players.length ? 'bg-orange-500 hover:bg-orange-600' : 'bg-neutral-700 text-neutral-400 cursor-not-allowed'}`}
              >
                Start Game
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <div className="bg-neutral-900 rounded-lg p-4">
          <h3 className="text-xl font-bold mb-4">Players ({players.length})</h3>
          <div className="grid grid-cols-2 gap-4">
            {players.map((player) => (
              <div key={player.id} className="flex items-center p-3 bg-neutral-800 rounded-lg">
                <AvatarDisplay player={player} />
                <div className="ml-3">
                  <div className="font-medium">{player.displayName || 'Player'}</div>
                  <div className="text-xs text-neutral-400 flex items-center">
                    {player.isHost && <span className="mr-2 text-yellow-500">Host</span>}
                    {player.isReady ? 
                      <span className="text-green-500">Ready</span> : 
                      <span className="text-neutral-500">Not Ready</span>
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-neutral-900 rounded-lg p-4">
          <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
          <LeaderboardPanel entries={leaderboard} />
        </div>
      </div>
    </div>
  );
};
