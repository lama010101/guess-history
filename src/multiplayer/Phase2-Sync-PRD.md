# Phase 2 Sync Mode PRD

## Overview
This PRD outlines the transition from Async-only to full Sync mode multiplayer, including real-time gameplay, ready-up lobby, and host transfer capabilities.

## Scope Freeze
**Phase 2 will ONLY include:**
- Real-time sync gameplay
- Ready-up lobby system
- Host transfer mechanism
- Latency optimization
- Latency benchmarking tools
**Phase 2 will NOT include:**
- Spectator mode
- Custom game modes
- Tournament brackets
- Voice chat
- Advanced moderation tools

## Requirements

### Functional Requirements

#### 1. Real-time Sync Gameplay
- **Round synchronization**: All players see the same round simultaneously
- **Real-time scoring**: Scores update instantly for all players
- **Submission synchronization**: All submissions visible immediately
- **Round timer**: Countdown visible to all players
- **Round completion**: Automatic progression when all players submit or timer expires

#### 2. Ready-up Lobby System
- **Player ready state**: Visual indicators for ready/not-ready
- **Host controls**: Start game, kick players, change settings
- **Settings panel**: Round count, time limits, game modes
- **Player management**: Join/leave notifications
- **Minimum players**: Configurable (default 2, max 10)

#### 3. Host Transfer Mechanism
- **Automatic host detection**: Longest-connected player becomes host
- **Host disconnection handling**: Automatic transfer to next player
- **Host privileges**: Settings control, start game, manage players
- **Host indicators**: Visual distinction for current host

#### 4. Latency Optimization
- **Ping calculation**: Real-time latency display
- **Lag compensation**: Adjusted scoring for high-latency players
- **Connection quality indicators**: Color-coded latency warnings
- **Automatic reconnection**: Seamless reconnection handling

#### 5. Latency Benchmarking
- **Performance metrics**: P95/P99 latency tracking
- **Connection quality**: Jitter, packet loss monitoring
- **Device performance**: FPS tracking on mobile devices
- **Network condition testing**: Various network simulations

### Technical Requirements

#### 1. Server Architecture Changes
```typescript
// Phase 2 Server State
interface SyncRoomState {
  mode: 'sync';
  currentRound: number;
  roundTimer: number;
  roundState: 'waiting' | 'playing' | 'scoring' | 'complete';
  submissions: Map<string, Submission>;
  readyPlayers: Set<string>;
  hostId: string;
  settings: SyncSettings;
}

interface SyncSettings {
  roundCount: number;
  roundTime: number; // seconds
  minPlayers: number;
  maxPlayers: number;
  allowLateSubmissions: boolean;
}
```

#### 2. Client Architecture
```typescript
// Sync Game Hook
interface UseSyncGame {
  gameState: SyncGameState;
  submitGuess: (guess: Coordinates) => void;
  toggleReady: () => void;
  startGame: () => void; // host only
  kickPlayer: (playerId: string) => void; // host only
  latency: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}
```

#### 3. Event System Updates
```typescript
// New events for sync mode
enum SyncEvents {
  PLAYER_READY = 'PLAYER_READY',
  PLAYER_NOT_READY = 'PLAYER_NOT_READY',
  GAME_START = 'GAME_START',
  ROUND_START = 'ROUND_START',
  ROUND_END = 'ROUND_END',
  HOST_CHANGED = 'HOST_CHANGED',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  KICK_PLAYER = 'KICK_PLAYER',
}
```

## User Interface Design

### 1. Ready-up Lobby
```typescript
// Lobby UI Components
interface LobbyUI {
  playerList: PlayerCard[];
  readyButton: ReadyButton;
  settingsPanel: SettingsPanel;
  startButton: StartButton; // host only
  playerCount: PlayerCountDisplay;
}
```

### 2. In-Game UI
```typescript
// Sync Game UI
interface SyncGameUI {
  roundTimer: CountdownTimer;
  playerStatus: PlayerStatusBar[];
  submissionStatus: SubmissionIndicator[];
  latencyDisplay: LatencyIndicator;
  hostControls: HostControlPanel;
}
```

### 3. Host Controls
```typescript
// Host Management UI
interface HostControls {
  kickPlayer: (playerId: string) => void;
  changeSettings: (settings: SyncSettings) => void;
  startGame: () => void;
  endGame: () => void;
}
```

## Performance Targets

### Latency Targets
- **Excellent**: < 50ms
- **Good**: 50-100ms
- **Fair**: 100-200ms
- **Poor**: > 200ms

### Connection Quality
- **Packet loss**: < 1%
- **Jitter**: < 10ms
- **Disconnections**: < 1 per hour

### Device Performance
- **Mobile FPS**: > 30 FPS
- **Desktop FPS**: > 60 FPS
- **Memory usage**: < 100MB per room

## Testing Strategy

### 1. Latency Testing
- **Network simulation**: 3G, 4G, WiFi conditions
- **Geographic testing**: Different regions
- **Device testing**: Mobile, desktop, tablet
- **Load testing**: 50+ concurrent players

### 2. Host Transfer Testing
- **Intentional disconnection**: Host leaves gracefully
- **Network failure**: Host loses connection
- **Browser crash**: Host browser crashes
- **Multiple transfers**: Chain of host changes

### 3. Ready-up Flow Testing
- **Minimum players**: Test with 1, 2, 3+ players
- **Settings changes**: Verify settings persist
- **Player joining/leaving**: During ready-up phase
- **Timeout scenarios**: Ready-up timeout handling

### 4. Real-time Sync Testing
- **Simultaneous submissions**: All players submit at once
- **Late submissions**: Players submit after timer
- **Network interruptions**: Mid-round disconnections
- **State synchronization**: Verify all players see same state

## Implementation Plan

### Phase 2.1: Core Sync Engine
- [ ] Implement sync room state management
- [ ] Add round timer system
- [ ] Create submission synchronization
- [ ] Implement real-time scoring

### Phase 2.2: Ready-up Lobby
- [ ] Design lobby UI components
- [ ] Implement ready-up system
- [ ] Add settings panel
- [ ] Create player management

### Phase 2.3: Host Transfer
- [ ] Implement host detection logic
- [ ] Add host transfer mechanism
- [ ] Create host control UI
- [ ] Add host privilege system

### Phase 2.4: Latency Optimization
- [ ] Implement ping calculation
- [ ] Add lag compensation
- [ ] Create connection quality indicators
- [ ] Add performance monitoring

### Phase 2.5: Testing & Benchmarking
- [ ] Create latency testing tools
- [ ] Implement performance benchmarks
- [ ] Add automated testing suite
- [ ] Create monitoring dashboard

## Technical Architecture

### 1. Server Changes
```typescript
// Sync room server
class SyncRoom extends PartyKitServer {
  onRoundStart() { /* implementation */ }
  onRoundEnd() { /* implementation */ }
  onPlayerReady() { /* implementation */ }
  onHostChange() { /* implementation */ }
}
```

### 2. Client Architecture
```typescript
// Sync client
class SyncClient {
  connect() { /* implementation */ }
  submitGuess() { /* implementation */ }
  toggleReady() { /* implementation */ }
  handleHostChange() { /* implementation */ }
}
```

### 3. State Management
```typescript
// Sync state store
interface SyncStateStore {
  gameState: SyncGameState;
  playerStates: Map<string, PlayerState>;
  settings: SyncSettings;
  metrics: PerformanceMetrics;
}
```

## Monitoring & Analytics

### Performance Metrics
- **Round completion time**: Average time per round
- **Player latency**: P95/P99 latency across all players
- **Connection stability**: Disconnection rate
- **Host transfer frequency**: How often hosts change

### User Experience Metrics
- **Ready-up time**: Average time to start game
- **Settings changes**: Frequency of settings modifications
- **Player satisfaction**: Post-game surveys
- **Abandonment rate**: Players leaving mid-game

## Risk Assessment

### High Risk
- **Latency issues**: Could affect gameplay experience
- **Host transfer failures**: Could leave rooms orphaned
- **State synchronization bugs**: Could cause desync issues

### Medium Risk
- **Mobile performance**: Could be challenging on older devices
- **Network variability**: Different network conditions
- **Browser compatibility**: Edge cases with older browsers

### Low Risk
- **UI complexity**: Additional UI components
- **Settings persistence**: Settings storage and retrieval
- **Analytics integration**: Performance tracking

## Success Criteria

### Technical Success
- [ ] P95 latency < 100ms
- [ ] Host transfer success rate > 99%
- [ ] State sync accuracy 100%
- [ ] Mobile FPS > 30 FPS

### User Experience Success
- [ ] Ready-up time < 30 seconds average
- [ ] Game start success rate > 95%
- [ ] Player satisfaction score > 4.0/5.0
- [ ] Abandonment rate < 5%

## Timeline

### Phase 2 Timeline
- **Week 1**: Core sync engine implementation
- **Week 2**: Ready-up lobby system
- **Week 3**: Host transfer mechanism
- **Week 4**: Latency optimization
- **Week 5**: Testing and benchmarking
- **Week 6**: Bug fixes and polish

### Milestones
- **Milestone 1**: Core sync engine working
- **Milestone 2**: Ready-up lobby functional
- **Milestone 3**: Host transfer reliable
- **Milestone 4**: Performance targets met
- **Milestone 5**: QA complete and approved
