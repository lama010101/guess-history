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
    const unsubscribe = adapter.on('STATE', (data) => {
      setState(prev => ({ ...prev, ...data }));
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
