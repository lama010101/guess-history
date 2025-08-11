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
- **Base URL**: `ws(s)://<VITE_PARTYKIT_HOST>/parties/lobby/{roomCode}`
- **Authentication**: none required yet (invite token enforcement planned)
- **Events (Lobby)**: Server→Client: `players`, `chat`, `full`; Client→Server: `join`, `chat`

## Environment Variables

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INVITE_HMAC_SECRET=your-hmac-secret
VITE_PARTYKIT_HOST=localhost:1999  # ws(s) host:port used by frontend client
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
npm run deploy:partykit

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

## Round Session ID and Hint Persistence

- Central helper: `src/utils/roomState.ts: makeRoundId(roomId: string, roundNumber: number)` builds the canonical round session ID (`<roomId>-r<roundNumber>`). Use this everywhere round-scoped persistence is required (e.g., `round_hints`, results aggregation), instead of parsing URLs or hand-rolling strings.
- Hint system V2: `src/hooks/useHintV2.ts` accepts an optional second parameter `opts?: { roomId?: string; roundNumber?: number }`. When provided, the hook uses `makeRoundId()` to read/write purchases in `round_hints`, avoiding any coupling to the route structure. Callers that don't have room context can omit this parameter and the hook will fall back to URL parsing for backward compatibility.
- Call sites updated:
  - `src/pages/GameRoundPage.tsx` now calls `useHintV2(imageForRound, { roomId, roundNumber })`.
  - `src/pages/RoundResultsPage.tsx` uses `makeRoundId(roomId, roundNumber)` when querying hint debts.

## Lobby Timer Settings

The multiplayer lobby supports a host-configurable round timer that synchronizes to all participants and is applied when the game starts.

- **Client → Server message**: `settings`
  - Shape: `{ type: 'settings'; timerSeconds?: number; timerEnabled?: boolean }`
  - Sent by: Host only
  - Behavior: Server validates/clamps values and stores in room state.

- **Server → Client message**: `start`
  - Shape: `{ type: 'start'; startedAt: string; durationSec: number; timerEnabled: boolean }`
  - Includes the effective timer values used to initialize the round timer on all clients.

- **Key files**:
  - Server: `server/lobby.ts` — handles `settings` from host, clamps values, includes `durationSec` and `timerEnabled` in `start` broadcast.
  - Shared types: `src/lib/partyClient.ts` — defines `LobbyClientMessage` and `LobbyServerMessage` including `settings` and extended `start`.
  - Lobby UI: `src/pages/Room.tsx` — host-only timer toggle and slider (reuses Play Solo styling/logic); non-hosts see the selected duration. Uses `GameContext` setters to update `roundTimerSec` and `timerEnabled` and relies on an effect to send `settings` when changed.
  - Solo settings reference: `src/components/game/GameSettings.tsx`.

- **UI behavior**:
  - Host sees a toggle (timer on/off) and a slider (5–300 seconds, step 5s) and the formatted time.
  - Participants see the formatted time and a note that the host controls the timer.
  - Timer values are also validated on the server.

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

## Multiplayer Lobby (PartyKit) Feature Map

- **Server**: `server/lobby.ts`
  - 2-player lobby, presence (players list), and chat
  - Validates messages with zod; emits `players | chat | full`

- **Client helper**: `src/lib/partyClient.ts`
  - Builds WebSocket URL from `VITE_PARTYKIT_HOST`
  - Path: `/parties/lobby/:roomCode`

- **Pages**:
  - `src/pages/PlayWithFriends.tsx` — uses authenticated display name automatically, create or join room (no manual name input)
  - `src/pages/Room.tsx` — connects to lobby, shows players & chat, ready-up roster (ready/host), auto-reconnect, host can copy/share invite link
  - Display names: `Room.tsx` sources the player's display name from `AuthContext` user metadata (fallback to email local-part); `?name` is no longer passed from the UI

- **Routing**: `src/App.tsx`
  - `GET /play` → `PlayWithFriends`
  - `GET /room/:roomCode` → `Room`

- **Config**: `partykit.json`
  - `parties.lobby = "server/lobby.ts"`
  - `vars.MAX_PLAYERS = "8"` (override per-env as needed)

- **Environment**:
  - Frontend: `VITE_PARTYKIT_HOST` (e.g. `localhost:1999`)
  - Example file: `.env.example`

- **Scripts (package.json)**:
  - `npm run partykit:dev` — PartyKit dev on :1999
  - `npm run dev:mp` — run Vite + PartyKit concurrently
  - `npm run deploy:partykit` — deploy PartyKit

- **Message shapes**:
  - Client→Server: `join { name }`, `chat { message, timestamp }`, `ready { ready: boolean }`
  - Server→Client: `players { players: string[] }`, `roster { players: { name, ready, host }[] }`, `chat { from, message, timestamp }`, `full`, `start { startedAt }`

### Deterministic Images in Multiplayer

- All players see the same images in the same order for a given room.
- The server emits `start { startedAt }`. The client passes `roomId` and `seed = startedAt` to `GameContext.startGame()`.
- `GameContext.startGame()` calls `getOrPersistRoomImages(roomId, seed, count)` which:
  - If `public.game_sessions` has a row for `room_id`, returns those `image_ids` in stored order.
  - Else, computes a seeded order from `images` (stable base order by `id`), upserts the record, and returns the first N.
- Table: `public.game_sessions (room_id text pk, seed text, image_ids text[], started_at timestamptz)` with RLS for authenticated users.
- Solo games continue to use per-user no-repeat selection via `getNewImages()` and local shuffle.

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

## Multiplayer In-Round State Persistence

To survive refresh and reconnects during a multiplayer game, we persist shared state per room and per round.

- __Tables__:
  - `public.game_sessions` adds `current_round_number integer` to track the latest round for a room.
  - `public.room_rounds (room_id text, round_number int, started_at timestamptz, duration_sec int, pk(room_id, round_number))` stores the canonical start time and configured duration for each round in a room.

- __Migrations__:
  - `supabase/migrations/20250809_add_room_rounds_and_current_round.sql` creates `room_rounds`, enables RLS, policies for authenticated users, and adds `current_round_number` to `game_sessions`.

- __Client utilities__:
  - `src/utils/roomState.ts`
    - `getOrCreateRoundState(roomId, roundNumber, durationSec)` → fetches or creates the `room_rounds` row and returns `{ started_at, duration_sec }`. Gracefully falls back if the table is missing.
    - `setCurrentRoundInSession(roomId, roundNumber)` → upserts `game_sessions.current_round_number` for the room. Tolerates missing column/table.

- __Timer restoration__:
  - `src/pages/GameRoundPage.tsx` imports `getOrCreateRoundState()` and initializes the HUD timer by computing `remaining = duration_sec - (now - started_at)` to keep all players in sync after refresh.
  - The same page calls `setCurrentRoundInSession(roomId, roundNumber)` on load to persist the active round for reconnect flows.

- __Hint purchases restoration__:
  - Use the centralized helper `makeRoundId(roomId, roundNumber)` from `src/utils/roomState.ts` to construct the canonical round session ID (format: `${roomId}-r${roundNumber}`).
  - `src/hooks/useHintV2.ts` accepts optional `{ roomId, roundNumber }`. Callers should pass these when available (e.g., `GameRoundPage`, `GameLayout2`, `HintButton`) to avoid URL parsing. The hook falls back to parsing the URL only if opts are omitted for backward compatibility.
  - Fetch and insert in `public.round_hints` both use this `round_id` so purchased hints are restored on refresh.
  - Columns used in `public.round_hints` for debts and metadata: `xpDebt integer`, `accDebt integer`, `label text`, `hint_type text`, plus legacy `cost_xp`/`cost_accuracy`. Migration `20250728111000_add_missing_columns_to_round_hints.sql` maps legacy costs into `xpDebt`/`accDebt`.
  - RLS policy: authenticated users can manage their own rows (policy: "Users can manage their round_hints").

Notes:
- All DB interactions include fallbacks where feasible. UI remains unchanged; persistence is transparent to users.

## Game Page Layout Tweaks (Mobile)

- __Image section height__: On mobile, the image section in `src/components/layouts/GameLayout1.tsx` uses `h-[40vh]` (was `50vh`) to ensure the WHERE card is fully visible without scroll. Desktop remains `lg:h-screen`.
- __Transparent bottom navbar__: The fixed bottom bar was made transparent so only the Submit button remains visible.
  - `src/components/game/LocationSelector.tsx` → container class `bg-transparent` (was `bg-background`).
  - `src/components/game/SubmitGuessButton.tsx` → container class `bg-transparent` (was `bg-white dark:bg-history-dark`).
- __Buttons remain visible__: The actual buttons keep their own backgrounds for contrast and accessibility; only the bar behind them is transparent.

## Fullscreen Round Image & Guess Button FX

- __Fullscreen image height__:
  - Component: `src/components/layouts/FullscreenZoomableImage.tsx`
  - Container now uses `style={{ height: '100dvh', minHeight: '100vh' }}` to ensure the image area fills the entire viewport height across browsers (mobile dynamic viewport units + fallback).
  - The image element keeps `className="h-full w-auto object-contain"` so the photo respects aspect ratio while filling height.
  - Default zoom level on open is **250%** (`zoom = 2.5`).
  - The fullscreen **GUESS** button is compact and centered at the bottom (`fixed bottom-6 left-1/2 -translate-x-1/2`), with a solid orange background (`bg-orange-500 text-white`, no hover color change) and rounded-full shape. Width is increased via horizontal padding (`px-16`) while keeping height the same (`py-2`).

- __Sparkling GUESS/Submit animations__:
  - Overlay GUESS button (fullscreen): same component as above; replaced bounce with lightweight sparkle bursts positioned around the button. Uses local `@keyframes sparkle` and Tailwind arbitrary `animate-[sparkle_... ]` utilities.
  - Main submit button: `src/components/game/SubmitGuessButton.tsx` adds subtle glow + three sparkles when a location is selected (enabled state). Disabled state unchanged.
  - Both components define a small inline `<style>` block for the `sparkle` keyframes to avoid global CSS changes.

## UI Polish: Slider and Map Avatar Halo

- __Shared Slider Styling__
  - File: `src/components/ui/slider.tsx`
  - Track shows a neutral line: `bg-gray-300` in light, `dark:bg-white` in dark.
  - Filled range is hidden to remove the trailing orange segment.
  - Thumb size doubled to 32px (h-8 w-8) for better touch ergonomics.
  - Touch/focus halo: a semi-transparent orange disk renders via a pseudo-element and appears on `:focus-visible` and `:active`.

- __Map Avatar Halo__
  - File: `src/components/map/AvatarMarker.tsx`
  - Avatar marker now renders with a semi-transparent orange halo behind it (rgba(251,146,60,0.5)).
  - Halo diameter is 2× the avatar visual size (avatar ≈ `sizePx/4`, halo ≈ `sizePx/2`).
  - Implemented with an inline-styled wrapper to avoid reliance on dynamic Tailwind class names in `L.divIcon` HTML.
  - Error/placeholder states remain intact; only visuals were enhanced.

## UI Styling Consistency: Orange Buttons & Font

- Orange action buttons now use a consistent border radius matching the Submit button.
  - Components updated: `src/pages/RoundResultsPage.tsx` (both "Next Round" buttons) and `src/components/layouts/FullscreenZoomableImage.tsx` ("GUESS" button) now use `rounded-xl` with `bg-orange-500 text-white`.
  - Hover/active states preserved (`hover:bg-orange-500` or `hover:bg-orange-600` as originally specified by component).

- Global font set to Montserrat for consistent typography.
  - `tailwind.config.ts` sets `theme.extend.fontFamily.sans` and `serif` to `Montserrat`.
  - Root `index.css` imports Montserrat from Google Fonts to ensure the font is available at runtime.
  - Note: `src/index.css` already enforced Montserrat via CSS; keeping Tailwind config aligned avoids class-level font drift.

## Results & Final Score UX Tweaks

- Round Results bottom "Next Round" button width increased.
  - File: `src/pages/RoundResultsPage.tsx`
  - Change: bottom button horizontal padding doubled (`px-4` → `px-8`), height unchanged (`py-2`).
  - The top navbar Next button was not changed, per requirement.

- Removed intermediate "Preparing Results..." screen after submitting a guess.
  - File: `src/pages/RoundResultsPage.tsx`
  - Behavior: when results are not ready, the page now returns `null`, avoiding the transitional loading view until data is present.

- Final Score page "Play Again" button restyled and icon updated.
  - File: `src/pages/FinalResultsPage.tsx`
  - Styles: `bg-orange-500 text-white hover:bg-orange-600` with existing sizing retained.
  - Icon: replaced spinner `Loader` with `RefreshCw` (replay icon) from `lucide-react`.

### Final Score page structural/style updates

- All primary cards use dark background `#202020` on Final Results page.
  - Files/Sections: `src/pages/FinalResultsPage.tsx`
    - Summary card: section container `bg-[#202020]`.
    - Each round result is wrapped in `div.bg-[#202020].rounded-lg` around `RoundResultCard` when rendered by FinalResultsPage.

- "ROUND SUMMARY" renamed to "GAME SUMMARY" and expanded by default.
  - State: `isRoundSummaryOpen` default set to `true`.

- "WHEN" and "WHERE" grouped side-by-side as mini-cards.
  - Layout: `grid grid-cols-1 sm:grid-cols-2 gap-4` inside the summary content.
  - Styles: Each mini-card has its own rounded dark background (`#262626` and `#2a2a2a`) and padding.

- Added label "BREAKDOWN" below Game Summary and above per-round cards.
  - Element: `h2.text-lg.font-bold` with existing color scheme.
  - Alignment: Added left padding (`pl-4`) to align with Game Summary content padding.

- Mobile layout consistency for WHEN/WHERE mini-cards
  - Forced 2-column grid at all breakpoints (`grid-cols-2`) so they remain side-by-side even on mobile.

### Home Page UI Tweaks

- Logo text updated to "G-HISTORY" with original letter colors.
  - File: `src/components/Logo.tsx`
  - Change: `GUESS-` → `G-`, `HISTORY` remains orange.

- Play button sizing reduced and spacing tightened; top tiles match bar width.
  - File: `src/pages/HomePage.tsx`
  - Bottom bars width reduced ~10%: `w-60` → `w-[13.5rem]`.
  - Top gradient tiles set to the same width: `w-[13.5rem]`.
  - Top gradient tiles are square (1:1): `h-[13.5rem]`.
  - Inter-card gap reduced by 15% using arbitrary values:
    - `gap-12 md:gap-20` → `gap-[1.7rem] md:gap-[2.55rem]`.
