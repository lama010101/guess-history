# Guess History Multiplayer Architecture

## Overview
This document provides comprehensive architecture guidelines for the Guess History multiplayer system, built on PartyKit with Supabase for state persistence and Cloudflare Workers for async processing.

## System Architecture

### Core Components

#### 1. PartyKit Server (`src/multiplayer/Server.ts`)
- **Purpose**: Real-time multiplayer coordination
- **Key Features**:
  - JWT-based authentication with Supabase
  - State persistence with optimistic locking
  - Authoritative event logging
  - Room hibernation and reconnection handling
  - Async deadline processing

#### 2. Supabase Integration
- **Tables**:
  - `room_state`: Room state persistence with revision-based locking
  - `partykit_logs`: Authoritative event audit trail
- **RLS Policies**: Service role access only
- **Retention**: 30-day log retention policy

#### 3. Multiplayer Adapter (`src/multiplayer/MultiplayerAdapter.ts`)
- **Purpose**: Socket-agnostic abstraction layer
- **API**: `connect()`, `send()`, `on()`, `disconnect()`, `getState()`
- **Features**: Auto-reconnection, error handling, state management

#### 4. Avatar System (`src/multiplayer/AvatarSystem.ts`)
- **Purpose**: Player avatar management and submission cues
- **Features**: Real-time avatar updates, submission notifications

#### 5. Leaderboard System (`src/multiplayer/LeaderboardSystem.ts`)
- **Purpose**: Comprehensive scoring and ranking
- **Metrics**: Accuracy, streaks, fastest submissions, average distance

### File Structure

```
src/multiplayer/
├── Server.ts                 # PartyKit server implementation
├── MultiplayerAdapter.ts     # Socket-agnostic adapter
├── AvatarSystem.ts          # Avatar and submission cue management
├── LeaderboardSystem.ts     # Scoring and ranking system
└── [other multiplayer files]

supabase/
├── migrations/
│   └── 20250804150000_create_partykit_tables.sql  # DB schema
└── functions/
    └── create-invite/index.ts  # HMAC-signed invite endpoint

partykit/
├── cron/async-deadlines.ts  # Cloudflare Workers cron job
└── [PartyKit configuration]
```

## API Endpoints

### Invite Creation
- **Endpoint**: `POST /api/invites`
- **Function**: `supabase/functions/create-invite/index.ts`
- **Features**: HMAC signing, rate limiting (20/min per IP)
- **TTL**: 15 minutes

### Room Management
- **Base URL**: `ws://localhost:1999/parties/main/{roomId}`
- **Authentication**: JWT token in query parameter
- **Events**: `STATE`, `PLAYER_MOVE`, `PLAYER_SUBMITTED`, `LEADERBOARD_UPDATE`

## Environment Variables

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INVITE_HMAC_SECRET=your-hmac-secret
PARTYKIT_URL=ws://localhost:1999  # or production URL
PARTYKIT_DASH_KEY=your-partykit-dash-key
VITE_PARTYKIT_URL=ws://localhost:1999  # for frontend
```

## Usage Patterns

### Starting a Multiplayer Game

1. **Create Invite**: POST to `/api/invites` with mode (sync/async)
2. **Connect**: Use MultiplayerAdapter with returned invite URL
3. **State Sync**: Listen for `STATE` events
4. **Game Events**: Send `PLAYER_MOVE` events, receive `PLAYER_SUBMITTED` notifications

### State Management

```typescript
// Connect to multiplayer
const adapter = createMultiplayerAdapter();
await adapter.connect(roomId, jwt);

// Listen for state updates
adapter.on('STATE', (data) => {
  // Update local state
});

// Send player moves
adapter.send('PLAYER_MOVE', { round: 1, guess: { lat, lng } });
```

### Avatar and Leaderboard Integration

```typescript
// Avatar system
const { avatars, recordSubmission } = useAvatarSystem();

// Leaderboard system
const { leaderboard, updatePlayerScore } = useLeaderboardSystem();

// Process round results
updatePlayerScore(playerId, playerName, avatar, {
  distance: calculatedDistance,
  score: calculatedScore,
  submissionTime: timeTaken,
  isCorrect: distance < 50
});
```

## Development Setup

### Local Development
```bash
# Start PartyKit server
npm run partykit:dev

# Start frontend
npm run dev

# Run tests
npm run test:multiplayer
```

### Production Deployment
```bash
# Deploy PartyKit
npm run partykit:deploy

# Deploy Supabase functions
supabase functions deploy
```

## Testing Strategy

### Unit Tests
- Server state management
- Authentication flow
- Avatar updates
- Leaderboard calculations

### Integration Tests
- End-to-end multiplayer flow
- Reconnection handling
- State persistence
- Async deadline processing

### Performance Tests
- Concurrent player handling
- State serialization performance
- WebSocket connection limits

## Security Considerations

### Authentication
- JWT tokens required for all connections
- Rate limiting on invite creation
- Service role key for database access

### Data Validation
- Input sanitization on all events
- State schema validation
- Payload size limits

### Abuse Prevention
- Per-IP rate limiting (20 requests/min)
- Room size limits
- Event frequency limits

## Monitoring and Observability

### Metrics to Track
- Connection counts
- Message throughput
- Error rates
- State persistence latency
- Reconnection attempts

### Logging
- All authoritative events logged to `partykit_logs`
- Room lifecycle events
- Error states and edge cases

## Migration Guide

### From Single Player to Multiplayer

1. **Add MultiplayerAdapter** to existing game components
2. **Integrate AvatarSystem** for player display
3. **Add LeaderboardSystem** for scoring
4. **Update state management** to use multiplayer state
5. **Add invite flow** for room creation/joining

### Database Migration

```sql
-- Run the migration
supabase db reset
supabase db push

-- Verify tables exist
supabase table list
```

## Troubleshooting

### Common Issues

**Connection failures**: Check JWT token validity
**State sync issues**: Verify Supabase RLS policies
**Avatar not displaying**: Check avatar URL format
**Leaderboard not updating**: Ensure proper event emission

### Debug Commands

```bash
# Check PartyKit logs
partykit logs

# Monitor Supabase logs
supabase logs

# Test invite endpoint
curl -X POST https://your-project.supabase.co/functions/v1/create-invite \
  -H "Content-Type: application/json" \
  -d '{"mode": "async"}'
```

## Best Practices

### State Management
- Always use optimistic locking for state updates
- Implement proper error handling for all async operations
- Validate state before persistence

### Performance
- Minimize state size for efficient serialization
- Use debouncing for frequent updates
- Implement proper cleanup on disconnect

### User Experience
- Provide clear feedback for connection states
- Implement loading states for async operations
- Handle edge cases gracefully

## Future Enhancements

### Planned Features
- Spectator mode
- Private rooms with passwords
- Tournament brackets
- Real-time chat
- Custom game modes
- Achievement system

### Technical Improvements
- Connection pooling optimization
- State compression
- CDN integration for avatars
- Real-time analytics dashboard
