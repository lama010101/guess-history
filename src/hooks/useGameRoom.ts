import { useEffect, useState, useCallback } from 'react';
import { createMultiplayerAdapter } from '../multiplayer/MultiplayerAdapter';

export function useGameRoom(roomId: string, jwt: string) {
  const [adapter] = useState(() => createMultiplayerAdapter());
  const [state, setState] = useState({
    isConnected: false,
    players: [],
    leaderboard: [],
    currentRound: 0,
    error: null,
  });

  const connect = useCallback(async () => {
    await adapter.connect(roomId, jwt);
    setState(prev => ({ ...prev, isConnected: true }));
  }, [adapter, roomId, jwt]);

  const submitGuess = useCallback((round: number, guess: any) => {
    adapter.send('PLAYER_MOVE', { round, guess });
  }, [adapter]);

  useEffect(() => {
    const unsubscribe = adapter.on('STATE', (event) => {
      if (event?.data) {
        // Merge server state (players, leaderboard, etc.) into local state
        const transformed = { ...event.data } as any;
        if (transformed.players && !Array.isArray(transformed.players)) {
          transformed.players = Object.values(transformed.players);
        }
        if (transformed.leaderboard && !Array.isArray(transformed.leaderboard)) {
          transformed.leaderboard = Object.values(transformed.leaderboard);
        }
        setState(prev => ({ ...prev, ...transformed }));
      }
    });
    return unsubscribe;
  }, [adapter]);

  return {
    ...state,
    connect,
    submitGuess,
    adapter,
  };
}
