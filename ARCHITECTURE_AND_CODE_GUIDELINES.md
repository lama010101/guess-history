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
# Optional: email confirmation redirect for Supabase
VITE_AUTH_EMAIL_REDIRECT_TO=https://your-domain.com/auth/callback
```

## Authentication and Signup Flow (Supabase)

- **Primary auth code**:
  - `src/contexts/AuthContext.tsx` → `signUpWithEmail(email, password)`
  - `src/components/AuthModal.tsx` → UI that calls the auth methods
  - `src/integrations/supabase/client.ts` → Supabase client with a fetch interceptor

- **Redirect handling**:
  - If `VITE_AUTH_EMAIL_REDIRECT_TO` is defined, it is passed to Supabase as `emailRedirectTo`.
  - A global fetch interceptor strips `redirect_to` from `/auth/v1/signup` calls to prevent 500s when local/invalid URLs sneak in.

- **Anonymous upgrade fallback**:
  - If `supabase.auth.signUp(...)` returns “Database error saving new user” (500), the client will auto:
    1) Ensure an anonymous session via `signInAnonymously()`
    2) Upgrade the current user with `updateUser({ email })` and `updateUser({ password })`
  - This bypasses a fresh insert into `auth.users` and is resilient to transient insert failures.

- **Supabase trigger guidance**:
  - If you maintain a DB trigger that creates a row in `public.profiles` on `auth.users` insert, ensure the function matches the current schema and uses `SECURITY DEFINER`.
  - Quick unblock: disable the trigger if it causes 500s; the app creates profiles on first sign-in anyway.

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

### Web Analytics (Vercel)

- Library: `@vercel/analytics`
- Injection point: `src/main.tsx` imports `inject` and calls it when `import.meta.env.PROD` is true, before rendering the app. This tracks page views in production without changing UI.

Install:

```bash
npm i @vercel/analytics
```

Notes:

- No environment variables required.
- Data appears in Vercel Analytics after deploy. For local dev, analytics remains disabled.

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

## UI/UX Consistency Rules

- Fullscreen images default to 100% zoom (zoom=1). See `src/components/layouts/FullscreenZoomableImage.tsx`.
- On round results:
  - In `When` card, the year after "Your guess:" is white in dark mode and dark gray in light mode (`text-gray-900 dark:text-white`). Implemented in `src/components/layouts/ResultsLayout2.tsx` and `src/components/results/TimeAccuracyCard.tsx`.
  - Source and Rate buttons use a black background with white text across themes for consistency.
    - Source button in `ResultsLayout2.tsx`.
    - Rate button in `RoundResultsPage.tsx`.
  - Round header text size reduced by one step (Tailwind `text-lg`) in `src/components/results/ResultsHeader.tsx`.
  - Home button remains light grey and consistently styled across pages.
  
  - When card and Where card affordances:
    - When the year is not selected, the inline year input on the `When?` card shows placeholder text "Year".
    - When the location is not selected, the trailing label on the `Where?` card shows italic placeholder text "Location".
    - Add a small spacer below the `Where?` card for breathing room on the page (`<div class="h-6" aria-hidden>`), placed after the card.

## Game Round Validation and Alerts

- **No default year selected**
  - `selectedYear` is `number | null` in `src/pages/GameRoundPage.tsx` and `src/components/layouts/GameLayout1.tsx` (`GameLayout1Props`).
  - `YearSelector` in `src/components/game/YearSelector.tsx` accepts `number | null`. Before first interaction, `GameLayout1` passes `null` so the inline year input shows empty while the slider renders without committing a value.
  - `GameLayout1` tracks `yearInteracted` to avoid syncing a year into the inline input until the user interacts.

- **Disabled Submit alerts (GameLayout1.handleDisabledSubmitClick)**
  - Neither year nor location: "You must guess a year and location"
  - Location only: "You must guess the location"
  - Year only: "You must guess the year"
  - Delivery: shown as a toast notification (destructive variant) when the disabled Submit area is clicked.

- **Manual submit guards (GameRoundPage.handleSubmitGuess)**
  - Rejects submit if `selectedYear === null`.
  - Rejects submit if no location guess is present.
  - Uses toast errors; Submit button is only enabled when both inputs are valid.

- **Timer timeout behavior (GameRoundPage.handleTimeComplete)**
  - No location selected: records round with `score: 0`, `guessYear: null` and navigates to results.
  - Location selected but no year: records round with `score: 0`, `guessYear: null` and navigates to results.
  - Both selected: calculates score normally and records result.
  - `GameLayout1` wires `onTimeout` to `handleTimeComplete` so HUD-driven timeouts enforce these rules.

## Migration Guide
  
  ### From Single Player to Multiplayer
  
  1. **Add MultiplayerAdapter** to existing game components
  2. **Integrate AvatarSystem** for player display
3. **Add LeaderboardSystem** for scoring

## Fullscreen Image Behavior

- Component: `src/components/layouts/FullscreenZoomableImage.tsx`
- Goal: Fill 100% of viewport height, preserve aspect ratio, allow horizontal cropping with panning. Default zoom is 100% (zoom=1).
- Container: fullscreen fixed container uses `height: 100dvh` (fallback `min-height: 100vh`) with `overflow: hidden`.
- Image CSS (both placeholder and full-res):
  - `object-fit: cover`
  - `object-position: center`
  - `width: auto`
  - `max-width: none`
  - `display: block`
- Interaction:
  - Initial zoom set to 1 (100%); wheel/pinch supported.
  - Panning is enabled at base zoom; offsets are clamped within bounds.

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

**Database error saving new user / creating anonymous user (500)**:
- Cause: failing DB trigger/function on `auth.users` insert (often profile-creation function out of sync or missing privileges)
- App behavior: client falls back to anonymous upgrade path; however, if anonymous creation also fails, fix the DB trigger.
- Quick unblock (disable trigger):
```sql
drop trigger if exists on_auth_user_created on auth.users;
```
- Proper fix: update the trigger function to match `public.profiles` schema and mark it `security definer`.

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

## UI Adjustments: Game & Round Results (2025-08)

- Game page
  - `src/components/navigation/GameOverlayHUD.tsx`: Centered score badges in top overlay; hide Home button on mobile.
  - `src/components/layouts/GameLayout1.tsx`: Mobile Home button moved to the bottom navbar (removed from the When card); pushed `YearSelector` to card bottom; set When/Where icons to light grey; restored 1s highlight animation on exit fullscreen.
  - `src/components/layouts/GameLayout2.tsx`: Set When/Where icons to light grey.
  - 2025-08-14 refinements:
    - `src/components/layouts/GameLayout1.tsx`: Tightened When card height (`min-h` reduced), inline year input is always visible with an underline even before selection; widened to `~6ch` with padding to avoid digit clipping; Submit Guess is disabled until both year and location are selected; desktop and mobile Home buttons use black text on `#999999` background.
    - `src/components/game/YearSelector.tsx`: `selectedYear` is optional; when `null/undefined`, the knob is centered (midpoint) without setting a default year; `onChange` only fires on user interaction.
    - `src/components/game/LocationSelector.tsx`: Map container made flexible (`flex-1 min-h-[300px]`) so the map is visible on mobile and grows on desktop.
    - Disabled Submit guidance: When the Submit button is disabled, clicking on it shows a contextual message above the button — “Select a location first” (no map guess) or “Select a year first” (invalid/missing year). The message clears automatically when inputs become valid. Applies to both desktop (bottom action row) and mobile bottom navbar.

- Round Results page
  - `src/components/results/ResultsHeader.tsx`: Round text weight set to normal.
  - `src/components/layouts/ResultsLayout2.tsx`: Progress bars are placed at the bottom of the When/Where cards; % and XP badges appear directly below the progress bars; reduced spacing under "Your Score"; labels (Accuracy/Experience) moved above values; matched "Your guess" styling to "Correct:"; removed in-layout bottom Next Round buttons.
  - `src/components/results/HintDebtsCard.tsx`: Removed border; maintain dark background.
  - `src/pages/RoundResultsPage.tsx`: Made top Next Round button more compact (kept rounded-xl per standard).
  - 2025-08-14 spacing/style harmonization:
    - `src/components/layouts/ResultsLayout2.tsx`: Reduced space between "Your Score" and penalties (mb-1). Set When/Where titles to regular weight. Added spacing between titles and content. Added extra space above the "Correct" rows in When (`mt-4`). Moved progress bars to the bottom of each card with `mt-4`, and placed %/XP badges directly below those bars. Ensured event year and guessed year use the same font-size.
    - `src/pages/RoundResultsPage.tsx`: Home button uses black text on `#999999` background (hover `#8a8a8a`).

- Final Results page
  - `src/pages/FinalResultsPage.tsx`: Removed the two mini cards for Time Accuracy and Location Accuracy under the detailed metrics grid. Kept Avg Years Off, Avg Km Away, Hints Used, and Penalty Cost.
  - `src/components/RoundResultCard.tsx`: Replaced the orange selected-value badge under the image title with plain orange text (no background) to simplify the look on breakdown cards.
  - `src/pages/FinalResultsPage.tsx`: Footer Home button uses background `#999999` (hover `#8a8a8a`) with black text in both light and dark modes.
  - `src/pages/FinalResultsPage.tsx`: Time and Location accuracy progress bars show their numeric percentages in the label row on the right.

- Game page
  - `src/components/game/LocationSelector.tsx`: On mobile, the map container uses fixed heights (`h-[320px]`/`sm:h-[360px]`); on `md+` it returns to `flex-1 min-h-[300px]` to ensure the map is always visible.
  - Submit button: Text color is forced to white across implementations.
    - `src/components/layouts/GameLayout1.tsx`: Desktop and mobile Submit Guess buttons use `!text-white`.
    - `src/components/game/SubmitGuessButton.tsx`: Button uses `!text-white`.

Notes: All changes maintain dark mode styling and Montserrat typography. See commit history around this date for detailed diffs.

## Home Page Navbar & Carousel (2025-08)

- Navbar (Home route `/test` only)
  - File: `src/layouts/TestLayout.tsx`
  - Moved centered `Logo` out of the navbar for Home only. Left side shows global scores (Accuracy, XP). Right side shows profile (`NavProfile`).
  - Other routes keep their existing navbar layout.

### UI Adjustments — Corrections (2025-08-14)

- Game page
  - File: `src/components/layouts/GameLayout1.tsx`
  - Removed animation on When/Where cards after exiting fullscreen (dropped `animate-pulse`). A brief non-animated ring highlight may still apply for 1s.
  - Updated labels to normal text and punctuation: “When?” and “Where?”.

- Round score
  - Files: `src/components/layouts/ResultsLayout2.tsx`, `src/components/results/TimeAccuracyCard.tsx`
  - Set the “Your guess” year text to regular weight (removed bold/semibold classes).

- Logo text
  - File: `src/components/Logo.tsx`
  - Updated to display "GUESS-HISTORY".

- Home page hero logo position
  - File: `src/pages/HomePage.tsx`
  - Added `<Logo />` absolutely positioned at ~1/3 viewport height (`top: 33vh`) and horizontally centered. Lives outside the navbar.

- Mobile carousel for play cards
  - File: `src/pages/HomePage.tsx`
  - Wrapped play mode cards in a horizontal native carousel using CSS scroll-snap: `overflow-x-auto`, `snap-x snap-mandatory` on mobile; `md:overflow-visible md:snap-none` on desktop.
  - Each card is a slide with `shrink-0 snap-center` to create paging.
  - Renamed labels: "PLAY SOLO" → "SOLO", "PLAY FRIENDS" → "COMPETE".
  - Added third card: "COLLABORATE" with a purple gradient. Icon placeholder (to be provided later). No click handler yet.

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

## Hint System (UI + Constants) — Canonical Files

To avoid confusion from legacy duplicates, the following are the only files you should modify for the Hint System UI/logic:

- `src/components/HintModalV2New.tsx` — The active Hint Modal rendered by `GameLayout1` and `GameLayout2`.

### Game Page Controls — HUD and Bottom Navbar

- Files:
  - `src/components/layouts/GameLayout1.tsx`
  - `src/components/navigation/GameOverlayHUD.tsx`
  - `src/components/game/YearSelector.tsx`
  - `src/components/layouts/FullscreenZoomableImage.tsx`
- HUD (overlay on image):
  - Home button is optional and shown only if both `onNavigateHome` and `onConfirmNavigation` props are provided to `GameOverlayHUD`. Desktop HUD should not show Home.
  - Hints control is not in the HUD; it lives in the bottom navbar.
  - Fullscreen button remains in HUD (bottom-right).
- Bottom navbar:
  - Desktop: buttons are Home, Hints, Submit Guess (left→right). Submit has a Send icon and uses rounded-xl, Montserrat font.
  - Mobile: only Hints (25% width) and Submit Guess (75% width). No Home button on mobile bottom bar.
- When card (Year):
  - Inline editable year input aligned with the “When?” title; no extra 'year' label.
  - `YearSelector` slider shows endpoints 1850 and 2025 without ticks.
  - Duplicate year displays removed; only the inline input + slider remain.

#### Recent refinements (When/Where, Hints, Mobile Home)

- Year visibility and styling
  - File: `src/components/layouts/GameLayout1.tsx`
  - Behavior: the inline year is hidden until the user first moves the slider.
  - State: `yearInteracted` toggled by `YearSelector.onFirstInteract()`.
  - Styling: when shown, year input uses orange text (`text-orange-400`) for emphasis.
- `YearSelector` interaction hook
  - File: `src/components/game/YearSelector.tsx`
  - Added optional prop `onFirstInteract?: () => void` fired on the first slider move; debounced with a ref to only fire once.
- Hints button styling and count
  - Files: `GameLayout1.tsx` (desktop action row and mobile bottom navbar)
  - Style: white button with black text; inline black pill displays `{used}/14` hints.
  - Example: `<span class="... bg-black text-white ...">{purchasedHints.length}/14</span>`.
- Submit prompt behavior
  - File: `GameLayout1.tsx`
  - The "Select a location first" message only appears after the user clicks Submit with no guess (`showSelectLocationPrompt`).
  - Removed previous always-visible prompts on desktop and inside `LocationSelector`.
- Mobile Home relocation and duplicate submit removal
  - File: `src/components/game/LocationSelector.tsx`
  - Removed the mobile fixed bottom bar containing Home + a duplicate Submit button.
  - File: `GameLayout1.tsx`
  - Added a mobile-only Home button under the Where card. The global mobile bottom navbar retains Hints + Submit (with icon).
- Compact desktop cards
  - File: `GameLayout1.tsx`
  - Removed `lg:min-h-[520px]` from When and Where cards to reduce blank space on desktop.
- `src/hooks/useHintV2.ts` — Source of truth for hint loading, costs/penalties, and purchase persistence.
- `src/constants/hints.ts` — Centralized constants for `HINT_COSTS`, `HINT_TYPE_NAMES`, and `HINT_DEPENDENCIES`.
- `src/components/layouts/GameLayout1.tsx` and `src/components/layouts/GameLayout2.tsx` — Open/close and render the modal.
- `src/components/game/HintButton.tsx` — Triggers opening the modal in context.
- `src/components/results/HintDebtsCard.tsx` — Displays hint debts in results.

Legacy/duplicate files slated for removal (do not edit):

- `src/components/HintModalV2.tsx` — superseded by `HintModalV2New`.
- `src/components/components/` tree — old `HintModal` and duplicate layouts.
- `src/utils/hintUtils.ts` — not used.

UI specifics applied in `HintModalV2New`:

- Lock icon imported from `src/assets/icons/lock.webp`.
- Red warning under title: “Using a hint will reduce your score.”
- Penalty values (badges and buttons) shown in red.
- Continue button: white text on orange background.

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

## Game Page: Exit Fullscreen Attention Animation

- File: `src/components/layouts/GameLayout1.tsx`
- Behavior: when exiting the fullscreen image (`FullscreenZoomableImage` calls `onExit`), `handleExitImageFullscreen()` briefly pulses the label texts "When?" and "Where?" for 1 second to draw attention back to inputs.
- Implementation:
  - State: `const [highlightInputs, setHighlightInputs] = useState(false)`.
  - On exit: `setHighlightInputs(true); setTimeout(() => setHighlightInputs(false), 1000)`.
  - Visuals: conditional class applied only to the header labels via `cn(highlightInputs && "animate-pulse")`. The cards themselves are not ring-highlighted.
  - No persistent state; the pulse self-clears after 1s.

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
  - Carousel is implemented with horizontal scroll-snap on mobile and stacked layout on desktop.

### Updates — Logo position, size, color; Carousel spacing and scrollbar (2025-08-14)

- Logo
  - File: `src/components/Logo.tsx`
  - Text size increased (approximately 2x): `text-2xl md:text-4xl`.
  - Color updated: `HISTORY` now uses `text-red-500` (was `text-orange-500`).
  - File: `src/pages/HomePage.tsx` — Positioned the logo at 20% from top using `style={{ top: '20vh' }}` on the absolute container.

- Carousel spacing and scrollbar
  - File: `src/pages/HomePage.tsx`
    - Increased inter-card spacing: mobile `gap-[3rem]`, desktop `md:gap-[4rem]`.
    - Container classes updated to: `overflow-x-auto snap-x snap-mandatory carousel-center-padding no-scrollbar` (desktop keeps `md:overflow-visible md:snap-none`).
  - File: `src/index.css`
    - New utilities under `@layer utilities`:
      - `.no-scrollbar` hides scrollbars cross-browser.
      - `.carousel-center-padding` adds left/right padding of `calc(50vw - 6.75rem)` so the first/last 13.5rem-wide cards center on screen; padding removed on `@media (min-width: 768px)`.
    - Rationale: Centers the first card on small screens and hides the horizontal scrollbar while preserving scroll and snap behavior.

Notes: UI changes are limited to the Home page and the shared `Logo` component per current design direction.

### Updates — Lobby header (Home + Avatar), Logo HISTORY +25%, Carousel touch swipe (2025-08-14)

- Lobby header buttons
  - File: `src/pages/Room.tsx`
  - Added a Home icon button that navigates to `/test`.
  - Added the avatar/menu dropdown by rendering `<NavMenu />` in the header actions.
  - Imports: `Home` from `lucide-react`, `NavMenu` from `src/components/NavMenu`.

- Logo emphasis (HISTORY +25%)
  - File: `src/components/Logo.tsx`
  - Increased only the `HISTORY` word by 25% using a relative size utility: `text-[1.25em]` on the `HISTORY` span, retaining base `text-2xl md:text-4xl` on the heading.

- Carousel touch swipe enablement
  - File: `src/pages/HomePage.tsx`
  - Ensured horizontal swiping works smoothly on touch devices by adding `touch-pan-x` and `overscroll-x-contain` to the scroll container, alongside existing `overflow-x-auto` and snap classes.
  - Container keeps: `snap-x snap-mandatory`, `carousel-center-padding`, and `no-scrollbar` for centered first card and hidden scrollbar.

## UI Styling Consistency: Orange Buttons & Font

- Orange action buttons now use a consistent border radius matching the Submit button.
  - Components updated: `src/pages/RoundResultsPage.tsx` (both "Next Round" buttons) and `src/components/layouts/FullscreenZoomableImage.tsx` ("GUESS" button) now use `rounded-xl` with `bg-orange-500 text-white`.
  - Hover/active states preserved (`hover:bg-orange-500` or `hover:bg-orange-600` as originally specified by component).

- Global font set to Montserrat for consistent typography.
  - `tailwind.config.ts` sets `theme.extend.fontFamily.sans` and `serif` to `Montserrat`.
  - Root `index.css` imports Montserrat from Google Fonts to ensure the font is available at runtime.
  - Note: `src/index.css` already enforced Montserrat via CSS; keeping Tailwind config aligned avoids class-level font drift.

## Results & Final Score UX Tweaks

- Round Results page updates
  - Files: `src/components/layouts/ResultsLayout2.tsx`, `src/pages/RoundResultsPage.tsx`
  - Dark card background standardized to `#333333` for all primary cards on Round Results.
  - Added slim progress bars under the badges:
    - Time accuracy bar in the When card (width = `result.timeAccuracy%`).
    - Location accuracy bar in the Where card (width = `result.locationAccuracy%`).
  - Repositioned controls in the image card header row:
    - Confidence value and Source button on the left.
    - Compact Rate button on the right via new `rateButton` prop in `ResultsLayout2`.
    - Removed the legacy circular Rate button from the bottom action row (`extraButtons` now null on RoundResultsPage).
  - Text styling: "Your guess" year uses the same size emphasis as the "Correct" year (`text-lg`, orange text) for consistency.

- Final Results footer and navbar tweaks
  - File: `src/pages/FinalResultsPage.tsx`
  - Bottom navbar background set to solid black (`bg-black`).
  - Home button height matches Play Again: both use `size="lg"` with `py-6 text-base`.
  - Top navbar simplified: logo removed; global Accuracy and XP badges on the left; `NavProfile` on the right.

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

- Replaced "WHEN" and "WHERE" mini-cards with two stacked progress bars.
  - Labels: "Time Accuracy" and "Location Accuracy".
  - Visuals: Orange fill (`bg-orange-500` or `#f97316`) on a subtle neutral track; rounded bars with concise labels to the left.
  - Implementation: simple nested `div`s styled with Tailwind for width, height, background, and rounded corners. Percentages computed via existing utilities and formatted with `formatInteger`.

- Added label "BREAKDOWN" below Game Summary and above per-round cards.
  - Element: `h2.text-lg.font-bold` with existing color scheme.
  - Alignment: Added left padding (`pl-4`) to align with Game Summary content padding.

- Removed "Details" text labels; chevron icon remains for toggling.
  - Locations: Game Summary toggle and each breakdown card (`RoundResultCard`).
  - Rationale: declutters UI while preserving affordance.

- Breakdown image titles use regular font weight (was bold) for better visual hierarchy.
  - File: `src/components/RoundResultCard.tsx`

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

### Recent UI Enhancements (Final score, Navbar, Map search)

- Final Results Page updates
  - File: `src/pages/FinalResultsPage.tsx`
  - Final score card uses `#333333` background; removed orange border.
  - Added detailed metrics inside the card:
    - Time Accuracy, Location Accuracy
    - Avg Years Off, Avg Km Away
    - Hints Used, Penalty Cost
  - Added "Share Results" button below the score card.
  - Removed the separate "GAME SUMMARY" accordion section; kept "BREAKDOWN" label.
  - Per-round wrappers updated to `bg-[#333333]`.
  - Bottom navbar simplified: labeled Home button on the left; "Play Again" remains primary; Share moved into the card.

- Top Navbar updates
  - File: `src/components/navigation/MainNavbar.tsx`
  - Removed logo; Accuracy and XP badges moved to the left side.
  - Cleaned duplicate hook variables.

- Global card background color
  - File: `src/index.css`
  - Dark theme `--card` variable set to `hsl(0 0% 20%)` (`#333333`) to standardize card backgrounds.

- Game Map search
  - File: `src/components/HomeMap.tsx`
  - Added Nominatim-powered search input above the map.
  - Selecting a result recenters the map, places the marker, and updates `onCoordinatesSelect` and `onLocationSelect`.
  - Introduced `MapRefSaver` helper (React Leaflet `useMap`) to capture the map instance safely.

- Inline Year editing on Game page
  - Files: `src/components/game/YearSelector.tsx` (component), used in `src/components/layouts/GameLayout1.tsx`.
  - YearSelector supports inline editing and is already integrated in the game layout.

### UI Polishing — When/Where Answers and Headers

- Remove duplicate Where header
  - Files: `src/components/HomeMap.tsx`, `src/components/game/LocationSelector.tsx`
  - Added `showHeader?: boolean` prop to `HomeMap` (default `true`). `LocationSelector` passes `showHeader={false}` so only the parent card (`GameLayout1`) renders the Where header.

- Align and style selected location in Where header
  - File: `src/components/layouts/GameLayout1.tsx`
  - Tracks `selectedLocationName` from `LocationSelector.onLocationSelect` and displays it right-aligned next to the "Where?" label as orange text without a background.

- Style answers as orange text (no background)
  - File: `src/components/layouts/ResultsLayout2.tsx`
  - Replaced badge backgrounds for the correct/guessed year and location with plain orange text (`text-orange-400`) per design.
  - Also styled the game page When header year display as orange text without background in `GameLayout1.tsx`.

## Notifications and Toasts — Disabled

- Purpose: Completely disable all toast/alert UI globally.
- Implementation:
  - Removed shadcn `<Toaster />` and Sonner `<Toaster />` mounts from `src/App.tsx`.
  - `src/components/ui/sonner.tsx` exports a no-op `Toaster` (returns `null`) and a no-op `toast` API (`success | error | info | warning | message | dismiss | promise`).
  - Components must import `toast` from `@/components/ui/sonner` (not from `sonner`). This preserves call sites but renders nothing.
  - The custom shadcn `use-toast` and related components remain, but without a mounted `<Toaster />` nothing is rendered.
- Audit/Enforcement:
  - Direct imports from `'sonner'` are disallowed. Use `@/components/ui/sonner` instead.
  - Known updates: `src/components/rating/ImageRatingModal.tsx`, `src/components/AccountSettings.tsx` now import from the local wrapper.
- Re-enable (if needed later):
  - Restore `<Toaster />` and/or Sonner provider in `src/App.tsx` and revert `src/components/ui/sonner.tsx` to its original wrapper implementation.

## Home Page Overlay — Dark Mode Opacity Fix

- Goal: Ensure the Home page overlay fully obscures background text and sits above any UI elements in dark mode.
- File: `src/pages/HomePage.tsx`
- Change:
  - Overlay container class updated from `z-10 ... dark:bg-black/75` to `z-[100] ... dark:bg-black` (fully opaque in dark mode and higher stacking context).
- Rationale:
  - Prevents any text or UI from being visible through the overlay in dark theme.
  - Increases `z-index` to ensure the overlay always layers above other positioned elements.
- Notes:
  - Light mode keeps `bg-white/75` for the intended translucent effect.
  - If additional global layers are added later (e.g., modals), ensure their `z-index` strategy does not undercut the overlay when it should be dominant.

## Immersive Cylindrical Image Viewer

- Component: `src/components/ImmersiveCylViewer.tsx`
- Purpose: Fullscreen immersive viewer that wraps a standard photo inside a cylinder segment (120–180°) for a spheric feel. Drag to pan with inertia, optional gyroscope control on mobile. Zoom/FOV is locked by admin config.
- Integration point: `src/components/layouts/GameLayout1.tsx`
  - Renders `<ImmersiveCylViewer />` modal with image URL and admin-configured props.
- Dependencies: `three` (lazy-loaded at runtime via dynamic import to keep initial bundle small).
- Props:
  - `imageUrl: string`
  - `lockFov?: number` (default 70)
  - `curvatureDeg?: number` (default 150; total yaw span)
  - `enableGyro?: boolean` (default true on mobile)
  - `caption?: string`
  - `onClose?: () => void`
- Behavior and implementation notes:
  - Creates a Three.js scene with `PerspectiveCamera(lockFov)`, a `CylinderGeometry` (backside), and texture-mapped material.
  - Drag with inertia: pointer events update yaw/pitch and velocity with decay; clamped to ±curvature/2 and ±30° pitch.
  - Gyroscope: optional; iOS permission flow via `DeviceMotionEvent.requestPermission()`; eased toward device orientation within ±15° tilt.
  - Accessibility: fullscreen modal `role=dialog`, `aria-modal`, Esc to close, arrow keys to nudge, Shift+Arrows for coarse, `R` to recenter. Zoom gestures are prevented (wheel/gesture events) inside the modal.
  - Cleanup: cancels RAF, disposes renderer/texture/geometry/material, removes all listeners on unmount.
- Admin configuration (env-driven feature flag and tuning):
  - `VITE_IMMERSIVE_ENABLED` (default `true`)
  - `VITE_IMMERSIVE_LOCKFOV` (default `70`)
  - `VITE_IMMERSIVE_CURVATURE_DEG` (default `150`)
  - `VITE_IMMERSIVE_ENABLE_GYRO` (default `true`)
  - Read in `GameLayout1.tsx` and passed to the component. If disabled, the button and modal are hidden.
