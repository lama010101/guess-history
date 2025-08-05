# Frontend Quick-Start Guide

## React Hook for Multiplayer

### useMultiplayer Hook

```typescript
// src/hooks/useMultiplayer.ts
import { useState, useEffect, useCallback } from 'react';
import { createMultiplayerAdapter, MultiplayerAdapter } from '../multiplayer/MultiplayerAdapter';
import { useAvatarSystem } from '../multiplayer/AvatarSystem';
import { useLeaderboardSystem } from '../multiplayer/LeaderboardSystem';

export interface MultiplayerState {
  isConnected: boolean;
  players: AvatarData[];
  leaderboard: LeaderboardEntry[];
  submissionCues: SubmissionCue[];
  roomId: string | null;
  error: string | null;
}

export function useMultiplayer() {
  const [adapter] = useState(() => createMultiplayerAdapter());
  const { avatarManager, avatars, recordSubmission } = useAvatarSystem();
  const { leaderboardSystem, leaderboard } = useLeaderboardSystem();
  
  const [state, setState] = useState<MultiplayerState>({
    isConnected: false,
    players: [],
    leaderboard: [],
    submissionCues: [],
    roomId: null,
    error: null,
  });

  const connect = useCallback(async (roomId: string, jwt: string) => {
    try {
      await adapter.connect(roomId, jwt);
      setState(prev => ({ ...prev, roomId, isConnected: true, error: null }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message }));
    }
  }, [adapter]);

  const disconnect = useCallback(() => {
    adapter.disconnect();
    setState(prev => ({ ...prev, isConnected: false, roomId: null }));
  }, [adapter]);

  const submitGuess = useCallback((round: number, guess: { lat: number; lng: number }) => {
    adapter.send('PLAYER_MOVE', { round, guess });
  }, [adapter]);

  // Listen for state updates
  useEffect(() => {
    const unsubscribe = adapter.on('STATE', (data) => {
      setState(prev => ({
        ...prev,
        players: data.players || [],
        leaderboard: data.leaderboard || [],
      }));
    });

    return unsubscribe;
  }, [adapter]);

  return {
    ...state,
    connect,
    disconnect,
    submitGuess,
    recordSubmission,
  };
}
```

## Lobby Component

### MultiplayerLobby Component

```typescript
// src/components/MultiplayerLobby.tsx
import React, { useState } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { AvatarDisplay } from './AvatarDisplay';
import { LeaderboardPanel } from './LeaderboardPanel';

interface MultiplayerLobbyProps {
  roomId: string;
  jwt: string;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ roomId, jwt }) => {
  const { isConnected, players, leaderboard, connect, disconnect } = useMultiplayer();

  React.useEffect(() => {
    connect(roomId, jwt);
    return () => disconnect();
  }, [roomId, jwt, connect, disconnect]);

  return (
    <div className="multiplayer-lobby">
      <div className="players-section">
        <h3>Players ({players.length})</h3>
        <div className="players-grid">
          {players.map(player => (
            <AvatarDisplay key={player.id} player={player} />
          ))}
        </div>
      </div>

      <div className="leaderboard-section">
        <h3>Leaderboard</h3>
        <LeaderboardPanel entries={leaderboard} />
      </div>
    </div>
  );
};
```

## Avatar Display Component

```typescript
// src/components/AvatarDisplay.tsx
import React from 'react';
import { AvatarData } from '../multiplayer/AvatarSystem';
import { getAvatarUrl } from '../multiplayer/AvatarSystem';

interface AvatarDisplayProps {
  player: AvatarData;
}

export const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ player }) => {
  return (
    <div className="avatar-display">
      <img 
        src={getAvatarUrl(player.avatar)} 
        alt={player.displayName}
        className="avatar-image"
      />
      <span className="player-name">{player.displayName}</span>
      {player.isReady && <span className="ready-indicator">✓</span>}
    </div>
  );
};
```

## Leaderboard Panel

```typescript
// src/components/LeaderboardPanel.tsx
import React from 'react';
import { LeaderboardEntry } from '../multiplayer/LeaderboardSystem';
import { formatScore, formatAccuracy } from '../multiplayer/LeaderboardSystem';

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
}

export const LeaderboardPanel: React.FC<LeaderboardPanelProps> = ({ entries }) => {
  return (
    <div className="leaderboard-panel">
      {entries.map((entry, index) => (
        <div key={entry.playerId} className="leaderboard-entry">
          <span className="rank">#{entry.rank}</span>
          <span className="name">{entry.playerName}</span>
          <span className="score">{formatScore(entry.totalScore)}</span>
          <span className="accuracy">{formatAccuracy(entry.accuracy)}</span>
        </div>
      ))}
    </div>
  );
};
```

## Integration with Game Components

### Game Component Integration

```typescript
// src/components/GameWithMultiplayer.tsx
import React, { useEffect } from 'react';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { useAvatarSystem } from '../multiplayer/AvatarSystem';
import { useLeaderboardSystem } from '../multiplayer/LeaderboardSystem';

interface GameWithMultiplayerProps {
  roomId: string;
  jwt: string;
}

export const GameWithMultiplayer: React.FC<GameWithMultiplayerProps> = ({ 
  roomId, 
  jwt 
}) => {
  const multiplayer = useMultiplayer();
  const { recordSubmission } = useAvatarSystem();
  const { updatePlayerScore } = useLeaderboardSystem();

  const handleGuessSubmit = (guess: { lat: number; lng: number }) => {
    multiplayer.submitGuess(1, guess);
    
    // Record submission for avatar/leaderboard
    updatePlayerScore('player-id', 'Player Name', 'avatar-url', {
      playerId: 'player-id',
      distance: 0,
      score: 100,
      submissionTime: 30,
      isCorrect: true,
    });
    
    recordSubmission('player-id', 'Player Name', 1);
  };

  return (
    <div>
      {/* Your existing game UI */}
      <div className="game-ui">
        {/* Map, controls, etc. */}
      </div>
      
      {/* Multiplayer overlay */}
      <div className="multiplayer-overlay">
        <AvatarDisplay player={{
          id: 'current-player',
          displayName: 'You',
          avatar: 'current-avatar',
          isReady: true,
          hasSubmitted: false,
        }} />
      </div>
    </div>
  );
};
```

## Event Enums

```typescript
// src/multiplayer/events.ts
export enum MultiplayerEvent {
  STATE = 'STATE',
  PLAYER_MOVE = 'PLAYER_MOVE',
  PLAYER_SUBMITTED = 'PLAYER_SUBMITTED',
  LEADERBOARD_UPDATE = 'LEADERBOARD_UPDATE',
  AVATAR_UPDATE = 'AVATAR_UPDATE',
  ERROR = 'ERROR',
}

export enum ErrorCode {
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  STATE_PERSIST_FAILED = 'STATE_PERSIST_FAILED',
}
```

## Usage Example

```typescript
// src/pages/GamePage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { GameWithMultiplayer } from '../components/GameWithMultiplayer';

const GamePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const jwt = localStorage.getItem('jwt'); // or from auth context

  if (!roomId || !jwt) {
    return <div>Error: Missing room ID or authentication</div>;
  }

  return <GameWithMultiplayer roomId={roomId} jwt={jwt} />;
};

export default GamePage;
```

## Quick Setup Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables (see .env.example)
- [ ] Run PartyKit: `npm run partykit:dev`
- [ ] Test connection: Use invite link from `/api/invites`
- [ ] Verify avatar display
- [ ] Test leaderboard updates
- [ ] Test reconnection behavior

## Common Integration Patterns

### 1. Home Page Integration
```typescript
// Add "Play with Friends" button
<button onClick={() => navigate('/multiplayer/lobby')}>Play with Friends</button>
```

### 2. Invite Link Handling
```typescript
// Handle invite links
const handleInvite = (inviteCode: string) => {
  // Redirect to lobby with invite
  navigate(`/lobby/${inviteCode}`);
};
```

### 3. Real-time Updates
```typescript
// Listen for real-time updates
useEffect(() => {
  adapter.on('PLAYER_SUBMITTED', (data) => {
    // Update UI when other players submit
    showNotification(`${data.playerName} submitted!`);
  });
}, [adapter]);
```
