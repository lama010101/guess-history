---
description: Implement MultiplayerSessionProvider context for session lifecycle, synchronization, and persistence
---

# Goal
Add a non-UI React context `MultiplayerSessionProvider` that manages the multiplayer session lifecycle, socket synchronization with PartyKit lobby, minimal persistence to Supabase, and typed access for consumers. No UI changes.

# Prereqs
- Server message protocol in `server/lobby.ts` (join/roster/ready/start/settings/progress).
- Shared types in `src/lib/partyClient.ts` include `progress`.
- Supabase client at `integrations/supabase/client.ts`.
- Scoreboard RPC helpers at `integrations/supabase/scoreboards.ts`.
- Session tables: `session_players`, `session_progress` (see `supabase/migrations/20250819_create_multiplayer_core.sql`).

# Steps
1. Create provider and hook
   - File: `src/contexts/MultiplayerSessionProvider.tsx`
   - Export: `MultiplayerSessionProvider`, `useMultiplayerSession()`.
   - Props: `{ roomId: string; roomCode: string; children: React.ReactNode }`.
   - Internals: open PartyKit socket via `makePartyUrl('lobby', roomCode)`;
     read auth from `AuthContext` to send `{ type: 'join', name }`.

2. Define state shape
   - Maintain: `you` (id, name, host), `roster` (players w/ ready/host), `round` (number), `timer { enabled, durationSec, startedAt }`, `progressByUser` map, `connection { status, retries }`.
   - Expose actions: `setReady(ready: boolean)`, `sendChat(message)`, `sendProgress(roundNumber, substep?)`, `setTimer(host-only)`, `disconnect()`.

3. Wire message handlers
   - Handle server messages from `LobbyServerMessage`:
     - `hello` → set `you`.
     - `roster` → set roster.
     - `settings` → update timer settings.
     - `start` → set timer `{ startedAt, durationSec, enabled }` and possibly set `round = 1`.
     - `progress` → update `progressByUser[from]`.

4. Persistence to Supabase (non-blocking, best-effort)
   - On join/roster update: upsert row in `public.session_players(room_id, user_id, display_name, is_host, ready, last_seen)` using RLS (self-only insert/update).
   - On local progress/substep changes: upsert `public.session_progress(room_id, user_id, round_number, substep, round_started_at, duration_sec, timer_enabled)`.
   - Rate-limit writes (e.g., 500ms debounce) and catch+log errors.

5. Progress sending policy
   - Emit client `progress` on key substeps: `pre`, `thinking`, `guessing`, `hint`, `submitted`.
   - Avoid spamming; dedupe same payload back-to-back.

6. Timer consistency
   - Trust server `settings` and `start`. Host may send `settings`; provider should gate this by `you.host` before sending.
   - Derive remaining time from `startedAt + durationSec`.

7. Scoreboard helpers exposure (read-only)
   - Export functions from provider that proxy to `fetchRoundScoreboard` and `fetchFinalScoreboard` using the current `roomId`.

8. Reconnect and lifecycle
   - Auto-reconnect on close with backoff (e.g., 1s, 2s, 5s ... up to 30s).
   - On reconnect, re-send `join` and resync state from incoming `hello/roster/settings/start`.
   - Clean up socket and timers on unmount.

9. Types and errors
   - Use discriminated unions from `src/lib/partyClient.ts`.
   - Provide minimal `console.debug` logs behind a `DEBUG_MULTIPLAYER` env/flag.

10. Consumers (no UI changes in this workflow)
   - Consumers can call `useMultiplayerSession()` to read `roster`, `progressByUser`, timer status, and to invoke `setReady()` / `sendProgress()`.
   - Wiring into the component tree (e.g., in `App.tsx` or a room route) should be handled in a separate UI task.

# Acceptance criteria
- Provider compiles with strict TS, no UI changes.
- Connects to PartyKit, handles and exposes lobby messages.
- Persists participant/self updates to Supabase with RLS-safe calls.
- Exposes scoreboards via helpers.
- Resilient to disconnects, with sane backoff.

# Follow-ups (separate tasks)
- UI: show roster/progress chips (non-blocking for core).
- Persist server-side progress if needed (PartyKit → Supabase).
- E2E test for ready-up → start → round progress → final scoreboard fetch.
