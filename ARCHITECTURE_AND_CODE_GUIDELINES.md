### Global Metrics — Per-Mode Aggregates (2025-09-09)

- Purpose: Record users' global stats per mode in addition to the overall totals.
- Schema: `public.user_metrics` now has per-mode columns for modes `solo`, `level`, `compete`, and `collaborate`:
  - `xp_total_<mode>` numeric NOT NULL DEFAULT 0
  - `games_played_<mode>` integer NOT NULL DEFAULT 0
  - `overall_accuracy_<mode>` numeric NOT NULL DEFAULT 0 (0..100; enforced via CHECK constraints)
- Client update:
  - `src/utils/profile/profileService.ts` → `updateUserMetrics(userId, metrics, gameId, mode)` now accepts an optional `mode` parameter:
    - Mode detection is performed by `src/pages/FinalResultsPage.tsx` based on the current route prefix and passed to `updateUserMetrics`.
    - On first game for a user, the per-mode fields are initialized; otherwise they are updated with weighted averages and totals.
  - Overall totals (`xp_total`, `games_played`, `overall_accuracy`) continue to be updated as before.
- Migration: `supabase/migrations/20250909_add_user_metrics_per_mode.sql` adds the new columns and accuracy constraints.
- Display: The navbar continues to display overall XP/Accuracy; per-mode displays are reserved for future UI work.

### Navbar — Click to Home (2025-09-09)

- Component: `src/components/navigation/MainNavbar.tsx`
- Behavior:
  - Clicking the navbar background redirects to `/home`.
  - Interactive elements stop propagation to preserve their own actions:
    - XP badge navigates to `/leaderboard`.
    - Avatar button opens the menu.
  - The navbar listens for `window` events `avatarUpdated`, `usernameUpdated`, and `profileUpdated` to refresh avatar and level badge.

#### Navbar Menu — Profile/Username Sync (2025-09-15)

- Component: `src/components/NavProfile.tsx`
- Behavior:
  - Fetches `profiles` on mount and whenever the `user` changes.
  - Subscribes to global events `avatarUpdated`, `usernameUpdated`, and `profileUpdated` and re-fetches the profile immediately so the dropdown reflects new avatar/name without a page reload.
  - When `profiles.avatar_id` is set, also fetches the `avatars` row and prefers its fields for display:
    - Image prefers `avatars.firebase_url` over `profiles.avatar_image_url`/`avatar_url`.
    - Display name prefers avatar record name (`first_name`/`last_name` or `name`) over `profiles.avatar_name`/`display_name`/`username`/email.
  - Fallbacks: `profiles.avatar_image_url` → `profiles.avatar_url` for image; `profiles.avatar_name` → `profiles.display_name` → `profiles.username` → `user.user_metadata.full_name` → `user.email` for text.
  - No UI changes; behavior-only update.

### Preparation Overlay — Cancel Behavior (2025-09-13)

- Components/Files:
  - `src/components/game/PreparationOverlay.tsx`
  - `src/hooks/useGamePreparation.ts`
  - `src/contexts/GameContext.tsx`
- Behavior:
  - Pressing `Cancel` during preparation now:
    - Calls `abortPreparation()` to stop in-flight work.
    - Calls `resetPreparation()` to immediately reset the state to `idle` so the overlay hides without waiting.
    - Removes the `mode-levelup` body class as a safety measure.
    - Redirects to `/home` via `useNavigate(..., { replace: true })`.
  - `useGamePreparation` exposes a new `reset()` method to hard-reset local state.
  - `GameContext` re-exports this as `resetPreparation` for consumers.

### Settings — Distance Units & Map Label Language (2025-09-13)

- Store: `src/lib/useSettingsStore.ts`
  - Added fields `distanceUnit: 'km' | 'mi'` and `mapLabelLanguage: 'local' | 'en'` with setters `setDistanceUnit()` and `setMapLabelLanguage()`.
  - `setFromUserSettings` hydrates these from Supabase `settings.value.distance_unit` and `settings.value.language`.
  - `syncToSupabase(userId)` now persists `distance_unit` and `language` with existing settings.
- UI: `src/components/profile/SettingsTab.tsx`
  - Enabled a Distance Units radio group (Kilometers/Miles) bound to the store and saved via `updateUserSettings`.
  - Added a Map Labels radio group (Local/English only). `Local` means we do not send any `Accept-Language` hint to upstream geocoding so native script is preferred; `English only` forces `Accept-Language: en`.
- Hydration: `src/components/settings/GlobalSettingsModal.tsx` wires these fields so opening/saving settings updates the store immediately.
- Distance formatting helper: `src/utils/format.ts`
  - New helpers: `kmToMi(km)` and `formatDistanceFromKm(distanceKm, unit)` returning `{ value, unitLabel }` with integer rounding.
- Consumers (runtime):
  - `src/components/layouts/ResultsLayout2.tsx` — "Where" chip and peer popups use the unit preference.
  - `src/components/RoundResultCard.tsx` — per-round collapsed details use the unit preference.
  - `src/components/results/LocationAccuracyCard.tsx` — pill shows distance in preferred units.
  - `src/lib/geo/nominatim.ts` — search suggests in English only when `language === 'en'`; otherwise omits the header/query so local/native labels come back.
  - `src/components/HomeMap.tsx` — search and reverse geocoding honor the same `language` choice.

#### Update (2025-09-15): English-only Map in Color

- When `mapLabelLanguage === 'en'` (English-only), the base map now uses the color Carto Voyager tiles instead of a grayscale/light theme to improve place recognition.
  - Tile URL: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
  - Location: `src/components/HomeMap.tsx` `<TileLayer url={...} />`
  - Non-English (`local`) continues to use the standard OpenStreetMap tiles.


### Home — Level Up Card Level Badge & Start Level (2025-09-09)

- Component: `src/pages/HomePage.tsx`
- Behavior:
  - The Level Up card shows a small badge in the top-right corner of the image with the current level: `Lv {profile.level_up_best_level || 1}`.
  - Starting Level Up uses `startLevelUpGame(bestLevel)` where `bestLevel` is `profiles.level_up_best_level` (defaults to 1 for new users).
  - `profiles.level_up_best_level` is updated on passing a level in `src/pages/FinalResultsPage.tsx` and a `profileUpdated` event is dispatched for immediate UI refresh in the navbar and profile page.
  - Home listens for `profileUpdated` and refetches the profile to update the Level badge immediately (no manual reload required).
# Guess History Multiplayer Architecture

## Canonical Architecture Overview (2025-08-17)

- **PartyKit lobby server**: `server/lobby.ts`
  - Configured in `partykit.json` under `parties.lobby` with `vars.MAX_PLAYERS = "8"`.
- **Client WS helper and message shapes**: `src/lib/partyClient.ts`
  - `partyUrl(party, roomCode)` builds `ws(s)://<host>/parties/<party>/<roomCode>`.
    - Host resolution order:
      1) `VITE_PARTYKIT_HOST` when defined (e.g., `custom.example.com:443`)
      2) If the app is running on a private/local network host → `${hostname}:1999` (PartyKit dev)
      3) Otherwise → `<name>.partykit.dev` from `partykit.json` (production cloud)
  - Message shapes (source of truth):
    - Server→Client: `players`, `full`, `chat { from, message, timestamp }`, `roster { id, name, ready, host }[]`, `settings { timerSeconds?, timerEnabled? }`, `hello { you }`, `start { startedAt, durationSec, timerEnabled }`.
    - Client→Server: `join { name, userId?, token? }`, `chat { message, timestamp }`, `ready { ready }`, `settings { timerSeconds?, timerEnabled? }`, `rename { name }`.

### Lobby Message Shapes and Display Name Enrichment

- **Lobby Message Shapes**:
  - `join`: Sent by the client when a user joins the lobby. Contains `name` and optional `userId` and `token` fields.
  - `rename`: Sent by the client when a user renames themselves. Contains `name` field.
  - Server does not emit a dedicated `rename` event; display name changes are reflected in subsequent `roster` (and initial `hello`) messages.
- **Display Name Enrichment**:
  - The server enriches user display names with their `userId` and `name` from the `join` message.
    - The server updates user display names in real-time when a `rename` message is received and includes updated names in the next `roster` broadcast.

    ### Invited-User Decline Flow (Room Invites)

    - Storage: `public.room_invites` with RLS.
      - See `supabase/migrations/20250823_create_room_invites.sql` and `supabase/migrations/20250823_enable_realtime_room_invites.sql`.
    - Helper APIs: `integrations/supabase/invites.ts`
      - `fetchIncomingInvites(friendId)`
      - `declineInvite(inviteId)`
      - `declineInviteForRoom(roomId, userId)`
    - Client behavior (no UI changes): After a successful join is confirmed by `hello { you }`, `src/pages/Room.tsx` calls `declineInviteForRoom(roomCode, user.id)` once per mount (guarded by `clearedInvitesRef`) to silently clear any pending invites for that room/user.
    - Realtime: When invites are deleted, any listeners on `public.room_invites` receive delete events (REPLICA IDENTITY FULL).

     ### Invitation UI (Bell & Sheet)
 
     - Component: `src/components/navigation/InvitesBell.tsx`
       - Sheet: `SheetContent` side "right" with class `bg-zinc-950/85 text-white border-l border-zinc-800` (0.85 opacity background).
       - Badge shows `pendingCount` over the bell.
     - Accept: green button `bg-emerald-500 hover:bg-emerald-500/90 text-black` navigates to `/room/<roomId>`, then best-effort deletes the invite.
     - Decline: red button `bg-red-500 hover:bg-red-500/90 text-white`; handler awaits `declineInvite(inv.id)` then `fetchInvites()` to refresh the list immediately.
     - Data source: `useRoomInvites` provides `invites`, `pendingCount`, `declineInvite`, `fetchInvites`. Helper APIs are also available in `integrations/supabase/invites.ts`.
      - Mobile width: panel uses `w-[85vw] sm:w-[420px]` for improved mobile usability.
      - Invitation card style: background color is `#444` for consistent dark theme.
      - Decline UX feedback: shows toast on success ("Invite declined") and failure (destructive variant) on decline action.
      - Realtime invite notification: on `room_invites` INSERT (filtered by `friend_id`), the client fetches the inviter's `profiles.display_name` and shows a toast in the format: `[host] invites you to room <ROOM_ID>`. Source: `src/hooks/useRoomInvites.ts`.

     #### Global Invite Listener (Headless)
     - Component: `src/components/InviteListener.tsx`
       - Purpose: Mounts `useRoomInvites()` without any UI to ensure the realtime subscription is always active for authenticated users.
       - Mounted: In `src/App.tsx` near other headless components (logger, overlays), as `<InviteListener />`.
       - Source: `src/App.tsx` imports `InviteListener` from `"./src/components/InviteListener"` and renders it above `<Routes>` so the hook is active on all pages.
       - Rationale: Guarantees invited users get instant notifications even if the bell UI is not currently rendered.
       - Realtime auth token sync: `src/contexts/AuthContext.tsx` now calls `supabase.realtime.setAuth(session.access_token)` on auth state changes and on initial session load so Realtime channels are authorized under RLS. Without this, invite INSERT events may not be delivered to the invitee.
       - Diagnostics: `src/hooks/useRoomInvites.ts` logs channel subscription status via `channel.subscribe((status) => ...)` including `SUBSCRIBED`/`CHANNEL_ERROR`, and logs each received INSERT payload. On `SUBSCRIBED`, it opportunistically refetches invites to reconcile any missed rows.

     #### Host Realtime Invite Sync (Room page)
     - Location: `src/pages/Room.tsx`
     - Behavior:
       - Subscribes to `public.room_invites` filtered by `inviter_user_id = <currentUserId>` and current `room_id` (via a client channel `room_invites:host:<userId>`).
       - On INSERT: adds the invite to local state with a placeholder display name, then fetches the invitee’s `profiles.display_name` and updates the entry.
       - On DELETE: removes the invite from local state by id.
     - Types: Uses `Tables<'room_invites'>` from `integrations/supabase/types.ts` to type the realtime payload for reliability.
    - Notes: No UI changes; this keeps the host’s invites list in sync in realtime.

    #### Lobby Chat (Room page)

    - Location: `src/pages/Room.tsx`
    - UI:
      - Left column panel titled "Chat" under Room Information.
      - Scrollable list (fixed height) with sender name and timestamp per message; message text wraps.
      - Input box with Enter-to-send and an explicit Send button. Disabled until the WS `status === 'open'`.
      - Auto-scrolls to the latest message on updates.
    - Client state & handlers:
      - `chat: ChatItem[]` where `ChatItem = { id, from, message, timestamp }`.
      - `input: string` bound to the chat input.
      - `sendChat()` builds `{ type: 'chat', message, timestamp }` and `ws.send(JSON.stringify(payload))`.
      - Incoming server messages of type `chat` append to `chat`.
    - Message shapes (source of truth in `src/lib/partyClient.ts`):
      - Client→Server: `chat { message, timestamp }`
      - Server→Client: `chat { from, message, timestamp }`
    - Persistence: The PartyKit lobby best-effort persists messages to `public.room_chat` via service role; delivery to clients is realtime broadcast.

   - **Environment**: `.env.example` defines `VITE_PARTYKIT_HOST` (default `localhost:1999`).
 - **Routing (frontend)**: `App.tsx`
  - `/` → redirects to `/home`
  - `/home` → `HomePage` (hub). All post-authentication redirects land here. The hub shows the four play cards (Solo, Level Up, Collaborate, Compete) and launches mode-specific routes.
  - `/room/:roomCode` → `src/pages/Room.tsx` (primary multiplayer lobby route used by invite acceptance)
  - Mode-prefixed game routes (Solo, Level Up, and Compete). Note: `/solo` is reserved exclusively for Solo gameplay; the hub is at `/home`:
    - Solo:
      - `/solo/game/room/:roomId/round/:roundNumber`
      - `/solo/game/room/:roomId/round/:roundNumber/results`
      - `/solo/game/room/:roomId/final`
    - Level Up (new primary pattern with explicit level segment):
      - `/level/:level/game/room/:roomId/round/:roundNumber`
      - `/level/:level/game/room/:roomId/round/:roundNumber/results`
      - `/level/:level/game/room/:roomId/final`
      - Legacy (supported for backward compatibility):
        - `/level/game/room/:roomId/round/:roundNumber`
        - `/level/game/room/:roomId/round/:roundNumber/results`
        - `/level/game/room/:roomId/final`
    - Compete (variants):
      - Sync:
        - `/compete/sync/game/room/:roomId/round/:roundNumber`
        - `/compete/sync/game/room/:roomId/round/:roundNumber/results`
        - `/compete/sync/game/room/:roomId/final`
      - Async:
        - `/compete/async/game/room/:roomId/round/:roundNumber`
        - `/compete/async/game/room/:roomId/round/:roundNumber/results`
        - `/compete/async/game/room/:roomId/final`
  - Mode-preserving navigation rule (2025-08-28):
    - During gameplay (submit, timeout, next round, results), always derive the base mode path from the current URL by slicing everything before `'/game/'` and build navigation paths using that prefix.
    - Example: if current path starts with `/level/...`, navigate to `${modeBasePath}/game/room/${roomId}/round/${n}` and `${modeBasePath}/game/room/${roomId}/final`.
    - Solo now follows the same pattern and uses its own `/solo/game/room/:roomId/final` route.
  - Legacy cleanup: All legacy `/test` routes have been removed. Post-auth redirects go to `/home` (hub). Gameplay uses canonical mode routes (`/solo`, `/level`, `/compete/(sync|async)`). OTP email links redirect to `/home` by default (configurable via `VITE_AUTH_EMAIL_REDIRECT_TO`). Legacy components removed: `src/pages/LandingPage.tsx`, `src/components/layouts/HomeLayout1.tsx`.
  - Providers: `App.tsx` wraps the entire `<Routes>` tree inside `GameProvider` (under `BrowserRouter`). This ensures `useGame()` is available to `HomePage` and all game pages for `startGame`/`startLevelUpGame` and navigation.
  - Admin guard: The `/admin` route is nested under `RequireAuthSession` so only users with an active Supabase session (registered or guest) can access `AdminGameConfigPage`. Signed-out users are redirected to `/`.
- **WebSocket endpoint**: `ws(s)://<resolved-host>/parties/lobby/:roomCode` (via `partyUrl('lobby', roomCode)`).

### Development Logging Policy (2025-08-27)

- Implemented dev-only logging guards using `import.meta.env.DEV`.
- Files adopting this policy:
  - `src/contexts/GameContext.tsx`
  - `src/pages/HomePage.tsx`
- Pattern: use small helpers (e.g., `devLog`, `devDebug`) or guard blocks with `isDev` for verbose logs. Keep `console.error` unguarded for visibility.
- Guidance: Avoid unguarded `console.log`/`console.debug` in production paths. Prefer the helpers or `isDev` checks for new debug output.

### Legacy Routes and Ports Cleanup (2025-08-27)

- Removed all legacy `/test/*` routes and references (e.g., `/test`, `/test/friends`). Use canonical routes instead.
- Removed hardcoded port references such as `8092`.
- Port/host policy:
  - PartyKit dev runs on `localhost:1999` (see `package.json` `partykit:dev` and `.env.example` `VITE_PARTYKIT_HOST`).
  - Always resolve the PartyKit host via `VITE_PARTYKIT_HOST` and `partyUrl(...)`. Do not hardcode ports in code or docs.

### PWA Manifest & Service Worker Policy (2025-08-27)

- __Manifest__ (`public/manifest.webmanifest`)
  - Icons must reference existing assets under `public/icons/`.
  - Current icons: `/icons/logo.webp` with sizes `192x192` and `512x512` for both `any` and `maskable` purposes.
  - Do not reference absolute URLs or hardcoded hosts/ports in manifest assets.

- __Service Worker__ (`public/sw.js`)
  - Minimal app-shell caching of `'/'`, `'/index.html'`, and `'/manifest.webmanifest'`.
  - Use versioned `CACHE_NAME` (e.g., `gh-static-v2`). Bump when changing cached files to force client update.
  - Avoid precaching absolute URLs to prevent cross-origin/port pinning issues.

#### UI Gradient Standard (2025-09-06)

- Purpose: unify primary CTA/button visuals with the Hints button gradient.
- Canonical Tailwind class (inline arbitrary value):
  - Buttons: `bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] text-black hover:opacity-90`
  - Text gradient (for words like HISTORY): `text-transparent bg-clip-text bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)]`
- Applied in:
  - `src/components/layouts/GameLayout1.tsx` — Hints button (source gradient reference)
  - `src/components/pwa/InstallPrompt.tsx` — Install button
  - `src/components/landing/RedesignedHeroSection.tsx` — "Start Playing" CTA
  - `src/components/landing/StickyCTAButton.tsx` — floating/sticky CTA
  - `src/components/landing/RedesignedNavbar.tsx` — gradient text for "HISTORY"
- Guidance:
  - Reuse the exact gradient string for visual consistency.
  - Prefer text color `text-black` over white for legibility on this light gradient.

#### PWA Install Prompt Asset Path (2025-09-06)

- The PWA install card logo should load from the manifest icon path for reliability.
  - `src/components/pwa/InstallPrompt.tsx` uses `src="/icons/logo.webp"` (previously `/images/logo.png`, which did not exist).
  - Manifest icons (source of truth): `public/manifest.webmanifest` → `/icons/logo.webp` (192 and 512, any + maskable).

### Mode-based Theming (Solo, Compete, Collaborate, Level Up)

- **Goal**: Solo keeps original orange accents. Compete shows purple. Collaborate shows turquoise. Level up shows pink.
- **Body classes**: `App.tsx` `ModeClassWatcher` toggles on `<body>` based on route:
  - `mode-solo` when path includes `/solo/`
  - `mode-compete` when path includes `/compete/`
  - `mode-collaborate` when path includes `/collaborate/` or `/collab/`
  - `mode-levelup` when path includes `/level/`
- **CSS variables** (`src/index.css`):
  - Default (Solo): `--secondary` = orange (25 95% 53%).
  - Compete: `body.mode-compete { --secondary: 270 85% 60%; }` (purple)
  - Collaborate: `body.mode-collaborate { --secondary: 189 90% 45%; }` (turquoise)
  - Level Up: `body.mode-levelup { --secondary: 325 90% 60%; }` (pink)
- **Tailwind orange remapping (scoped)**: Under `@layer utilities` we map Tailwind `*-orange-*` utilities to `hsl(var(--secondary))` within `.mode-compete`, `.mode-collaborate`, and `.mode-levelup`:
  - Background/text/border/ring (+ hover/focus/active), SVG fill/stroke, outline.
  - Gradients: `from/via/to-orange-*`.
  - Placeholder, caret, accent, divide, shadow, ARIA-selected.
- **Component guidance**:
  - Prefer tokens: `text-secondary`, `bg-secondary`, `text-history-secondary` to auto-inherit mode color.
  - Avoid hardcoded hex/orange. Use `hsl(var(--secondary))` in custom CSS.
- **Testing**:
  - Solo: `/solo/...` → orange.
  - Compete: `/compete/...` → purple.
  - Collaborate: `/collaborate/...` → turquoise.
  - Verify buttons, sliders, rings, gradients, SVGs.

### Compete Mode — SYNC/ASYNC Variants and Leaderboards (2025-09-13)

- __Top Navbar on /compete__
  - Routing: `/compete` is now nested under `MainLayout` in `src/App.tsx`, so the standard top navbar (`StatsDisplay` left, `NavProfile` right) appears on the Compete landing page.
  - File change: `src/App.tsx` wraps the route as:
    - `<Route path="/compete" element={<MainLayout />}><Route index element={<Compete />} /></Route>`

- __Mobile layout: Join then Host__
  - Page: `src/pages/PlayWithFriends.tsx`.
  - Behavior: On mobile (md-), the page shows two stacked cards in this order: `Join Game` then `Host Game`. On md+ the cards render side-by-side.
  - Implementation: Removed the mobile tab toggle; both cards are always visible. No functional changes to the join/create handlers.

- __Variants: SYNC and ASYNC__
  - Lobby: `src/pages/Room.tsx` contains a UI toggle (`mode` state) to select between `'sync'` and `'async'`. The server emits a `start` event; the client starts the game with `startGame({ roomId, seed, timerSeconds, timerEnabled, competeVariant: mode })`.
  - Routing (already present):
    - SYNC: `/compete/sync/game/room/:roomId/...`
    - ASYNC: `/compete/async/game/room/:roomId/...`
  - Deterministic images: selection seeded by `uuidv5(roomCode:startedAt)` on server `start`; shared among all players (see `GameContext.startGame` and `utils/imageHistory.ts`).

- __Leaderboards in SYNC only__
  - Round leaderboard component: `src/components/scoreboard/RoundScoreboard.tsx`
    - Data source: Supabase RPC `public.get_round_scoreboard(p_room_id text, p_round_number int)`
    - Displays: player name, round `score`, `accuracy`, and `-XP` (penalty). Highlights current user.
    - Rendered from `src/pages/RoundResultsPage.tsx` only when the URL starts with `/compete/sync/` and `roomId` is present.
  - Final leaderboard component: `src/components/scoreboard/FinalScoreboard.tsx`
    - Data source: Supabase RPC `public.get_final_scoreboard(p_room_id text)`
    - Displays: `Net XP`, `Total XP`, `-XP`, and `Net Avg Accuracy` sorted by net XP.
    - Rendered from `src/pages/FinalResultsPage.tsx` under the final score card when on `/compete/sync/...` and `roomId` exists.
  - Schema & security: See migration `supabase/migrations/20250819_update_round_results_and_scoreboard_rpcs.sql` which:
    - Ensures `round_results` has the necessary columns and policies.
    - Adds both RPCs with SECURITY DEFINER; access is granted to `authenticated` and gated by `session_players` membership.

__QA checklist__
- /compete shows the top navbar.
- On mobile, Join card is above Host card; both visible without toggles.
- In a SYNC room, after each round, the round leaderboard renders on the Results page.
- On the Final Results page for SYNC rooms, the final leaderboard renders below the final score card.
- ASYNC rooms do not render leaderboards; existing behavior is unchanged.

### Level Up Mode — Routing, Start Logic, and Integration (2025-08-27, updated)

- __Routing__
  - Prefix: `/level/...` with the same game/results pages as Solo for now.
  - Paths:
    - `/level/game/room/:roomId/round/:roundNumber` → `src/pages/solo/SoloGameRoundPage.tsx`
    - `/level/game/room/:roomId/round/:roundNumber/results` → `src/pages/solo/SoloRoundResultsPage.tsx`
  - Source: `App.tsx` defines these routes at the top level (no `/test` prefix).

- __Entry points & auth gating__
  - Home page card: `src/pages/HomePage.tsx` routes Level Up clicks through the centralized `handleStartGame('levelup')`.
  - If `!user`, the click opens `AuthModal` and defers the action via `pendingMode = 'levelup'`.
  - Guests are blocked consistently by the `handleStartGame('levelup')` gating logic; the card no longer bypasses this check.

- __Start flow__
  - Function: `src/contexts/GameContext.tsx` → `startLevelUpGame(level, settings?)`.
  - Constraints: derives `{ levelYearRange: { start, end }, timerSec }` via `getLevelUpConstraints(level)` and applies them:
    - `setTimerEnabled(true)` and `handleSetRoundTimerSec(timerSec)` (syncs both context and settings store to avoid stale 60s default).
  - Image selection: calls `useGamePreparation.prepare({ userId, roomId?, count: ROUNDS_PER_GAME, seed?, minYear: levelYearRange.start, maxYear: levelYearRange.end })`.
  - Multiplayer gating: when `settings.roomId` is provided without `settings.seed`, preparation is gated (no error); when both are provided, deterministic images are selected and persisted server-side.
  - Membership persistence: on multiplayer starts, calls `ensureSessionMembership(roomId, userId)` and `repairMissingRoomId(roomId)` to satisfy RLS and backfill `round_results.room_id`.
  - Navigation: after preparation, navigates to `/level/${level}/game/room/${roomId}/round/1`.
    - The router accepts both the new pattern with `:level` and the legacy pattern without it; internal navigation uses the former so the level is preserved across reloads.

- __Theming__
  - `App.tsx` `ModeClassWatcher` toggles the `mode-levelup` body class for Level Up routes.
  - `src/index.css` sets Level Up `--secondary` to a pink hue and remaps `*-orange-*` utilities under `.mode-levelup`, giving Level Up a distinct pink-themed palette.

- __Persistence & peers__
  - Round results persist to `public.round_results` with 0-based `round_index` (UI uses 1-based routing). See “Round Indexing Consistency (0-based).”
  - Multiplayer peer visibility relies on `public.session_players` upsert. See “Multiplayer Membership Persistence (session_players).”
  - Room-scoped image order persistence (Solo & Level Up): when a Solo or Level Up game starts, the selected image IDs are upserted into `public.game_sessions` under the generated `room_id` with a deterministic `seed`. On refresh, `hydrateRoomImages(roomId)` reads these `image_ids` to restore the exact same order, ensuring round 1 image does not change on reload.

#### Level Up — Canonical Route Detection & "Play Again" Navigation (2025-08-28, updated)

- __Canonical detection__: Any path beginning with `/level/` is considered Level Up mode. Do not rely on query params or legacy `/test/levelup` routes.
  - Consumers: `hooks/useGameModeConfig.ts`, `App.tsx` route guards, and any Level Up–specific effects should key off the `/level/` prefix exclusively.
- __FinalResults → Play Again__: `src/pages/FinalResultsPage.tsx` preserves the current mode and restarts appropriately.
  - Level Up: detects `/level/` prefix and calls `startLevelUpGame(level)`, fetching `level` from `games.level` for the just-finished game when available, otherwise defaults to `1`.
  - Compete: detects `/compete/(sync|async)/...` and calls `startGame({ roomId, seed, competeVariant })` with a freshly generated `roomId` and `seed`, preserving the variant.
  - Solo: falls back to `startGame()`.
  - No direct `navigate(...)` or legacy route pushes remain in the results page; navigation after start is handled by the context.
- __Legacy routes__: All `/test/*` routes are removed. Do not re-introduce them for Level Up. Use only the canonical `/level/...` routes listed above.

### Level Up Mode — UI Components and Integration (2025-08-28)

- __Components (source of truth)__: `src/components/levelup/`
  - `LevelUpIntro.tsx` — Intro card explaining requirements with Start and Close actions.
  - `LevelRoundProgressCard.tsx` — Per-round progress display showing if the round met ≥ 70% net.
  - `LevelResultBanner.tsx` — Final pass/fail banner for the Level Up session.
  - `LevelRequirementCard.tsx` — Requirement summary cards showing current vs. target.

- __Integration points__:
  - `src/pages/GameRoundPage.tsx`
    - Detects Level Up via the `/level/` prefix and applies `body.mode-levelup` (safety in-page in addition to global watcher).
    - Binds Level Up slider bounds: parses `level` from the URL (`/level/:level/...`), computes constraints via `getLevelUpConstraints(level)`, and passes `{ minYear, maxYear }` to `GameLayout1`.
    - Renders `LevelUpIntro` via a React portal to `document.body` with `z-[11000]`, above `PreparationOverlay` (`z-[50]`) and fullscreen image containers. The overlay blocks interactions underneath (no leaks).
    - Computes live Level Up intro metrics: `currentOverallNetPct = average(roundResults[].accuracy)` and `bestRoundNetPct = max(roundResults[].accuracy)`, both clamped to `0..100`, and passes them to `LevelUpIntro` for progress display.
    - The intro overlay auto-shows at the start of each round on `/level/...` routes and gates the timer until Start is pressed. There is no embedded Level Up intro inside `PreparationOverlay` (to avoid duplicate UI); players can reopen the intro in-game via the HUD Level button.
  - `src/pages/RoundResultsPage.tsx`
    - Above the standard results layout, renders `LevelRoundProgressCard` on Level Up routes.
    - Computes net percent with `computeRoundNetPercent(timeAcc, locAcc, accDebtTotal)` using:
      - `calculateTimeAccuracy(guessYear, actualYear)`
      - `calculateLocationAccuracy(distanceKm)`
      - Per-round `accDebt` aggregated from `hintDebts` (room-first round_id strategy).
  - `src/pages/FinalResultsPage.tsx`
    - Renders `LevelResultBanner` and two `LevelRequirementCard`s above the final score when on `/level/` routes.
    - Pass criteria surfaced in UI:
      - Overall net accuracy ≥ 50% (average of per-round net percents)
      - Best time or location accuracy ≥ 70% after penalties (at least one round achieves this on either axis)
    - Existing pass logic and DB updates (games/profiles) remain in this page; UI is additive.

#### Final Results — Level Up UI updates (2025-09-02)

- **Banner copy** (`src/components/levelup/LevelResultBanner.tsx`):
  - When passed, headline shows: `You Passed! Level {n} Unlocked`, where `{n}` is the next level derived from the current route (e.g., `/level/3/...` → `Level 4`).
  - Visuals: banner colors turn green on pass and red on fail.
- **Requirement cards** (`src/components/levelup/LevelRequirementCard.tsx`):
  - Card background and icon color are green when the overall level is passed; red when failed. The two cards reflect the same overall pass/fail state per spec.
- **Footer actions** (`src/pages/FinalResultsPage.tsx`):
  - On pass (Level Up only): the primary button reads `Continue to Level {n}` and calls `startLevelUpGame(n)`.
  - Otherwise: retains `Play Again` behavior.
  - The `Home` button becomes icon-only (house icon) with the same border radius as the primary button for consistency across modes.
  - Auto-advance: In addition to the button, a guarded `useEffect` auto-starts the next level after a short delay when pass criteria are met. This calls `resetGame()` and `startLevelUpGame(currentLevel+1)`.
  - Resilient guard (2025-09-11): Both the auto-advance effect and the footer “Continue to Level {n}” button call a shared `startNextLevel()` helper which uses an in-flight ref guard (`isContinuingRef`). The guard prevents duplicate starts while a start is in progress and is always released in `finally` so a failed auto-advance does not leave the button unresponsive. Legacy `autoAdvanceStartedRef` was removed.

#### Level Up — Pass/Fail Evaluation and Persistence (2025-09-01, updated 2025-09-13)

- __Source__: `src/pages/FinalResultsPage.tsx`
- __Computation__
  - Per round: `timeAcc = calculateTimeAccuracy(guessYear, actualYear)`, `locAcc = calculateLocationAccuracy(distanceKm)`, `net = computeRoundNetPercent(timeAcc, locAcc, accDebt)` where `accDebt` aggregates from `public.round_hints` per round via `round_id` (room-first strategy using `makeRoundId(roomId, idx+1)`, else falls back to `gameId`).
  - Final net accuracy: `averagePercent(perRoundNetPercents)`.
  - Net XP: `finalXP - totalXpDebt`, where `totalXpDebt` is the sum of hint `xpDebt` across the game rounds.
- __Pass criteria__
  - Targets are computed per level via `getLevelUpConstraints(level)` (see `src/lib/levelUpConfig.ts`).
  - Overall net accuracy ≥ `requiredOverallAccuracy`.
  - Best time or location accuracy ≥ `requiredRoundAccuracy` after penalties.
  - Defaults at L1 remain 50% overall and 70% best-axis; these scale toward 100% by L100 as defined by tuneables.
- __Persistence on pass__ (non-guest users only)
  - Derives the current level from the URL via `currentLevelFromPath` on `src/pages/FinalResultsPage.tsx`.
  - Computes `newLevel = currentLevel + 1` and updates `profiles.level_up_best_level` if the new level exceeds the previous best.
  - Emits `window.dispatchEvent(new Event('profileUpdated'))` on success so `HomePage` (and navbar) refresh the Level badge immediately.
  - There is no dependency on `games.level` for progression anymore.
- __Notes__
  - UI components (`LevelResultBanner`, `LevelRequirementCard`) and the pass/fail logic both read the same dynamic thresholds. The `LevelRequirementCard` target labels display `> {requiredOverallAccuracy}%` and `> {requiredRoundAccuracy}%` for clarity. Logic runs once per game after submission guard (`submittedGameIdRef`).
  - Guests are skipped for persistence.

#### Level Up — Requirement Copy Clarification (2025-09-15)

- The intro card clarifies the second requirement wording: “In at least one round, Time Accuracy or Location Accuracy must reach {requiredRoundAccuracy}% or higher after penalties.”
  - Location: `src/components/levelup/LevelUpIntro.tsx` under the “Any round ≥ {requiredRoundAccuracy}% net” card.
  - Logic is unchanged; the evaluation already uses the best axis after penalties (`bestAxisNetAfterPenalties`).

#### Level Up — Update 2025-09-01 (Revised 2025-09-03): Gated Start + HUD reopen

- __Intro auto-show__: The Level Up intro modal auto-shows at the start of each round on `/level/...` routes.
- __Gated Start__: The round timer is gated behind the intro's Start button. Until Start is pressed, the server timer is not started and the UI timer remains paused.
- __HUD button__: `src/components/navigation/GameOverlayHUD.tsx` renders a top-right Level button when provided `levelLabel` and `onOpenLevelIntro` props. Label format: `Level {n}`. Players can close the intro without starting (timer remains paused) and reopen it via this HUD button to press Start later.
- __Prop wiring__:
  - `src/components/layouts/GameLayout1.tsx` accepts optional `levelLabel?` and `onOpenLevelIntro?` and forwards them to `GameOverlayHUD` unchanged.
  - `src/pages/GameRoundPage.tsx` supplies `levelLabel = \`Level ${level}\`` (only on `/level/...` routes) and `onOpenLevelIntro = () => setShowIntro(true)`.
- __Intro close__: `LevelUpIntro.tsx` now supports an optional `onClose` prop alongside `onStart`. Closing the intro does not navigate or mutate round results; it simply hides the overlay.
- __Overlay & stacking__: The intro is rendered via portal (`document.body`) in a container `fixed inset-0 z-[11000] bg-black/70 backdrop-blur-sm`. This sits above `PreparationOverlay` (`z-[50]`) and any fullscreen image layers and prevents interaction leaks.
- __Timer behavior__: The server-authoritative timer does not start until Start is clicked on the intro. Pre-hydration, `GameRoundPage` seeds `remainingTime` from `roundTimerSec` for correct initial display; once hydrated, server values are authoritative after Start. The local UI timer remains paused while the intro is visible or before Start.
- __Timer defaults__: `src/lib/levelUpConfig.ts` sets Level 1 `timerSec = 300` (5 minutes). Higher levels derive from the same helper and are applied via `startLevelUpGame()` which calls `handleSetRoundTimerSec(timerSec)`.

- __Theming__: `src/index.css` remaps Tailwind `*-orange-*` utilities to `hsl(var(--secondary))` inside `.mode-levelup`. Level Up sets `--secondary` to pink; components can keep `bg-orange-500` etc. and will appear pink in Level Up mode.

#### Level Up — Year Slider Bounds Binding (2025-08-31)

- __Source of constraints__: `src/lib/levelUpConfig.ts` → `getLevelUpConstraints(level)` returns `LevelConstraints` including `levelYearRange.start`/`end` and `timerSec`.
- __Propagation__:
  - `src/pages/GameRoundPage.tsx` computes constraints based on `level` parsed from `/level/:level/...` and passes `minYear = levelUpConstraints.levelYearRange.start` and `maxYear = levelUpConstraints.levelYearRange.end` to `GameLayout1`.
  - `src/components/layouts/GameLayout1.tsx` accepts optional `minYear?`/`maxYear?` props and derives effective bounds:
    - `effectiveMinYear = (gameMode === 'levelup' && minYear != null) ? minYear : dynamicMinYear`.
    - `effectiveMaxYear = (gameMode === 'levelup' && maxYear != null) ? maxYear : dynamicMaxYear`.
  - These effective bounds are used for:
    - Validating the year input field.
    - Clamping on blur/enter.
    - Passing into `YearSelector` as `minYear`/`maxYear`.
- __Defaults__: When not in Level Up mode, or when overrides are absent, `GameLayout1` falls back to dynamic bounds computed from prepared image years.
- __Logging__: When overrides apply and change the bounds, the layout logs `[LevelUp][Slider] Applying Level Up bounds override` with `{ from: { min, max }, to: { min, max } }`. Constraint computation in `GameRoundPage` logs `[LevelUp][Slider] constraints:compute` in development.
- __UI/validation__: No UI structure or validation logic was modified beyond using the effective bounds; modal overlays and z-index remain unchanged.

- __QA checklist__:
  - Preparation overlay and embedded Level Up intro display together during preparation before each round loads; no sessionStorage-based auto-start.
  - Intro overlay appears at the start of each Level Up round, pauses timer, and uses pink accents.
  - Round Results shows the per-round progress card with correct net percent (including hint penalties).
  - Final Results shows pass/fail banner and both requirement cards with accurate values.
  - Pink theming is consistent across the three pages.

#### Solo Mode — Global Year Slider Bounds (2025-09-07)

- __Goal__: For Solo gameplay, the year slider spans from the global oldest event year in the database to the current year, rather than being constrained by the round’s prepared image set.

- __Implementation__
  - Fetch and cache global minimum year
    - File: `src/pages/GameRoundPage.tsx`
    - On mount, a `useEffect` queries Supabase `images.year` for the oldest non-null row via ascending order + `limit(1)`. The result is stored in a session-scoped cache `__globalMinYearCache` and reflected into state `globalMinYear`.
    - Fallback when unavailable: `1850`.
  - Compute Solo slider bounds
    - File: `src/pages/GameRoundPage.tsx`
    - `currentYear = new Date().getFullYear()`.
    - For Solo routes: `minYearProp = globalMinYear` (once loaded); `maxYearProp = currentYear`. Until loaded, omit these props so the layout temporarily uses dynamic dataset bounds.
    - Pass these as `minYear`/`maxYear` to `GameLayout1`.
  - Apply year bounds in layout
    - File: `src/components/layouts/GameLayout1.tsx`
    - Effective bounds: `effectiveMinYear = typeof minYear === 'number' ? minYear : dynamicMinYear`, `effectiveMaxYear = typeof maxYear === 'number' ? maxYear : dynamicMaxYear`.
    - Used for input validation/clamping and forwarded to `YearSelector`.

- __Notes__
  - Level Up unaffected: Level Up continues to pass bounds from `getLevelUpConstraints(level)`; Solo global bounds do not change Level Up behavior.
  - Caching: `__globalMinYearCache` avoids repeated DB queries within a session.
  - Graceful loading: If the global minimum is pending/unavailable, `GameLayout1` uses dynamic bounds from prepared images; once loaded, subsequent rounds/pages get the Solo global range.
  - Year selection is nullable until first interaction; `GameLayout1` and `YearSelector` handle `selectedYear: number | null` consistently.

- __QA checklist__:
  - Solo routes show the slider spanning from the oldest database year to the current calendar year once loaded.
  - When the global min is pending/fails, slider uses dynamic dataset bounds and updates once the global bound is available.
  - Level Up routes continue to honor level-specific bounds.

### Game Modes and Timers (Hooks)

- Files:
  - `hooks/useGameModeConfig.ts` — Derives `GameMode` from path or explicit prop. Modes: `'solo' | 'compete_sync' | 'compete_async'`. Provides flags: `isCompete`, `isSync`, `isAsync`, `roundTimerRequired`, `nextTimerEnabled`.
  - `hooks/useRoundTimer.ts` — Generic countdown for round play (start/pause/reset, `onTimeout`, tick granularity). UI-agnostic.
  - `hooks/useNextRoundTimer.ts` — Post-results "Next round" countdown (sync mode). UI-agnostic.

- Integration plan (no visual changes by default):
  - `src/components/layouts/GameLayout1.tsx` already accepts `gameMode`, `remainingTime`, `setRemainingTime`, and `isTimerActive` props. Pages can supply these from `useGameModeConfig()` and `useRoundTimer()` without changing layout visuals.
  - `src/components/layouts/ResultsLayout2.tsx` supports `peers`. Pages may add an optional next-round auto-advance using `useNextRoundTimer()` when `nextTimerEnabled` is true (Compete Sync only). The timer is headless unless explicitly rendered by the page/layout.

- Behavioral guidance:
  - Compete Sync (`compete_sync`):
    - Round timer is required; rounds auto-timeout via `onTimeout` to submit/lock in as per existing page logic.
    - Results page may auto-continue after a short countdown using `useNextRoundTimer`.
  - Compete Async (`compete_async`):
    - Round timer optional; no next-timer on results.
  - Solo (`solo`):
    - Unchanged unless a page explicitly opts into timers.

#### Solo Mode — Timer bound to Home settings (2025-09-05)

- Source: `src/pages/HomePage.tsx`
- Behavior:
  - Reads and writes the global timer setting via `useSettingsStore()` (`timerSeconds`, `setTimerSeconds`). The Home Solo timer slider is bound to this store; no visual changes.
  - When starting Solo (`handleStartGame('classic')`), passes timer settings into `GameContext.startGame(settings)`:
    - `{ timerEnabled: isSoloTimerEnabled, timerSeconds: isSoloTimerEnabled ? timerSeconds : 0 }`.
  - `GameContext` applies `timerSeconds` to `roundTimerSec`; `GameRoundPage` uses the unified countdown to honor this duration and handle expiry/multi-tab sync.
- Notes: No UI changes were introduced. This ensures Solo uses the same Home > Timer setting consistently.

- Rationale: Shared, reusable hooks avoid duplication across Solo/Compete variants and keep layout components UI-focused. Pages own timer behavior based on mode flags.

#### Server-Authoritative Round Timer Integration (2025-08-28, updated 2025-09-01)

- **Hook**: `hooks/useServerCountdown.ts`
- **Timer record API**: `src/lib/timers.ts` (`startTimer`, `getTimer`)
- **Timer ID convention (canonical)**: Use `buildTimerId(gameId, roundIndex)` from `src/lib/timerId.ts`, which returns `gh:{gameId}:{roundIndex}`. `roundIndex` is 0-based and must be a non-negative integer. Avoid legacy room-based IDs.
- **Game page integration**: `src/pages/GameRoundPage.tsx`
  - Uses the canonical builder: `const timerId = buildTimerId(gameId, currentRoundIndex)`.
  - Replaces local elapsed-time hydration with `useServerCountdown`.
  - Passes `durationSec = roundTimerSec` and `autoStart = timerEnabled && roundStarted` (where `roundStarted` is set when the Level Up intro Start button is pressed).
  - Mirrors hook state into existing props without UI changes:
    - `remainingTime ← remainingSec`
    - `isTimerActive ← roundStarted && !expired`
  - Pre-hydration sync: before the server timer reports ready, set local `remainingTime = roundTimerSec` so the initial display reflects the level’s duration. Once hydrated (`ready === true`), do not override the server value, even if the Level Up intro overlay is visible.
  - On expiry, calls the existing `handleTimeComplete()` which routes to results and records a zero/partial score per prior behavior.
  - Level Up safety: on `/level/...` routes, enforce `timerEnabled = true` on mount to cover refresh/direct navigation into a game round.
  - **Unit test & script**
  - Test: `tests/unit/timerId.test.ts` validates happy/error paths of `buildTimerId()`.
  - Script: `npm run test:unit` executes the test via `tsx`.
  - **Image hydration**: `hydrateRoomImages(roomId)` is invoked on mount when `images.length === 0`; dev-only logs added to trace hydration and round image selection.

#### Round Re-entry Guard (2025-09-01)

- **File**: `src/pages/GameRoundPage.tsx`
- **Purpose**: Prevent users from re-entering a round’s guess UI after submitting.
- **Behavior**:
  - On mount, queries `public.round_results` for the current user and round.
  - Prefers multiplayer uniqueness `(room_id, user_id, round_index)`; falls back to legacy `(user_id, game_id, round_index)`.
  - When a row is found, redirects to `.../round/:roundNumber/results` and logs a concise dev message.
  - Degrades gracefully if schema columns are missing (guarded by try/catch and RLS-safe selects).
- **Related**: Session round redirects still apply — URL round is reconciled against `game_sessions.current_round_number` via `getCurrentRoundFromSession(roomId)` to prevent navigating to future rounds.
- **Notes**:
  - Queries are typed loosely (`(supabase as any)`) in this guard to avoid deep generic instantiation issues in chained calls.
  - All debug logs are gated behind `import.meta.env.DEV`.

#### Persisted Round Redirect — Forward-Only (2025-09-06)

- **File**: `src/pages/GameRoundPage.tsx`
- **Change**: The hydration effect that reconciles the URL round with the persisted round (`getCurrentRoundFromSession(roomId)`) now performs a forward-only redirect.
  - Previous behavior: Redirected whenever `persistedRound !== roundNumber`, which could race when navigating to the next round — if the backend still held the previous round, the page would bounce back to the prior round/results.
  - New behavior: Redirect only when `persistedRound > roundNumber`.
    - Rationale: This prevents bouncing back to the previous round if persistence lags slightly during a next-round navigation. It still allows recovery when a user reloads on an older URL while the session has progressed.
  - Code snippet (logic):
    - `if (persistedRound > roundNumber) navigate(.../round/persistedRound)`


#### Timer ID Policy (2025-08-28, updated 2025-09-01)

- **Canonical ID format**: `gh:{gameId}:{roundIndex}` (0-based `roundIndex`).
- **Usage**: Use `buildTimerId(gameId, roundIndex)` from `src/lib/timerId.ts` to generate IDs.
- **Avoid legacy IDs**: Do not use room-based IDs; prefer the canonical format for new code.

#### Round Timer UI Contract (2025-08-30)

- **GameOverlayHUD → TimerDisplay**
  - File: `src/components/navigation/GameOverlayHUD.tsx`
{{ ... }}
  - Passes `roundTimerSec` as the total round duration and enables `externalTimer` on `TimerDisplay` to prevent an internal countdown. Never pass remaining time as the duration.
- **TimerDisplay behavior**
  - File: `src/components/game/TimerDisplay.tsx`
  - Progress is computed as `remainingTime / roundTimerSec`. When `externalTimer` is true, the component does not decrement time itself; it only renders, plays last-10s beeps, and optional vibration based on settings.
- **Reset behavior**
  - File: `src/contexts/GameContext.tsx` → `resetGame()`
  - Fully resets gameplay and timer state to avoid stale Level Up timers/rooms:
    - Clears images, round results, error/loading.
    - `setRoomId(null)`
    - `setTimerEnabled(false)`
    - `setRoundTimerSec(0)`
    - Generates a new `gameId`.

### Round Results Types and Next-Round Timer

- __Type source of truth__
  - Layout/result view type lives at `src/utils/results/types.ts` as `RoundResult` (includes image/event fields, accuracies, XP, hint debts, badges, confidence).
  - Context/gameplay result type lives at `src/types.ts` as `RoundResult` (simpler per-round result from gameplay).
  - `src/pages/RoundResultsPage.tsx` maps the context `RoundResult` to the layout `RoundResult` and must import the layout type as:
    - `import { RoundResult as LayoutRoundResultType } from '@/utils/results/types'`.

- __Results page integration__
  - File: `src/pages/RoundResultsPage.tsx`.
  - Uses `useNextRoundTimer` to drive a post-results countdown when `timerEnabled` is true in `GameContext`.
  - Timer duration derives from `roundTimerSec` in `GameContext`.
  - Timer is started when results are ready and paused during navigation.
  - On expiry, the same handler as the “Next Round” button (`handleNext`) is invoked.
  - The “Next Round” button is disabled while the timer is active or when navigation is in progress; a `TimerDisplay` is rendered next to the button when enabled.

- __Related files__
  - `src/hooks/useNextRoundTimer.ts` — headless countdown hook (start/pause/reset, onExpire).
  - `src/components/game/TimerDisplay.tsx` — circular countdown UI used by results page (external timer mode).
  - `src/components/layouts/ResultsLayout2.tsx` — consumes the mapped `RoundResult` and optionally renders peer guesses.
  - `src/hooks/useRoundPeers.ts` — multiplayer peer results (room + 0-based round index).

### Full-Screen Loading Overlays (Game → Results transition)

- Locations:
  - `src/components/layouts/GameLayout1.tsx` — shows a full-viewport overlay with spinner and "Preparing results..." text while a guess submission is in flight. Controlled by a local `isSubmitting` flag in the layout/page; the submit button itself shows no spinner.
  - `src/pages/RoundResultsPage.tsx` — renders a full-viewport loading state with spinner and "Preparing results..." while results are being hydrated/calculated. When data is ready, the standard `ResultsLayout2` renders instantly.

- Behavior and guidelines:
  - Only show overlays during navigation/transition. Do not attach spinners to the submit button.
  - Keep overlays theme-consistent (dark background, `text-secondary` accents) and avoid UI jumps.
  - Timer integrity: round timers on the Game page are unaffected by the overlay; on Results, the next-round timer (via `useNextRoundTimer`) continues and disables "Next" appropriately.
  - Multiplayer: peer synchronization (`useRoundPeers`) and session membership upsert are unaffected; overlays are purely visual.
  - Error handling: prefer showing an inline error state if results fail to load instead of keeping the overlay indefinitely.

- How to modify:
  - Update overlay styling or copy in `GameLayout1.tsx` for submission-state visuals.
  - Adjust the results loading branch in `RoundResultsPage.tsx` if copy or iconography changes are desired.
  - Do not add per-button spinners; rely on the full-screen overlay to signal progress.

### UI Consistency Updates (2025-08-30)

- __Hints button label (GameLayout2)__
  - File: `src/components/layouts/GameLayout2.tsx`
  - Change: Renamed bottom-right image action from "Hints V2" to "Hints" for consistency with other layouts and copy.

- __Hint modal spacing (HintModalV2New)__
  - File: `src/components/HintModalV2New.tsx`
  - Tweaks for more balanced visual rhythm:
    - Header subtitle margins: `mt-1 mb-2` (was `mt-0 mb-1`).
    - Content padding top: `pt-2` (was `pt-0`).
    - Summary pills container top margin: `mt-2` (was `mt-0`).
    - Segmented control top margin: `mt-4` (was `mt-3`).
    - Hint list top margin: `mt-4` (was `mt-3`).
  - No behavioral changes; only spacing.

#### Settings Modal — Leave Game Confirmation Visibility (2025-09-04)

- __Problem__: The Leave/Exit Game confirmation dialog could appear behind the settings modal due to overlay stacking, making the confirm button effectively inaccessible.
- __Fix__: Close the settings modal before triggering the navigation confirmation.
  - Location: `src/components/settings/GlobalSettingsModal.tsx` bottom sticky action bar.
  - Behavior: The "Exit Game" button handler calls `onClose()` first, then defers invoking `onNavigateHome()` to the next tick (`setTimeout(..., 0)`) so the confirmation dialog opens on top.
  - Rationale: Ensures clear visual stacking and prevents focus/interaction traps across modals.

### UI Consistency Updates — Level Up Modal + Fullscreen Buttons (2025-09-02)

- __Level Up Intro alignment__
  - File: `src/components/levelup/LevelUpIntro.tsx`
  - Title and subtitle are center-aligned. Header container uses `justify-center` and text uses `text-center`.

- __When? card label cleanup__
  - File: `src/components/layouts/GameLayout1.tsx`
  - Removed the extra level range label under the year selector to reduce clutter.

- __Fullscreen buttons theming__
  - Files:
    - ...

### Modal Styling Conventions (2025-09-03)

- __Overlay layering__
  - File: `src/components/ui/dialog.tsx`
  - Change: `DialogOverlay` uses `z-40`. Navbar (`src/components/navigation/MainNavbar.tsx`) uses `z-50` to remain above the blurry background. `DialogContent` remains above overlay.

- __Settings modal__
  - File: `src/components/settings/GlobalSettingsModal.tsx`
  - Backgrounds: use `bg-black/85` with subtle blur for both main content and sticky footer.
  - Close button: primary color background `bg-primary hover:bg-primary/90` with `text-primary-foreground`.

- __Hints modal__
  - File: `src/components/HintModalV2New.tsx`
  - Height: full viewport `h-[100vh]` to occupy the entire screen.
  - Background: `bg-black/85` for consistent dark modal visuals.
  - Close button: primary color background `bg-primary hover:bg-primary/90` with `text-primary-foreground`.
  - Header relocation: Title ("HINTS"), info text, and the close button are not in the modal header anymore. They now render inside the Accuracy section's container at the top of the modal body to improve layout and usability.

- __Guidance for new modals__
  - Prefer `bg-black/85` for modal surfaces on dark theme for readability and consistency.
  - Use primary-colored close buttons to keep affordances consistent across modals.
  - Maintain navbar visibility above overlays by keeping overlay z-index at `z-40` and content above.
    - `src/components/navigation/GameOverlayHUD.tsx` (enter fullscreen)
    - `src/components/layouts/FullscreenZoomableImage.tsx` (exit fullscreen)
  - Buttons use pink backgrounds in Level Up context to match theming:
    - HUD button: `bg-pink-500/80 hover:bg-pink-600/90` with white icon.
    - Fullscreen exit: same pink palette; pulse ring color updated to pink (`rgba(236,72,153,0.35)`).
  - Rationale: Improves visual consistency with Level Up’s `--secondary` pink.

### UI Consistency Updates — Embedded Level Up Intro + Modal Backgrounds (2025-09-01)

- __Embedded Level Up Intro__
  - File: `src/components/game/PreparationOverlay.tsx`
  - On `/level/...` routes, `PreparationOverlay` now embeds `LevelUpIntro` with `embedded` mode and constraints from `getLevelUpConstraints(level)`.
  - `LevelUpIntro` in embedded mode renders without its standalone panel and uses unified translucent cards to match the overlay panel.

  - __Embedded Start actions (non-starting)__
    - `LevelUpIntro.tsx` now supports `showActionsInEmbedded` to optionally render footer actions (Start/Close) even when `embedded`.
    - `PreparationOverlay.tsx` passes `showActionsInEmbedded` and `isLoading={isActive}` so the Start button is visible during preparation but disabled while loading. The `onStart` handler is intentionally a no-op here.
    - Actual round start remains gated by the modal intro in `src/pages/GameRoundPage.tsx`, which sets `roundStarted` and begins the server timer. The embedded actions are for preview/consistency only and do not start gameplay from the preparation step.

- __Section titles added__
  - File: `src/components/levelup/LevelUpIntro.tsx`
  - Added `Requirements` and `Parameters` headings above the respective cards to match the UX spec/screenshot.

- __Unified modal backgrounds__
  - File: `src/components/game/ConfirmNavigationDialog.tsx`
  - `DialogContent` now uses the same translucent panel: `rounded-xl border border-white/10 bg-white/90 dark:bg-zinc-900/90` and adds small gap between footer buttons for consistency.

- __Notes__
  - Cancel in `PreparationOverlay` continues to route to `/home`.
  - Segmented progress bars in `PreparationOverlay` use `bg-history-primary` for filled segments (brand primary color).

### Config-Driven Hints (Costs & Accuracy Penalties) (2025-08-31)

- __Source of truth__
  - Live config: `src/config/gameConfig.ts` via `useGameConfig()`; hint overrides under `config.hints[hintKey] = { xp, acc }`.
  - Fallbacks: `src/constants/hints.ts` provides default costs/penalties when a key is missing in the live config.

- __Runtime application__
  - `src/hooks/useHintV2.ts` resolves XP cost and accuracy debt per hint from `config.hints` when present, else from defaults. The resolved values drive purchase validation, persisted debts, and round scoring.

- __UI display__
  - `src/components/HintModalV2New.tsx` shows costs/penalties from the live config. No UI structural changes; only value sourcing changed.

- __Typing__
  - Hints are accessed via a simple record on `GameConfig`. Keep Typescript types aligned with `gameConfig.ts`; defaults remain typed in `constants/hints.ts`.

  - __Testing__
  - After updating game config, reopen the Hint modal or start a new round to see updated values. Verify Round Results reflect correct hint debts.

### Round Hints Table — Canonical Columns (2025-08-31)

- __Table__: `public.round_hints`
- __Use these columns__:
  - `xpDebt` (int) — XP debt applied for the purchased hint
  - `accDebt` (int) — accuracy penalty percent applied for the purchased hint
  - `label` (text) — human-readable label for the hint
  - `hint_type` (text) — category/type key for the hint
  - Also used in queries: `hint_id`, `purchased_at`, `round_id`, `user_id`
- __Deprecated__: `cost_xp`, `cost_accuracy` — do not reference these in new code.
- __Types__: Generated Supabase types may not include `round_hints` yet. Query by string table name and use a narrow select. It’s acceptable to cast the result to a local type or use `@ts-expect-error` on the `.from('round_hints')` call until types are regenerated.
- __Query patterns__:
  - Per-round debts (see `src/pages/RoundResultsPage.tsx`):
    - `select('hint_id, xpDebt, accDebt, label, hint_type, purchased_at, round_id')`
    - `eq('user_id', user.id)` and `eq('round_id', makeRoundId(roomId, roundNumber))`
  - Game-final aggregation (see `src/pages/FinalResultsPage.tsx`):
    - `select('round_id, xpDebt, accDebt')` filtered by `user_id` and a list of `round_id`s; sum per round.
- __Scoring__: Round score subtracts total `xpDebt`; net percent calculations subtract total `accDebt`. Defaults come from `config.hints` with fallbacks in `constants/hints.ts`.

#### Perfect! Labels and Final Results Badge Popup (2025-08-30)

- __Perfect! labels__
- `src/components/layouts/ResultsLayout2.tsx`: “Where” card shows green “Perfect!” when `distanceKm === 0` (already showed for time when `yearDifference === 0`).
- `src/components/RoundResultCard.tsx`: In the details section, “WHEN” shows “Perfect!” when `Math.abs(guessYear - image.year) === 0`; “WHERE” shows “Perfect!” when `result.distanceKm === 0`. Keeps “No guess” text when appropriate.
- __Final Results badge popup__
- `src/pages/FinalResultsPage.tsx` awards game-level achievements on load via `awardGameAchievements({ userId, contextId, actualYears, results })` with `contextId = roomId || gameId`.
- Then evaluates and awards badges with `checkAndAwardBadges(userId, userMetrics)` and displays the first earned badge using `BadgeEarnedPopup`.
- Guarded by `awardsSubmittedRef` to dedupe per session. Badge queue handled via `earnedBadges[]` + `activeBadge`.
- User metrics for evaluation include: `games_played`, `perfect_rounds`, `perfect_games`, `time_accuracy`, `location_accuracy`, `overall_accuracy`, `xp_total`, `year_bullseye`, `location_bullseye` (see `src/utils/badges/types.ts`).
  - Guarded by `awardsSubmittedRef` to dedupe per session. Badge queue handled via `earnedBadges[]` + `activeBadge`.
  - User metrics for evaluation include: `games_played`, `perfect_rounds`, `perfect_games`, `time_accuracy`, `location_accuracy`, `overall_accuracy`, `xp_total`, `year_bullseye`, `location_bullseye` (see `src/utils/badges/types.ts`).

  Note: Sections below referencing modules under `src/multiplayer/*` (e.g., `Server.ts`, `MultiplayerAdapter.ts`) represent planned design. For the current implementation, treat `server/lobby.ts` and `src/lib/partyClient.ts` as canonical. The remainder of this document is preserved as an appendix for detailed design and UI notes.

## Appendix — Detailed Design and UI Notes

## Overview
This document provides comprehensive architecture guidelines for the Guess History multiplayer system, built on PartyKit with Supabase for state persistence and Cloudflare Workers for async processing.

## Fullscreen Image Inertia Panning System

### User Settings Integration
- **Location**: `src/utils/profile/profileService.ts` - `UserSettings` interface
- **Fields**:
  - `inertia_enabled: boolean` — Master toggle for panning inertia (and auto-pan behaviors). If `false`, drag momentum and auto-pan are disabled.
  - `inertia_mode: 'none' | 'swipes' | 'swipes_recenter'` — Controls automatic panning behavior.
  - `inertia_level: number (1..5)` — Controls inertia strength/duration. Higher = longer glide (lower friction).
- **Defaults**: `{ inertia_enabled: true, inertia_mode: 'swipes', inertia_level: 3 }`
- **Storage contract**: Persist settings in `public.settings` keyed by `id = <userId>`. Always use `fetchUserSettings(userId)` and `updateUserSettings(userId, settings)` from `profileService`. Do not prefix IDs (avoid formats like `user_settings_${userId}`) to ensure the fullscreen viewer and settings UI load the same row.

### Inertia Modes
1. **None** — No automatic panning or inertia effects.
2. **Swipes** — Continues motion after drag with mobile-optimized inertia. On the round’s first fullscreen open, the preview auto-pan sweeps left→right once and stops at the edge (no recenter).
3. **Swipes then recenter** — Continues motion, then automatically centers the image. On the round’s first fullscreen open, the preview sweeps left→right and then back to center.

### Mobile Optimizations
- **Enhanced Velocity Smoothing**: Increased smoothing factor (0.7) for better mobile touch response
- **Level-Scaled Friction**: Base friction `0.003` scaled by `((6 - inertia_level)/3)` so Level 1≈0.005 (short), Level 3≈0.003 (medium), Level 5≈0.001 (long).
- **Responsive Threshold**: Lower velocity threshold (0.005) for more responsive inertia activation
- **Pointer Events**: Full pointer event support for consistent mobile/desktop behavior

### Settings UI
- **Location**: `src/components/profile/SettingsTab.tsx`
- **Control**: Radio group with Navigation icons and descriptive labels
- **Integration**: Real-time settings loading and saving via Supabase

### Vibrate & Gyroscope Settings (2025-08)
- **Overview**: Device feedback and motion controls are user-configurable and consistent between the Profile page and the in-game Settings modal.
- **Files**:
  - `src/components/profile/SettingsTab.tsx` — Theme options are now only `light` and `dark` (system removed). Adds toggles for `vibrate_enabled` and `gyroscope_enabled`; updates Zustand store and persists via Supabase.
  - `src/components/settings/GlobalSettingsModal.tsx` — In-game settings popup rendering the same settings UI as the profile; hydrates `useSettingsStore` from Supabase on open.
  - `src/components/navigation/GameOverlayHUD.tsx` — Top-right gear icon opens `GlobalSettingsModal` (replaces prior Home icon in-game).
  - `src/components/game/TimerDisplay.tsx` — Under-10s countdown vibration (if enabled) and strong vibration pattern on timeout; countdown beeps gated by `sound_enabled`.
  - `src/components/layouts/FullscreenZoomableImage.tsx` — Gyroscope-based panning when `gyroscope_enabled` is true; disabled during user drag, inertia, or auto-pan. Unauthenticated default settings include `theme: 'dark'`, `vibrate_enabled: false`, `gyroscope_enabled: false`.
  - `src/lib/useSettingsStore.ts` — Zustand store for user settings including `vibrate_enabled` and `gyroscope_enabled` with action toggles.
  - `src/utils/profile/profileService.ts` — `fetchUserSettings()`/`updateUserSettings()` source of truth. The `UserSettings` type includes optional `vibrate_enabled` and `gyroscope_enabled`. Default theme is `dark` and the UI no longer exposes `system`.
- **Persistence**: Settings are stored in `public.settings` keyed by `id = <userId>`. Always use `fetchUserSettings(userId)` and `updateUserSettings(userId, settings)`.
- **Error handling (Settings modal)**: `src/components/settings/GlobalSettingsModal.tsx` displays an inline error message and a "Retry" button when loading fails, and uses `use-toast` to surface load/refresh errors and a "Settings updated" success toast. This pattern keeps the UI responsive and consistent.
- **Device APIs**: Uses `navigator.vibrate` (feature-detected) and `window.deviceorientation` events for gyro. iOS may require explicit motion permission prompts at first use.
- **UX Notes**:
  - Vibrate: subtle tap per second during final 10s; stronger pattern at 0s.
  - Gyroscope panning: smooth, clamped offsets; paused while dragging or when inertia/auto-pan is running.
  - Theme: `system` option removed from UI; default/fallback is `dark`.

### Implementation Details
- **Settings Loading**: Async loading on component mount with fallback defaults
- **Recenter Animation**: Smooth 800ms ease-out cubic animation to center position
- **Auto-pan Integration**: Respects `inertia_enabled` and `inertia_mode` (disabled when `inertia_enabled` is false or mode is `none`).
- **Dynamic Hints**: Context-aware instruction tooltips based on selected inertia mode

## Database Migrations

### Manual Migration Process (Primary Method)

Due to potential inconsistencies and environment issues with the Supabase CLI, the primary method for applying database migrations is manual execution through the Supabase SQL Editor. This ensures reliability and atomicity.

**Workflow:**

1.  **Consolidate Migrations**: Combine all new `.sql` migration files from the `supabase/migrations/` directory into a single script.
2.  **Order Scripts**: Ensure the SQL commands are ordered chronologically based on their migration timestamps. Dependencies between migrations must be respected (e.g., a table creation must come before a policy that uses it).
3.  **Wrap in a Transaction**: Enclose the entire consolidated script within a `BEGIN;` and `COMMIT;` block. This makes the entire operation atomic; if any part fails, the whole set of changes is rolled back.
4.  **Execute in Supabase UI**:
    *   Navigate to the **SQL Editor** in your Supabase project dashboard.
    *   Create a new query.
    *   Paste the complete, ordered, and transaction-wrapped script into the editor.
    *   Click **RUN**.

### Admin Game Config — Client Save & RLS (2025-08-31)

- **Table**: `public.game_config` with a single canonical row `{ id: 'global' }`.

### Multiplayer Session Persistence — game_sessions (2025-08-31)

- __Purpose__: Persist deterministic multiplayer session data per room in `public.game_sessions` (`room_id` PK) including `seed`, `image_ids[]`, and `current_round_number`.
- __Schema__: See `supabase/migrations/20250809_create_game_sessions.sql`. Columns: `room_id text PK`, `seed text not null`, `image_ids text[] not null`, `current_round_number integer not null default 1`, `started_at timestamptz not null default now()`. RLS enabled with auth SELECT/INSERT/UPDATE allowed.
- __Update vs Upsert__
  - `src/utils/roomState.ts` `setCurrentRoundInSession(roomId, roundNumber)` now performs an UPDATE of `current_round_number` filtered by `room_id`.
  - Rationale: avoids accidental INSERTs that violate NOT NULL constraints (e.g., `image_ids`) and prevents PostgREST 400 errors when payloads are incomplete.
  - Diagnostics: logs when 0 rows are updated (session row missing) so callers can ensure creation happens earlier in the start flow.
- __Creation__: The row is created during game start/session prep (server RPC or preparer) when `seed` and `image_ids` are known. Do not rely on `setCurrentRoundInSession` to create rows.
- __Call site rules__
  - Use the 2-arg signature everywhere: `setCurrentRoundInSession(roomId, roundNumber)`.
  - Call once per round navigation. Avoid duplicate calls in multiple `useEffect`s.

### Game Round Page — Round Persistence Deduplication (2025-08-31)

- __File__: `src/pages/GameRoundPage.tsx`
- __Rule__: Only a single effect persists the URL-derived round to `game_sessions` via `setCurrentRoundInSession(roomId, roundNumber)`. Duplicate effects were removed to prevent double updates and duplicate Realtime traffic.
- __Result__: Fewer 400s from conflicting writes and no duplicate Realtime subscription warnings tied to per-round persistence.
- **Client save (no API route)**: The admin page saves directly using the authenticated Supabase client, relying on RLS for authorization.
  - Page: `src/pages/admin/AdminGameConfigPage.tsx`
    - Calls `saveConfigPatch(supabase, patch)` instead of POSTing to `/api/admin/save-config`.
  - Service: `src/server/configService.ts`
    - `saveConfigPatch(client, patch)` validates the patch via Zod, deep-merges over the current config, validates final config, and `upsert`s `{ id: 'global', config }`.
- **RLS policies (admin only)**: Policies check `auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'` for insert/update.
  - Migration: `supabase/migrations/20250831_update_game_config_rls.sql` drops prior policies and recreates them with the nested `user_metadata.role` check.
- **Route guard**: `/admin` is wrapped by `RequireAuthSession` in `App.tsx` so only users with an active session can access the page. Admin enforcement for writes is handled by RLS.
- **Note**: The legacy `pages/api/admin/save-config.js` is unused in Vite SPA deployments and kept only as reference. Do not rely on it.

### Game Preparation RPC — Client Call Contract (2025-08-26)

- Function overloads exist for `public.create_game_session_and_pick_images`:
  - 4-arg: `(p_count integer, p_user_id uuid, p_room_id text, p_seed uuid)`
  - 6-arg: `(p_count integer, p_user_id uuid, p_room_id text, p_seed uuid, p_min_year integer, p_max_year integer)`
- To avoid “Could not choose the best candidate function” errors, the client must disambiguate:
  - Always include `p_min_year` and `p_max_year` in the RPC call. Passing `null` is fine and selects the 6-arg overload.
  - Only include `p_seed` when a seed is explicitly provided. When omitted, the DB default `gen_random_uuid()` applies.
- Source: `src/hooks/useGamePreparation.ts` constructs the RPC args accordingly.

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

### Room page — “Maximum update depth exceeded” (2025-08-24)

- **Symptom**: React warning triggered in `src/pages/Room.tsx` when state updates inside `useEffect` caused re-renders on every render.
- **Root causes**:
  - `connect()` effect recreating due to `name` dependency, causing repeated reconnects.
  - Incoming `settings` messages always calling setters, even when values didn’t change.
  - Host settings effect depending on `status`, retriggering sends on status toggles.
  - `close` handler reading stale `status`.
- **Fixes**:
  - Read latest `name` from `latestNameRef` inside `connect()`; remove `name` from `connect` deps; trigger `connect()` from a separate effect keyed by route/profile readiness only.
  - Guard server `settings` handler using `timerEnabledRef` and `roundTimerSecRef` to avoid redundant `setTimerEnabled`/`setRoundTimerSec`.
  - Remove `status` from the host settings effect deps; keep idempotence with `lastSentSettingsRef`.
  - Use `statusRef` in the WebSocket `close` handler.
  - Refs synced in tiny effects: `latestNameRef`, `statusRef`, `timerEnabledRef`, `roundTimerSecRef`.
  - File: `src/pages/Room.tsx`.
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

### Auth changes (2025-08-26)

- **No automatic guest sign-in**
  - File: `src/contexts/AuthContext.tsx`
  - Behavior: On initial mount we no longer call `supabase.auth.signInAnonymously()` when no session exists. The session is left null until the user explicitly signs in (email/OAuth) or taps “Continue as Guest.”
  - Rationale: Prevents unintended guest sessions on the landing page while keeping the explicit guest flow intact via `continueAsGuest()`.

- **Profiles RLS — authenticated can read all profiles**
  - Migration: `supabase/migrations/20250826_profiles_select_all_authenticated.sql`
  - Policy: `CREATE POLICY profiles_select_all_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);`
  - Purpose: Enables Friends search and discovery to list other users (excluding self/friends at query time) for any authenticated user.

### Friends Page — Search & Discovery (2025-08-26)

- **Location**: `src/pages/FriendsPage.tsx`
- **Behavior**:
  - Tab "Find Users" preloads a paged list from `public.profiles` (excludes self and current friends).
  - Typing in the search box performs instant client-side filtering over the loaded list using `display_name` and `original_name`.
  - Pressing Enter or the Search button performs a server-side search via `.ilike('display_name', "%<term>%")`, excludes self, and limits results.
  - Display logic: when a non-empty term is present, show server results (`searchResults`) if available; otherwise show the locally filtered list. When the term is empty, show the preloaded list.
- **Why**: Provides responsive filtering UX while still allowing wider discovery via server queries when explicitly requested.
- **RLS**: Requires the "profiles select all authenticated" policy above; no additional policies needed for search.

- **Inline error feedback in Auth Modal (2025-08-16)**:
  - `src/components/AuthModal.tsx` surfaces inline errors on the Sign In tab without relying on toasts. This avoids “silent” failures when toasts are not mounted.
  - Error mapping:
    - “Invalid login credentials” / 400 responses → shows “Wrong email or password.”
    - If the account was created with Google/OAuth (no password set), the modal also shows a hint: “If you originally signed up with Google, use ‘Continue with Google’ below or reset your password to set one.”
    - “Email not confirmed” → prompts the user to check their inbox for a confirmation link.
  - State keys: `formError`, `formHint`.

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
## Development Setup

...

## Multiplayer Round Results (Peer Answers)

- Hook: `src/hooks/useRoundPeers.ts`
  - Fetches and subscribes to room-scoped round results via RPC `get_round_scoreboard` and realtime on `public.round_results`.
  - Returns `peers: PeerRoundRow[]` with display names, scores, accuracies, guess lat/lng, and actual lat/lng.

- Page integration: `src/pages/RoundResultsPage.tsx`
  - Calls `useRoundPeers(roomId, roundNumber)` and passes `peers` into the results layout.
  - Continues to map the local player's context result to the layout type as before.

- Layout rendering: `src/components/layouts/ResultsLayout2.tsx`
  - New optional prop: `peers?: PeerRoundRow[]`.
  - Renders each peer's guess as a marker and a polyline to the correct location.
  - Automatically adjusts map bounds to include the correct location, your guess, and peer guesses.
  - No visual changes outside the map; UI remains otherwise unchanged.

Notes:
- This enhancement is realtime; peers appear/refresh as their `round_results` change.
- RLS must allow room participants to read `round_results` and execute the scoreboard RPC.

#### Multiplayer Membership Persistence (session_players)

- Table: `public.session_players (room_id text, user_id uuid, display_name text, joined_at timestamptz, PK(room_id,user_id))`
- RLS: authenticated can SELECT; users can INSERT/UPDATE/DELETE their own row only.
- Client upsert points:
  - `src/contexts/GameContext.tsx` → `ensureSessionMembership(roomId, userId?)` helper performs `upsert({ room_id, user_id, display_name })` with `onConflict: 'room_id,user_id'`.
  - Called in `startGame()` when starting a multiplayer session (after `ensureSessionMembership`).
  - Called in `hydrateRoomImages(roomId)` on refresh/rejoin flows.
- Purpose: Satisfies RLS policies that grant visibility/authorization to room participants for:
  - Reading peer `round_results` rows
  - Executing scoreboard RPCs (e.g., `get_round_scoreboard`)

#### Round Indexing Consistency (0-based)

- Internal DB uses 0-based `round_index`.
- UI routes use 1-based `roundNumber`.
  - Conversions enforced in `src/hooks/useRoundPeers.ts`:
  -  - Queries and realtime filter use `dbRoundIndex = max(0, roundNumber - 1)`.
  -  - Realtime channel name and filter include `round_index=eq.<dbRoundIndex>` to avoid off-by-one refresh misses.

#### Room ID Synchronization (URL → Context → Session)

- Files and APIs
  - `src/contexts/GameContext.tsx` → `syncRoomId(roomId: string)` sets `context.roomId`, persists it to `sessionStorage` (key: `lastSyncedRoomId`), and calls `ensureSessionMembership(roomId, userId)` to upsert into `public.session_players`.
  - `src/contexts/GameContext.tsx` → `recordRoundResult(...)` derives an effective `roomId` from context → URL → `sessionStorage` (in that order) to persist `round_results` with correct `room_id` and 0-based `round_index`.

- Page touchpoints
  - `src/pages/GameRoundPage.tsx` → `useEffect(() => { if (roomId) syncRoomId(roomId); }, [roomId])` keeps context synchronized during play and on reload.
  - `src/pages/RoundResultsPage.tsx` → `useEffect(() => { if (roomId) { syncRoomId(roomId); hydrateRoomImages(roomId); } }, [roomId])` ensures membership and image hydration for results visibility.

- Why this matters
  - Satisfies RLS by guaranteeing a row in `public.session_players` for the current user/room, enabling reads of peers' `round_results` and scoreboard RPCs.
  - Prevents orphaned solo-scoped results by always writing `round_results.room_id` when in multiplayer.
  - Ensures `useRoundPeers(roomId, roundNumber)` returns data after direct links and page reloads.

  - Fallbacks and reloads
  -  - Last `roomId` is cached in `sessionStorage` and used when navigating directly or after refresh.
  -  - `hydrateRoomImages(roomId)` rehydrates the deterministic image order and related assets on results pages when needed.

  #### Room ID Backfill Repair (round_results)
  
  - **Location**: `src/contexts/GameContext.tsx` → `repairMissingRoomId(knownRoomId: string)`
  - **Behavior**: When a `knownRoomId` becomes available and `gameId` is set for the current user, update any `public.round_results` rows for this game where `room_id IS NULL` to the known value. This heals rows that may have been written before room synchronization completed.
  - **Callers**:
    - `startGame()` when starting a multiplayer session (after `ensureSessionMembership`).
    - `hydrateRoomImages(roomId)` on refresh/rejoin flows.
    - `syncRoomId(roomId)` and the initial URL bootstrap effect that derives `roomId` from the path.
    - `recordRoundResult(...)` after deriving the effective room id (context → URL → `sessionStorage`).
  - **Persistence helpers**:
    - Session cache key: `sessionStorage['lastSyncedRoomId']` is written in all of the above touchpoints.
    - `recordRoundResult(...)` logs the `effectiveRoomId` it will persist with for diagnostics and calls `repairMissingRoomId(effectiveRoomId)` when applicable.
  - **Purpose**: Prevents empty `room_id` in `public.round_results`, ensures scoreboard RPCs and peer result subscriptions work for multiplayer, and maintains RLS visibility by consistently scoping rows to a room.
  - **Diagnostics**: Console logs are prefixed with `[GameContext] repairMissingRoomId` on success/failure.
  
  - Indexing and params
  -  - UI `roundNumber` is 1-based; DB uses 0-based `round_index`. Convert with `Math.max(0, roundNumber - 1)` consistently in RPCs and realtime subscriptions.

#### Scoreboard RPC Indexing (2025-08-23)
  
- Migration `20250823_fix_scoreboard_round_index.sql` updates `public.get_round_scoreboard(p_room_id text, p_round_number int)` to convert the provided 1-based `p_round_number` to the DB’s 0-based `round_index` via `GREATEST(0, p_round_number - 1)`.
- Callers should continue passing a human-facing 1-based round number; the RPC handles translation.
- Authorization remains unchanged: only participants in `public.session_players` for the room may call.
- Policies on `public.round_results` already allow room participants to select rows (`rr_select_participants_in_room`).

#### Verification Script (session membership + scoreboard)
  
- Script: `scripts/test-session-players.ts`
- Behavior:
  - Ensures anonymous auth if needed.
  - Upserts current user into `public.session_players` with `onConflict: 'room_id,user_id'`.
  - Lists up to 10 players in the room.
  - Calls `get_round_scoreboard(p_room_id, p_round_number)` with a 1-based round number.
  - Fetches up to 10 `public.round_results` rows for the room.
- Usage examples (Windows PowerShell):
  - `npx tsx scripts/test-session-players.ts VE5U9B 1`
  - `node --loader tsx scripts/test-session-players.ts VE5U9B 1`
- Exit codes: returns 0 on success, 1 on any error, with detailed error logs including `code`, `message`, `details`, and `hint` fields where available.

- Testing checklist
  - Open `/solo/play/room/:roomId/round/:roundNumber` directly → peers and their guesses should render.
  - Reload both the round and results pages → peer results remain visible; coordinates including `(0,0)` render correctly.
  - Submit a guess → corresponding `public.round_results` row includes `room_id` and 0-based `round_index`.
  - Run `scripts/test-session-players.ts` with a room ID and round number to verify session membership and scoreboard RPCs.
  - Sign out/in and rejoin → `ensureSessionMembership` upserts your `session_players` row; scoreboard RPCs work.

### Local Development
```bash
# Start PartyKit server
npm run partykit:dev

{{ ... }}
# Start frontend
npm run dev

{{ ... }}
# Run tests
npm run test:multiplayer
```

- Note: When running `npm run dev`, Vite will automatically attempt to start the PartyKit dev server if it is not already listening on `VITE_PARTYKIT_HOST` (defaults to `localhost:1999`). This is implemented via a dev-only plugin in `vite.config.ts` (name: `start-partykit-dev`). No UI changes were made; this only affects the development workflow. If you prefer manual control, start PartyKit separately before Vite or set `VITE_PARTYKIT_HOST` appropriately.

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

### Diagnostics & Logging — Multiplayer Start/Session
- __Server (PartyKit)__: `server/lobby.ts`
  - `persistRoundStart()` now logs when env vars are missing and when the Supabase REST call fails, including HTTP status and response body.
  - Where to see: the terminal running `npm run partykit:dev` or the PartyKit worker logs in production.
- __Client (RPC & images)__: `src/hooks/useGamePreparation.ts`
  - Logs sanitized RPC args and detailed failures for `create_game_session_and_pick_images` (code, message, details, hint) and image metadata fetch errors.
  - Also warns when selected image count is insufficient vs requested.
  - Where to see: browser DevTools console.
- __Client (round state)__: `src/utils/roomState.ts`
  - Logs PostgREST/PG error codes and details for `room_rounds` and `game_sessions` operations, including params (`roomId`, `roundNumber`).
  - Skips noisy logs when table/column is missing (`42P01`, `42703`) but still notes the skip with code.
- __Common error codes__:
  - `404` from RPC call → missing function `create_game_session_and_pick_images` or schema mismatch.
  - `401/403` on REST or RPC → RLS/policy issues; verify policies in migrations.
  - `42P01` (undefined table), `42703` (undefined column) → check migrations applied.
  - `PGRST116` (No rows) is expected in `.maybeSingle()` not-found cases.
- __First checks__ when failures occur:
  - Verify env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` for server persistence.
  - Ensure these migrations are applied: `20250809_create_game_sessions.sql`, `20250809_add_room_rounds_and_current_round.sql`, `20250817_create_game_prep_rpc.sql`.
  - Confirm RLS policies exist for `game_sessions`, `room_rounds`, and `images` as defined in migrations.
- __Dev reproduction__: run `npm run dev:mp` and create a room to capture both server and client logs during start.

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

## PWA Install Experience and Offline (2025-08)

The app provides a clean, accessible PWA install flow with an offline-first shell.

- **Manifest**: `public/manifest.webmanifest`
  - Includes `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `background_color`, `theme_color`, and icons (192/512, including maskable) sourced from `public/images/logo.png`.

- **Service Worker**: `public/sw.js`
  - Minimal app-shell cache: `/`, `/index.html`, `/manifest.webmanifest`.
  - Navigate fallback to cached `index.html` when offline.
  - Registered in production in `src/main.tsx`:
    - `if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')` on window `load`.

- **Install UI Hook**: `src/pwa/usePWAInstall.ts`
  - Captures `beforeinstallprompt`, listens to `appinstalled`.
  - Detects platform: `ios | android | desktop | unknown`.
  - Detects standalone mode via `(display-mode: standalone)` and iOS `navigator.standalone`.
  - Persists dismissals/installs in `localStorage` (`gh_pwa_install_state`).
  - Cooldown after dismissal: 14 days.
  - Exports helpers: `shouldAutoShowInstall(state)`, `markAutoShown()`.

- **Auto Prompt Component**: `src/components/pwa/InstallPrompt.tsx`
  - Non-blocking card (mobile: bottom; desktop: bottom-right).
  - iOS: accessible instructions modal (Share → Add to Home Screen).
  - Telemetry (CustomEvent `telemetry` on `window`): `prompt_captured`, `prompt_shown`, `accepted`, `dismissed`, `installed`, `instructions_needed`.
  - Rendered globally in `src/App.tsx` as `<InstallPrompt auto />` so it can appear on any route when eligible.

- **Manual Install Entry Point**: `src/components/AccountSettings.tsx`
  - New "Install App" card using `usePWAInstall()`.
  - Button calls `install.prompt()`; shows iOS help toggle when native prompt is unavailable.
  - Disables when already installed/standalone.

- **Testing**
  - Dev: Use Application panel → Manifest to verify installability; throttle offline to verify navigate fallback.
  - Prod build: `npm run build` → `dist/` contains copied `public/` including `manifest.webmanifest` and `sw.js`.
  - iOS Safari: no native prompt; use instructions to Add to Home Screen.

## Round Session ID and Hint Persistence

- Central helper: `src/utils/roomState.ts: makeRoundId(roomId: string, roundNumber: number)` builds the canonical round session ID (`<roomId>-r<roundNumber>`). Use this everywhere round-scoped persistence is required (e.g., `round_hints`, results aggregation), instead of parsing URLs or hand-rolling strings.
- Hint system V2: `src/hooks/useHintV2.ts` accepts an optional second parameter `opts?: { roomId?: string; roundNumber?: number }`. When provided, the hook uses `makeRoundId()` to read/write purchases in `round_hints`, avoiding any coupling to the route structure. Callers that don't have room context can omit this parameter and the hook will fall back to URL parsing for backward compatibility.
- Call sites updated:
  - `src/pages/GameRoundPage.tsx` now calls `useHintV2(imageForRound, { roomId, roundNumber })`.
  - `src/pages/RoundResultsPage.tsx` uses `makeRoundId(roomId, roundNumber)` when querying hint debts.

### Final Scoring with Hint Debts V2 (2025-08)

- Files:
  - `src/pages/FinalResultsPage.tsx`
  - `src/utils/gameCalculations.ts`: `computeRoundNetPercent()`, `averagePercent()`
  - `src/utils/roomState.ts`: `makeRoundId()`

- Behavior:
  - Final XP and Accuracy use real debts aggregated from `public.round_hints` per round for the current user and session.
  - Session keying is room-first: if `roomId` is present, construct `round_id` with `makeRoundId(roomId, roundIndex+1)`; otherwise fall back to `makeRoundId(gameId, roundIndex+1)`.
  - XP: Sum raw round XP, then subtract the aggregated `xpDebt` across rounds → `netFinalXP`.
  - Accuracy: For each round, compute average of time/location accuracy, subtract that round’s aggregated `accDebt`, clamp to 0..100, then average across rounds → `finalPercentNet`.
  - UI displays net values. The Final Results card label is “Hint Penalties” and it shows both total accuracy (%) and XP hint debts with percent first, e.g., `-2% -40 XP`.

- Implementation notes:
  - Build round IDs with `makeRoundId(roomId, roundIndex+1)` when available; otherwise `makeRoundId(gameId, roundIndex+1)`.
  - Query `round_hints` selecting `round_id, xpDebt, accDebt` filtered by `user_id` and the session’s round IDs. Sum `xpDebt` and group-sum `accDebt` per `round_id`.
  - Provisional global metrics are set immediately using raw totals (pre-debt) to ensure the navbar updates without delay, then persistence updates metrics with net values and triggers `refreshGlobalMetrics()`.

### Hint Label Resolution (Results)

- Component: `src/components/results/HintDebtsCard.tsx`
- Source constants: `src/constants/hints.ts` (`HINT_TYPE_NAMES`)
- Resolution order:
  1) Exact match on `hintId` in `HINT_TYPE_NAMES`
  2) Exact match on `hintType` in `HINT_TYPE_NAMES`
  3) Base-ID extraction for `hintId` with suffixes (strip trailing `-...`) and prefix match
  4) Cost-based inference (uses the debt values when only generic categories are present):
     - Where 50 XP / 50% → "Region"
     - Where 20 XP / 20% → "Remote Landmark"
     - Where 30 XP / 30% → "Nearby Landmark"
     - Where 40 XP / 40% → "Geographical Clues"
     - Where 10 XP / 10% → if numeric/`km` → "Distance to Landmark" (continent handled by heuristic below)
     - When 50 XP / 50% → "Decade"
     - When 20 XP / 20% → "Distant Event"
     - When 30 XP / 30% → "Recent Event"
     - When 40 XP / 40% → "Temporal Clues"
     - When 10 XP / 10% → if numeric/`years` → "Years From Event" (century handled by heuristic below)
  5) Heuristics:
     - When: raw contains `N(st|nd|rd|th) century` or `N(st|nd|rd|th)` → label "Century"
     - When: raw decade like `1930s`, `2020s` → label "Decade"
     - Where: raw equals a known continent (Africa, Antarctica, Asia, Europe, North America, South America, Oceania, Australia) → label "Continent"
  6) Numeric sub-hints defaults:
     - When numeric → "Years From Event"; renders as "<n> year(s)"
     - Where numeric → "Distance to Landmark"; renders as "<n> km"
  7) Fallbacks: "Time Hint" for `when`, "Location Hint" for `where`.

- Units detection:
  - Keys: `_years` or `when_event_years` → years off
  - Keys: `_km` or `where_landmark_km` → km away

- Display behavior:
  - Title uses resolved label; answer prefers human-friendly raw text when non-numeric.
  - If raw is numeric-only, falls back to numeric with units; may use `yearDifference`/`distanceKm` props when provided.

- Mobile hint modal:
  - `src/components/HintModalV2New.tsx` removes transform-based centering on mobile so sticky "HINTS" header and "Continue Guessing" footer remain visible.

## Lobby Timer Settings

The multiplayer lobby supports a host-configurable round timer that synchronizes to all participants and is applied when the game starts.

- **Client → Server message**: `settings`
  - Shape: `{ type: 'settings'; timerSeconds?: number; timerEnabled?: boolean }`
  - Sent by: Host only
  - Behavior: Server validates/clamps values and stores in room state.
- **Key files**:
  - Server: `server/lobby.ts` — handles `settings` from host, clamps values, includes `durationSec` and `timerEnabled` in `start` broadcast.
  - Shared types: `src/lib/partyClient.ts` — defines `LobbyClientMessage` and `LobbyServerMessage` including `settings` and extended `start`.
  - Lobby UI: `src/pages/Room.tsx` — host-only timer toggle (Switch) and Shadcn Slider (5–300s, step 5) matching the Home page; non-hosts see the formatted time and a note that the host controls the timer. An effect sends `settings` when values change.
  - Solo settings reference: `src/components/game/GameSettings.tsx`.

- **UI behavior**:
  - Host sees a toggle (timer on/off) and a slider (5–300 seconds, step 5s) and the formatted time.
  - Participants see the formatted time and a note that the host controls the timer.
  - Timer values are also validated on the server.

- **UI implementation note (2025-08-27)**:
  - The round duration control uses the same Switch + Shadcn Slider UI used on the Home page (min 5, max 300, step 5). Controls are disabled for non-hosts and show “Host controls the timer.”

- **Host-only Friends management within Room**
  - File: `src/pages/Room.tsx`
  - Visibility: Panel appears only for the host (`isHost`).
  - Features:
    - Search users by display name (excludes self and already-friended IDs).
    - Add friend: inserts into `public.friends (user_id, friend_id)`.
    - Remove friend: deletes the `(user_id, friend_id)` row.
    - Lists current friends by resolving IDs against `public.profiles (id, display_name, avatar_url)`.
    - Includes a link button to the full Friends page route (`/test/friends`) for advanced management (`src/pages/FriendsPage.tsx`).
  - Tech details:
    - Uses Supabase client: `@/integrations/supabase/client`.
    - Notifications: `toast` from `@/components/ui/use-toast` (project toast hook; renders via `Toaster`).
    - Kept separate from PartyKit lobby logic; does not alter ready/start flows.

## Room Invitations (Storage & Realtime) — 2025-08-23

- __Storage__
  - Table: `public.room_invites`
    - Columns: `id uuid pk default gen_random_uuid()`, `room_id text not null`, `inviter_user_id uuid not null -> auth.users(id)`, `friend_id uuid not null -> public.profiles(id)`, `created_at timestamptz default now()`.
  - Indexes: unique `(room_id, inviter_user_id, friend_id)`; plus indexes on `room_id`, `inviter_user_id`, `friend_id`.

- __RLS Policies__ (enabled)
  - `ri_select_inviter`: authenticated users can `SELECT` rows where `inviter_user_id = auth.uid()`.
  - `ri_select_invited`: authenticated users can `SELECT` rows where `friend_id = auth.uid()`.
  - `ri_insert_inviter`: authenticated users can `INSERT` only when `inviter_user_id = auth.uid()`.
  - `ri_delete_inviter`: authenticated users can `DELETE` rows they created (`inviter_user_id = auth.uid()`).
  - `ri_delete_invited`: authenticated users can `DELETE` rows where they are the invited friend (`friend_id = auth.uid()`).

- __Realtime__
  - Migration: `supabase/migrations/20250823_enable_realtime_room_invites.sql`:
    - `ALTER TABLE public.room_invites REPLICA IDENTITY FULL` to ensure `DELETE` events include non-PK columns for server-side filtering by `friend_id`.
    - `ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites` (idempotent guard) to receive changes.

- __Types__
  - `integrations/supabase/types.ts` includes `public.Tables.room_invites` (Row/Insert/Update and relationships) for type-safe queries.

- __Invited-user decline (client helpers)__
  - Location: `integrations/supabase/invites.ts`
  - APIs:
    - `fetchIncomingInvites(roomId: string, userId: string): Promise<RoomInviteRow[]>` — list pending invites for the invited friend in a room.
    - `declineInvite(inviteId: string): Promise<void>` — delete a single invite (works for inviter or invited friend per RLS).
    - `declineInviteForRoom(roomId: string, userId: string): Promise<number>` — delete all invites for a room for the invited friend; returns count.
  - RLS ensures only inviter or invited friend can delete relevant rows. No service role required.
  - UI note: an Invitation modal can call `declineInvite*` to remove the invite(s). Realtime on `public.room_invites` will propagate changes to any listeners.

## Compete (Sync) Lobby UI Layout (2025-08)

- __Location__: `src/pages/Room.tsx`
- __Header__: Centered “SYNC” pill for mode identification.
- __Cards__:
  - Timer Settings — host-only toggle and duration slider (5–300s). All players see formatted time.
  - Room Information — shows room code; host-only copy/share invite controls.
- __Players__: Grid of player cards with avatar initial, name, host badge, and readiness status.
  - Your card shows an interactive ready switch; others show a disabled switch reflecting their state.
  - A slim readiness bar indicates each player’s ready state.
- __Bottom banner__: “Waiting for players (readyCount/total)” note; clarifies that all players must be ready in Sync mode.
- __Chat__: The lobby chat panel has been removed in this layout.
- __Top actions__: Home button, account menu, and leave controls remain on the top-right. Share invite is host-only.

## Play With Friends Page UI (/play)

- __Location__: `src/pages/PlayWithFriends.tsx`
- __Purpose__: Entry point for multiplayer. Host or join a lobby by code. No logic changes; UI-only.
- __Header__: Top-left Back button (`navigate(-1)`).
- __Mode pill__: Non-interactive segmented pill (“SYNC | ASYNC”) centered visually; mirrors Room page’s mode styling.
- __Cards__:
  - Host Game — primary button “Create room” generates a 6-char room code and navigates to `/room/:code?host=1`.
  - Join Game — labeled input for 6-char room code (auto uppercases, tracking spacing). “Join” enabled only when valid.
- __Display name note__: Shows the authenticated display name resolved from `AuthContext`.
- __Capacity note__: “Rooms support up to 8 players. Share the 6-character code with friends.”
 - __Mobile toggle__: A Host/Join segmented control appears on small screens and switches which card is visible; both cards are shown side-by-side on `md+` screens.
 - __Paste invite link__: Join card includes a secondary input that auto-extracts a 6-character room code from a pasted URL or text and fills the primary code field.
 - __Validation__: Join button is disabled until the code matches `/^[A-Z0-9]{6}$/`; input auto-uppercases.


## Multiplayer Start Synchronization (Timer + Deterministic Image Order)

- **Authoritative start** (`server/lobby.ts`)
  - When all connected players are ready, server broadcasts:
    - `start { startedAt: string, durationSec: number, timerEnabled: boolean }`
  - Server persists round start metadata for recovery.

- **Client handling** (`src/pages/Room.tsx`)
  - On `start`:
    1) Derive a deterministic image seed from `roomCode` and `startedAt` (UUIDv5 over a stable concatenation).
    2) Call `GameContext.startGame({ roomId, seed, timerSeconds: durationSec, timerEnabled })` to initialize both images and timer consistently across clients.

- **Deterministic images**
  - `src/utils/imageHistory.ts`: seeded RNG + `seededShuffle` over the canonical set of playable images; persists image order per room/seed to Supabase so reconnects see the same sequence.
  - `src/hooks/useGamePreparation.ts`: fetches metadata and preloads images using the provided `seed` and `roomId`, reporting progress.

- **Local Game Timer (independent of server timers)**

- A dedicated hook `src/gameTimer/useGameLocalCountdown.ts` mirrors the `/timer` page behavior:
  - Persists a session per `timerId` in `localStorage`.
  - Synchronizes across tabs via `storage` events.
  - Ensures `onExpire` runs once using an `:ended` sentinel key.
  - Hydrates an existing session if present; otherwise, creates a new one when `autoStart` is true and `durationSec > 0`.

- Game integration in `src/pages/GameRoundPage.tsx`:
  - Builds `timerId` preferring `roomId` for stability across refreshes: `gh:{roomId}:{roundIndex}` (falls back to `gameId` when `roomId` is absent). This makes Solo and Level Up timers resume correctly after refresh and across tabs.
  - Passes `durationSec` from `GameContext.roundTimerSec` (sourced from global settings or Level Up config).
  - `autoStart` gating is `timerEnabled && roundStarted && timerId`.
  - UI pre-hydration sets `remainingTime = roundTimerSec` until the countdown hydrates, then syncs to `remainingSec`.

- Timer ID construction utility: `src/lib/timerId.ts` (`buildTimerId(baseId, roundIndex)`). The `baseId` used by the page is `roomId || gameId`.

- Notes:
  - Solo mode uses global timer settings via `useSettingsStore` (see HomePage wiring). On first page load in a new game, the session is created with that configured duration.
  - Multi-tab synchronization and resume behavior match the `/timer` feature.

- **Change**: The `timerId` construction in `GameRoundPage` now prefers `roomId` for Solo timer persistence, mirroring the behavior of `useGameLocalCountdown`. This ensures consistent timer behavior across refreshes and tabs.

- **Reference**: The `useGameLocalCountdown` hook provides a local countdown solution that persists across tabs and refreshes, independent of server timers. Its behavior is mirrored in the `GameRoundPage` integration.

- **Client → Server message**: `progress`
  - Shape: `{ type: 'progress'; roundNumber: number; substep?: string }`
{{ ... }}
  - Usage: Sent opportunistically to reflect a player’s in-round state transitions, e.g., `substep` in `['pre','thinking','guessing','hint','submitted']`.
  - Security: Server ignores messages from non-joined connections.

- **Server → Client message**: `progress`
  - Shape: `{ type: 'progress'; from: string; roundNumber: number; substep?: string }`
  - Broadcast to all clients in the room. Used for lightweight UI cues (e.g., MiniRoster status). Persistence is planned but not required for core flow.
    - Own-only write policies (insert/update/delete).
    - Read policies allow:
      - Own rows; and
      - Any participant in the same room via `public.session_players`.

- **Round scoreboard RPC**: `public.get_round_scoreboard(p_room_id text, p_round_number int)`
  - Returns: `[{ user_id, display_name, score, accuracy, xp_total, xp_debt, acc_debt, distance_km, guess_year }]`
  - Authorization: only room participants (checked against `session_players`).
  - Sorting: by `score DESC`, tie-breaker `accuracy DESC`.

- **Final scoreboard RPC**: `public.get_final_scoreboard(p_room_id text)`
  - Returns aggregated per-player totals across all rounds in the room: `[{ user_id, display_name, total_score, total_xp, total_xp_debt, net_xp, rounds_played, avg_accuracy, net_avg_accuracy }]`.
  - Authorization: only room participants.
  - Sorting: by `net_xp DESC`, then `total_score DESC`, then `avg_accuracy DESC`.

- **Migrations**:
  - File: `supabase/migrations/20250818_create_session_players.sql` — Creates `public.session_players` and RLS policies. Must be applied before scoreboard RPCs. This file is idempotent and exists to ensure correct ordering when using CLI chronological application.
  - File: `supabase/migrations/20250819_update_round_results_and_scoreboard_rpcs.sql` — Updates `public.round_results` schema and defines scoreboard RPCs; depends on `public.session_players`.
  - Note: An original `20250820_create_session_players.sql` may also exist; `20250818_create_session_players.sql` duplicates it with guards so that CLI ordering is correct. When applying manually (SQL editor), always run `20250818_*` first, then `20250819_*`.

### Hook: useRoundPeers (Room-Scoped Round Results)

- Location: `src/hooks/useRoundPeers.ts`
- Purpose: Fetch and subscribe to per-round peer results for a PartyKit room without changing any UI.
- API: `const { peers, isLoading, error, refresh } = useRoundPeers(roomId, roundNumber)`
- Row shape (`PeerRoundRow`): `{ userId, displayName, score, accuracy, xpTotal, xpDebt, accDebt, distanceKm?, guessYear?, guessLat?, guessLng?, actualLat?, actualLng? }`
- Data sources:
  - RPC `public.get_round_scoreboard(p_room_id, p_round_number)` for names and core metrics (score, accuracy, xp, debts)
  - Table `public.round_results` for lat/lng and per-round details (room-scoped RLS ensures only participants can read)
- Realtime: Subscribes to Postgres changes on `public.round_results` filtered by `room_id` and re-fetches when rows for the same `round_index` change
- TypeScript note: Until generated DB types include RPCs/tables, the hook casts `supabase` to `any` for `.rpc`/`.from` calls to avoid type errors.

 - Fix (2025-08-20): Preserve zero coordinates. The lat/lng merge in `useRoundPeers.ts` uses nullish coalescing (`??`) instead of `||` so valid `0` values are not coerced to `null`. Path: `src/hooks/useRoundPeers.ts`.
 - Persistence source-of-truth: `src/contexts/GameContext.tsx` → `recordRoundResult()` writes to `public.round_results` including `room_id` and 0-based `round_index` (computed as `roundNumber - 1` from the 1-based UI). This ensures RPCs and realtime filters align with DB indexing.

## Multiplayer Session Provider (Plan)

- Location (planned): `src/contexts/MultiplayerSessionProvider.tsx` (no UI components)
- Responsibilities:
  - Manage PartyKit lobby socket lifecycle and message handling (`hello`, `roster`, `settings`, `start`, `progress`).
  - Expose state: `you`, `roster`, `progressByUser`, `timer`, `connection`.
  - Actions: `setReady`, `sendChat`, `sendProgress`, `setTimer (host)`, `disconnect`.
  - Persist lightweight session data to Supabase: `public.session_players`, `public.session_progress` (debounced, best-effort).
  - Provide read helpers for `fetchRoundScoreboard` and `fetchFinalScoreboard` from `integrations/supabase/scoreboards.ts`.
- Workflow with detailed steps: `.windsurf/workflows/implement-multiplayer-session-provider.md`.

## UI/UX Consistency Rules

- Fullscreen images default to 100% zoom (zoom=1). See `src/components/layouts/FullscreenZoomableImage.tsx`.
- On round results:
  - In `When` card, the year after "Your guess:" is white in dark mode and dark gray in light mode (`text-gray-900 dark:text-white`). Implemented in `src/components/layouts/ResultsLayout2.tsx` and `src/components/results/TimeAccuracyCard.tsx`.
- Source and Rate buttons use background `#444444` with white text across themes for consistency.
    - Source button in `ResultsLayout2.tsx` uses `bg-[#444444]` and matching border/hover.
    - Rate button in `RoundResultsPage.tsx` uses `bg-[#444444]` and matching border/hover.
- Game page controls:
  - When exiting fullscreen on the image, the `When?` and `Where?` labels perform a 1s typewriter animation in orange, then revert to the normal label color (white in dark mode, dark gray in light). There is no card ring/pulse on initial reveal. Implemented in `src/components/layouts/GameLayout1.tsx` with local `titlesAnimating`, `whenAnimIndex`, and `whereAnimIndex` state.
  - The Hints button in the bottom action bar is compact with a `HelpCircle` icon and a small count chip (e.g., `3/14`).
  - After the user clicks Submit Guess and before navigation, a full-screen loading overlay appears with a spinner and the text "Preparing results...". Implemented in `src/components/layouts/GameLayout1.tsx` using local `isSubmitting` state set in `handleSubmitGuess()`.

### Where Map — Guess vs Actual Visualization (2025-08)

- Files:
  - `src/components/map/ComparisonMap.tsx` — renders guess/actual markers and the connection line
  - `src/components/map/MapMarker.tsx` — centered DivIcon markers used on comparison map
- Line style:
  - Uses Leaflet `Polyline` with `pathOptions: { color: '#000000', weight: 2, dashArray: '5 5' }`
  - Non-interactive (pure visual) so user cannot click it
- Marker anchors:
  - Markers are Leaflet `DivIcon`s with `iconSize = [24,24]` and `iconAnchor = [12,12]` so the connection line attaches to the visual center
  - Pulse affordance uses Tailwind animation class toggled by the `pulse` prop
- Debugging:
  - In dev builds only, `ComparisonMap` logs guess/actual lat/lng and Haversine distance via `calculateDistanceKm()` from `src/utils/gameCalculations.ts`
  - This aids verification of distance scoring and visual line endpoints

### Button Border Radius Standard (2025-08)

- __Default__: All buttons use Tailwind `rounded-md` (0.375rem) for a consistent look across the app. The shared Button component (`src/components/ui/button.tsx`) already defaults to `rounded-md`.
- __Do not override__: Avoid adding explicit `rounded-*` classes on buttons unless a true exception is required. Rely on the shared Button default.
- __Exceptions__ (allowed):
  - Circular avatar/menu triggers and avatar images may use `rounded-full` (e.g., `src/components/navigation/MainNavbar.tsx`, `src/components/NavProfile.tsx`).
  - Non-button chips/pills may use `rounded-full` as part of their design; this standard targets buttons only.
- __Recent updates__: Replaced explicit `rounded-lg` on buttons with `rounded-md` in `src/components/layouts/GameLayout1.tsx` and `src/components/HintModalV2New.tsx`.

## Game Round Validation and Alerts

- **No default year selected**
  - `selectedYear` is `number | null` in `src/pages/GameRoundPage.tsx` and `src/components/layouts/GameLayout1.tsx` (`GameLayout1Props`).
  - `YearSelector` in `src/components/game/YearSelector.tsx` accepts `number | null`. Before first interaction, `GameLayout1` passes `null` so the inline year input shows empty while the slider renders without committing a value.
  - `GameLayout1` tracks `yearInteracted` to avoid syncing a year into the inline input until the user interacts.

- **Disabled Submit feedback (GameLayout1.handleDisabledSubmitClick)**
  - Neither year nor location: triggers both card highlights and shows both inline alerts.
  - Location only: highlights the `Where?` card and shows red inline "You must guess the location" in place of the placeholder.
  - Year only: highlights the `When?` card and shows red inline "You must guess the year" in place of the placeholder.
  - Delivery: card-specific 1s highlight ring + pulse (`ring-2 ring-orange-500 animate-pulse`) via `highlightWhen`/`highlightWhere`. Inline alerts use `showYearAlert`/`showLocationAlert` to replace the respective header placeholders. Alerts clear automatically when the corresponding input becomes valid.

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

## Room Invites (Schema + RLS) — 2025-08-23

- **Purpose**: Track host-initiated friend invites for a given PartyKit room.
- **Migration file**: `supabase/migrations/20250823_create_room_invites.sql`
- **Types file**: `integrations/supabase/types.ts` (table `room_invites`)

- **Table**: `public.room_invites`
  - Columns:
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `room_id TEXT NOT NULL`
    - `inviter_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
    - `friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Indexes:
    - Unique: `(room_id, inviter_user_id, friend_id)`
    - Non-unique: `(room_id)`, `(inviter_user_id)`, `(friend_id)`

- **RLS**: Enabled with the following policies
  - `ri_select_inviter`: authenticated users can SELECT rows where `inviter_user_id = auth.uid()`
  - `ri_select_invited`: authenticated users can SELECT rows where `friend_id = auth.uid()`
  - `ri_insert_inviter`: authenticated users can INSERT only when `inviter_user_id = auth.uid()`

- **Notes**:
  - The `friend_id` foreign key references `public.profiles(id)` and is reflected in generated TS types. The `inviter_user_id` FK references `auth.users(id)` (not represented as a relational mapping in our local TS types).
  - This table is intended for secure invite flows; only the inviter can create or cancel invites, and both inviter and invited can read relevant rows.
  - Apply the migration using `scripts/apply-migrations.ts` once `SUPABASE_DB_URL` is configured.

  
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
  - Zoom is disabled in fullscreen (no wheel, double-click, pinch, or double-tap).
  - Panning is enabled at base zoom; offsets are clamped within bounds.
  - Hint text shows "Drag to pan"; the zoom percentage badge is hidden.

### First-open Auto-pan (Guided Motion)

- Component: `src/components/layouts/FullscreenZoomableImage.tsx`
- Behavior: On the first time an image opens in fullscreen for a given round, a preview auto-pan occurs. Behavior matches the selected `inertia_mode`:
  - `swipes` — sweep left→right once and stop at the edge.
  - `swipes_recenter` — sweep left→right, then return to center.
  - `none` — no auto-pan.
- One-time logic: A session-scoped registry keyed by `${currentRound}::${image.url}` ensures the auto-pan runs only once per round/image and not on subsequent manual fullscreen toggles.
- Cancellation: Any user interaction (pointer down/drag, touch, or wheel) cancels the motion immediately.
- Implementation notes:
  - Uses `requestAnimationFrame` with an ease-in-out curve; while auto-panning, CSS transform transitions are disabled for smooth motion.
  - Auto-pan only runs when there is horizontal overflow (computed via `getMaxOffsets().maxX > 1`).

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
  - Client→Server: `join { name }`, `chat { message, timestamp }`, `ready { ready: boolean }`, `settings { timerSeconds?: number, timerEnabled?: boolean }`
  - Server→Client: `players { players: string[] }`, `roster { players: { id, name, ready, host }[] }`, `chat { from, message, timestamp }`, `full`, `start { startedAt, durationSec, timerEnabled }`

### Deterministic Images in Multiplayer

- All players see the same images in the same order for a given room.
- The server emits `start { startedAt, durationSec, timerEnabled }`. The client derives a deterministic UUID v5 seed from `roomId` and `startedAt` and passes it to `GameContext.startGame()`:
  - Seed derivation (npm `uuid`): `uuidv5(`${roomId}:${startedAt}`, uuidv5.URL)`
  - Supabase RPC expects a UUID: `create_game_session_and_pick_images(p_count int, p_user_id uuid, p_room_id text, p_seed uuid)` and persists `seed` as text in `public.game_sessions.seed`.
- `GameContext.startGame()` calls `getOrPersistRoomImages(roomId, seed, count)` which:
  - If `public.game_sessions` has a row for `room_id`, returns those `image_ids` in stored order.
  - Else, computes a seeded order from `images` (stable base order by `id`), upserts the record, and returns the first N.
- Table: `public.game_sessions (room_id text pk, seed text, image_ids text[], current_round_number integer not null default 1, started_at timestamptz)` with RLS for authenticated users. The `seed` and `image_ids` are nullable to allow for updates that only modify the round number.
- Solo games continue to use per-user no-repeat selection via `getNewImages()` and local shuffle.
 
## Badges and Profiles Schema — 2025-08

- __Badges table__: `public.badges`
  - Columns: `id uuid pk default uuid_generate_v4()`, `name text`, `description text`, `icon_name text`, `category text`, `difficulty text`, `requirement_code text`, `requirement_value integer`, `image_url text`, `created_at timestamptz default now()`.
  - Migration: `supabase/migrations/20250615_add_missing_tables.sql`.
  - RLS: enabled; anyone may SELECT; INSERT/UPDATE/DELETE allowed only to authenticated users with admin role via `auth.jwt() ->> 'role' = 'admin'`.

- __Profiles earned badges__: `public.profiles.earned_badges uuid[] default '{}'`
  - Added in `20250615_add_missing_tables.sql` and ensured in `20250811160000_core_schema_fixes.sql`.
  - Reflected in TS types: `src/integrations/supabase/types.ts` → `profiles.Row.earned_badges: string[] | null`.

- __Client badge service__:
  - Path: `src/utils/badges/badgeService.ts`.
  - Responsibilities: fetch badges (`from('badges').select('*')`), read/update `profiles.earned_badges`, evaluate and award badges.

- __Notes__:
  - Badge modifications must respect admin-only RLS policies.
  - Ensure the above migrations are applied before using badge features.

## Game Preparation (Atomic RPC + Preload Hook) — 2025-08-17

- Backend RPC: `create_game_session_and_pick_images` defined in `supabase/migrations/20250817_create_game_prep_rpc.sql`.
  - Picks ready images excluding recently played by the current user.
  - When `room_id` is provided, persists deterministic image order to `public.game_sessions` and returns that same order.
  - Accepts optional `p_seed`; if omitted, DB default seed is used.
  - On `INSERT`, if a `room_id` already exists (conflict), it resets `current_round_number` to 1, ensuring a fresh game state.
- Hook: `src/hooks/useGamePreparation.ts`
  - Exports `useGamePreparation()` returning `{ prepare, abort, status, error, progress: { loaded, total } }`.
  - `prepare({ userId, roomId?, count, seed? })` calls the RPC, fetches image metadata in one query, resolves public URLs, eagerly preloads and decodes images, and tracks progress.
  - `PrepStatus` union: `'idle' | 'selecting' | 'fetching' | 'preloading' | 'done' | 'error'`.
- Context exposure (no UI dependency): `src/contexts/GameContext.tsx`
  - Adds fields for future UI:
    - `prepStatus: PrepStatus`
    - `prepProgress: { loaded: number; total: number }`
    - `prepError: string | null`
    - `abortPreparation(): void`
  - These mirror the hook and are updated during `startGame()` preparation flow.
- UI note: Do not implement UI here; progress is exposed for future fullscreen progress modal.

### Preparation Overlay UI — 2025-08-17

- Component: `src/components/game/PreparationOverlay.tsx`
  - Fullscreen modal shown during preparation (`selecting`, `fetching`, `preloading`) and on `error`.
  - Reads from `GameContext`:
    - `prepStatus`, `prepProgress { loaded, total }`, `prepError`, `abortPreparation()`
    - `preparedImages: Array<{ url: string; title?: string; ... }>`
    - `preparedLoadedIndices: Set<number> | number[]` — indices that have finished preloading/decoding
  - Mobile-first fullscreen modal with fixed panel width `min(92vw, 520px)`.
  - Title updated to “Preparing your game…”.
  - Accessibility: adds an ARIA live region (polite) that announces preparation status and image counts.
  - Error UI: shows the error message and offers Retry (invokes `startGame(...)` with current settings) and Cancel (calls `abortPreparation()` and navigates to `/test`).

  - Progress UI redesign:
    - Replaces linear bar with a fixed 5-segment progress indicator.
    - Segments filled based on `prepProgress.loaded / prepProgress.total` clamped to 0..5.
    - Always renders 5 segments to avoid layout jumps.

  - Mini-cards row:
    - Always renders 5 fixed-size cards (`aspect-[4/3]`, grid of 5) to prevent layout shifts on mobile.
    - Each card starts as a skeleton shimmer (animated pulse gradient).
    - When the corresponding index is present in `preparedLoadedIndices`, replaces the skeleton with the actual image from `preparedImages[i].url`.
    - Uses `object-cover` so previews remain stable.

  - Implementation notes:
    - Type-safe helper in the component normalizes `preparedLoadedIndices` whether it is a `Set<number>` or `number[]`.
    - The live announcement reads: “Preparing your game. X of Y images ready.” and falls back to phase-specific messages when counts are unknown.
    - Layout uses stable dimensions and avoids content shifts while images load.
- Global mount point: `src/App.tsx`
  - Inside `<GameProvider>` and before `<Routes>` to overlay all routes during preparation.
  - Import path: `import PreparationOverlay from "@/components/game/PreparationOverlay";`
  - Rendered once globally: `<PreparationOverlay />`.
- Dependencies: `src/components/ui/progress.tsx`, `src/components/ui/button.tsx`, `lucide-react` icons.
- Accessibility: uses `role="dialog"` and `aria-live="polite"` for status updates.

### Seamless Guest Login → Preparation Overlay (2025-08-17)

- Goal: Show `PreparationOverlay` immediately after clicking "Continue as guest" on the landing page, without intermediate screens or full reloads.
- Files:
  - `src/components/AuthModal.tsx`
    - `handleGuestLogin()` now:
      - Calls `continueAsGuest()`.
      - Closes the modal immediately via `onClose()` so the UI can re-render.
      - Triggers `onGuestContinue()` asynchronously (without `await`) so `PreparationOverlay` can appear instantly.
      - Fallback (no `onGuestContinue`): SPA navigation using `useNavigate()` to `'/test'` (replaces `window.location.replace`).
  - `src/pages/LandingPage.tsx`
    - Passes `onGuestContinue={() => startGame?.()}` to `AuthModal`; `startGame()` handles prep and navigation internally.
    - Uses React Router SPA navigation (`useNavigate`) for redirects in `onAuthSuccess` and the authenticated guard effect.
    - Authenticated redirect guard: only redirects to `/test` when `user` is set, the auth modal is closed, `images.length === 0`, and `isLoading` is false to avoid racing with `startGame()`.
  - `src/App.tsx`
    - `PreparationOverlay` is mounted once globally inside `GameProvider` and before `Routes`.

- Behavior:
  - Clicking "Continue as guest" authenticates anonymously, immediately closes the modal, and triggers `startGame()` asynchronously.
  - `GameContext` updates `prepStatus` which makes `PreparationOverlay` visible right away; when prep completes, `startGame()` navigates to the game route.
  - No full page reloads are used in this flow.

## UI Adjustments: Game & Round Results (2025-08)

### Slider Thumb Styling — Home & Game (2025-08-24)

- **Component**: `src/components/ui/slider.tsx` (Shadcn/Radix Slider wrapper)
- **Change**: Slider thumb uses orange (`bg-orange-500` with `border-orange-500`) and a semi-transparent orange halo via `after:bg-orange-500/50` to match the native `.time-slider` style used in the Room page.
- **Scope**: Applies anywhere the shared `Slider` is used, including `src/pages/HomePage.tsx`, `src/components/game/GameSettings.tsx`, and `src/components/game/YearSelector.tsx`.
- **Track/Range**: Track stays neutral; filled range is hidden (`<SliderPrimitive.Range className="hidden" />`) to avoid a trailing colored line.

- Game page
  - `src/components/navigation/GameOverlayHUD.tsx`: Centered score badges in top overlay; hide Home button on mobile.
  - `src/components/layouts/GameLayout1.tsx`: Mobile Home button moved to the bottom navbar (removed from the When card); pushed `YearSelector` to card bottom; set When/Where icons to light grey; restored 1s highlight animation on exit fullscreen.
  - `src/components/layouts/GameLayout2.tsx`: Set When/Where icons to light grey.
  - 2025-08-14 refinements:
    - `src/components/layouts/GameLayout1.tsx`: Tightened When card height (`min-h` reduced), inline year input is always visible with an underline even before selection; widened to `~6ch` with padding to avoid digit clipping; Submit Guess is disabled until both year and location are selected; desktop and mobile Home buttons use black text on `#999999` background.
    - `src/components/game/YearSelector.tsx`: `selectedYear` is optional; when `null/undefined`, the knob is centered (midpoint) without setting a default year; `onChange` only fires on user interaction.
    - `src/components/game/LocationSelector.tsx`: Map container made flexible (`flex-1 min-h-[300px]`) so the map is visible on mobile and grows on desktop.
    - Disabled Submit feedback: Clicking the disabled Submit animates the missing input's card with a 1s orange ring and pulse, and shows inline red alert text in place of the placeholder in that card’s header — “You must guess the year” or “You must guess the location”. Implemented in `src/components/layouts/GameLayout1.tsx` using `highlightWhen`/`highlightWhere`. Alerts clear automatically when the corresponding input becomes valid.

- Round Results page
  - `src/components/results/ResultsHeader.tsx`: Round text weight set to normal.
  - `src/components/layouts/ResultsLayout2.tsx`: Progress bars are placed at the bottom of the When/Where cards; % and XP badges appear directly below the progress bars; reduced spacing under "Your Score"; labels (Accuracy/Experience) moved above values; matched "Your guess" styling to "Correct:"; removed in-layout bottom Next Round buttons.
  - `src/components/results/HintDebtsCard.tsx`: Removed border; maintain dark background.
  - `src/components/results/HintDebtsCard.tsx`: Accuracy penalty shows only `-{accDebt}%` on the right side.
    - Hint penalties now show the hint answer as the left label (instead of the hint title). Examples: `10 years`, `120 km`.
    - Preferred source is the debt's numeric `label`. If missing or non-numeric, we fall back to the round's `yearDifference` (years) or `distanceKm` (km) provided by `ResultsLayout2`. If neither is available, we display a readable label or mapped title.
    - If the debt `label` looks like an ID/UUID, we render a human label from `HINT_TYPE_NAMES` as a last resort.
  - `src/pages/RoundResultsPage.tsx`: Made top Next Round button more compact (kept rounded-xl per standard).
  - `src/components/layouts/ResultsLayout2.tsx`: On desktop (`lg+`), the Home button (and any extra buttons) are rendered in a desktop-only container placed after/below the Hint Penalties/Debt card. On mobile/tablet, the Home button remains in the bottom action bar (unchanged).
  - 2025-08-14 spacing/style harmonization:
    - `src/components/layouts/ResultsLayout2.tsx`: Reduced space between "Your Score" and penalties (mb-1). Set When/Where titles to regular weight. Added spacing between titles and content. Added extra space above the "Correct" rows in When (`mt-4`). Moved progress bars to the bottom of each card with `mt-4`, and placed %/XP badges directly below those bars. Ensured event year and guessed year use the same font-size.
    - `src/pages/RoundResultsPage.tsx`: Home button uses black text on `#999999` background (hover `#8a8a8a`).

- Final Results page
  - `src/pages/FinalResultsPage.tsx`: Removed the two mini cards for Time Accuracy and Location Accuracy under the detailed metrics grid. Kept Avg Years Off, Avg Km Away, Hints Used, and Penalty Cost.
  - `src/components/RoundResultCard.tsx`: Replaced the orange selected-value badge under the image title with plain orange text (no background) to simplify the look on breakdown cards.
  - `src/pages/FinalResultsPage.tsx`: Footer Home button matches the Game page Home button styling — `rounded-full`, `text-black`, `border-none`, rainbow gradient background `bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)]`, and `hover:opacity-90`.
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
  - Removed exit-fullscreen card highlight. Instead, added a one-time 1s typewriter animation for the “When?” and “Where?” labels (orange while typing, then normal color).
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

#### Hints Modal — Spacing + Numeric Text (2025-08-16)

- Vertical spacing harmonized in `src/components/HintModalV2New.tsx`:
  - Header uses `pt-4 pb-3 px-4`; subtitle uses `mt-1`.
  - Summary pills, segmented control, and hint list each use `mt-3` with consistent internal padding.
- Purchased hint details render numeric penalties inline only when the hint text is digits-only and the type maps to a numeric unit:
  - Years: `*_event_years` → “years off”.
  - Distance: `*_landmark_km` → “km away”.
  - Value source: the hint’s own `text` field when purchased; numbers are formatted via `formatInteger()`.
  - Non-numeric texts remain unchanged (no unit appended).
  
  - Wrapping & sub-hint descriptions (2025-08-16)
    - Answer/description text now wraps within the modal to avoid overflow beyond modal width: `whitespace-normal break-words` replaces `truncate`.
    - For unpurchased numeric sub-hints, the description differs from the button label above:
      - Years offset sub-hints show: “Years from the chosen event”.
      - Distance sub-hints show: “Distance from the chosen landmark”.
    - Implemented in `src/components/HintModalV2New.tsx` by inspecting `hint.type` to detect numeric units and rendering contextual copy.

### Hint Modal V2 — Ordering, Descriptions, Mobile Layout (2025-08-17)

- __Files__
  - Ordering/UI: `src/components/HintModalV2New.tsx`
  - Copy/types: `src/constants/hints.ts`

- __Ordering__
  - `whenOrder` and `whereOrder` arrays in `HintModalV2New.tsx` define the exact rendering order.
  - Any unknown types are appended in a stable order by `level` then `type`.

- __Per-type descriptions__
  - `HINT_TYPE_DESCRIPTIONS` in `src/constants/hints.ts` provides unique copy per type (e.g., remote vs nearby, km vs years).
  - Component prefers `HINT_TYPE_DESCRIPTIONS[type]` first, then falls back to numeric unit strings or `HINT_LEVEL_DESCRIPTIONS`.

- __Mobile layout safety__
  - Modal container uses `min-h-[100dvh]` to account for mobile dynamic toolbars.
  - Header/footer are `position: sticky` with `z-10` and safe-area padding:
    - Header: `style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}`
    - Footer: `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}`
  - Scrollable content adds bottom padding (`pb-28`) to avoid being covered by the sticky footer CTA.
  - Ensures the title ("HINTS") is always visible and the "Continue Guessing" button is fully tappable on iOS/Android.

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

  - Mobile year input wrapping (2025-08-16)
    - File: `src/components/layouts/GameLayout1.tsx`
    - Header row now allows wrapping: container uses `flex flex-wrap` with `gap-x-2 gap-y-1` to avoid truncation.
    - Title can shrink: `h2` gets `min-w-0` so text can truncate gracefully without forcing overflow.
    - Year input takes full row on mobile: `basis-full w-full` with `mt-1`; on `md+`, it reverts to inline via `md:basis-auto md:w-[14ch]` (or `md:w-[26ch]` when alerting).
    - Alignment: `text-left` on mobile, `md:text-right` on larger screens. Margins: `ml-0 md:ml-auto`.
    - Prevent shrink on larger screens: `md:shrink-0` keeps the fixed `ch` width from collapsing.
     - Result: placeholder "Choose a year" remains fully visible on small screens and never clips.
     - Right-edge alignment: On desktop, the inline year input’s right edge aligns with the `Where?` placeholder/text by matching right padding with the `Where` label (`pr-1`). The input classes changed from symmetric `px-2` to `pl-2 pr-1`, keeping `md:ml-auto md:text-right` for alignment. File: `src/components/layouts/GameLayout1.tsx`.

#### Recent refinements (When/Where, Hints, Mobile Home)

- Year visibility and styling
  - File: `src/components/layouts/GameLayout1.tsx`
{{ ... }}
  - Behavior: the inline year is hidden until the user first moves the slider.
  - State: `yearInteracted` toggled by `YearSelector.onFirstInteract()`.
  - Styling: when shown, year input uses orange text (`text-orange-400`) for emphasis.
- `YearSelector` interaction hook
  - File: `src/components/game/YearSelector.tsx`
  - Added optional prop `onFirstInteract?: () => void` fired on the first slider move; debounced with a ref to only fire once.
- Hints button styling and count
  - Files: `GameLayout1.tsx` (desktop action row and mobile bottom navbar)
  - Style: rainbow gradient button (same gradient as the previous Home button) with black text; inline black pill displays `{used}/14` hints.
  - Home buttons now use a plain white background with black text (`bg-white hover:bg-gray-100 text-black`) on both desktop and mobile.
  - Example: `<span class="... bg-black text-white ...">{purchasedHints.length}/14</span>`.
 - Hints modal layout and theming
   - File: `src/components/HintModalV2New.tsx`
   - Overall background: black (`DialogContent` + `DialogHeader` use `bg-black`).
   - Inner surfaces: dark gray cards and controls (`bg-[#202020]`, hint rows `bg-[#333333]`).
   - Close button: orange, circular icon button at top-right; ~2.67rem size with ~2.66rem X icon for visibility (`bg-orange-600 hover:bg-orange-700`).
- Submit prompt behavior
  - File: `src/components/layouts/GameLayout1.tsx`
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

- Segmented control (When/Where) spans full card width; both tabs use equal widths (`flex-1`).
- In dark theme, the active tab uses black text on white background (`bg-white text-black`).
- For unpurchased hints, a short description appears under the title using `HINT_LEVEL_DESCRIPTIONS[hint.level]`.
 - All buttons in the modal use a consistent 0.5rem radius (`rounded-lg`), including the tab buttons, hint buttons, close (X), and the bottom "Continue Guessing" and dialog "OK" buttons.
 - The header helper text "Using a hint will reduce your score." is reduced by one size step (`text-sm`) and spacing to the summary card beneath is tightened (top margin removed) for better distribution.
- Lock image removed. For locked hints, a red message “You must first use the hint above” is only shown after the user clicks the locked row; the button remains non-purchasable and shows `cursor-not-allowed` styling.
- Red warning under title: “Using a hint will reduce your score.”
- Penalty values (badges and buttons) shown in red/blue chips (accuracy green, XP blue).
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
  - Exit fullscreen button size increased by ~25% for accessibility in `src/components/layouts/FullscreenZoomableImage.tsx`:
    - Button: from `w-12 h-12` (48×48) to `w-[60px] h-[60px]` (60×60)
    - Icon: from `w-6 h-6` (24×24) to `w-[30px] h-[30px]` (30×30)
    - Placement: fixed bottom-center with semi-transparent orange background and subtle `attentionPulse` animation.

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
  - Touch/focus halo: a semi-transparent orange halo renders via a pseudo-element and appears on `:focus-visible` and `:active`.

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
  - Added a Home icon button that navigates to `/`.
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

## Home Page Guest Overlays — Lock + Sign-In

- Files: `src/pages/HomePage.tsx`
- Change:
  - Added semi-opaque overlays with lock icon and warning text to both `COLLABORATE` and `COMPETE` cards when the user is signed out or a guest (`!user || isGuest`).
  - Overlay uses `bg-white/80 dark:bg-black/80` and `z-[100]` to sit above card content.
  - Sign-in button style updated to white background with black text: `bg-white hover:bg-gray-100 text-black`.
- Behavior:
  - `COMPETE`: clicking "Sign In" triggers existing `handleStartGame('friends')`, which opens auth for guests.
  - `COLLABORATE`: clicking "Sign In" opens `AuthModal` directly.
- Rationale: Clear affordance that multiplayer modes require authentication; consistent button styling.

## Game Page When/Where Alignment — Remove Year Underline

- File: `src/components/layouts/GameLayout1.tsx`
- Change:
  - Year input in the `When?` header: removed underline (dropped `border-b` classes) and right-aligned the text (`text-right`).
  - Preserved dynamic states: placeholder shows gray/italic until interaction; selected year shows orange/semibold.
  - Result: Visual alignment with the `Where?` header value, cleaner header without an underline.

## Hints Modal — V2 Design

- File: `src/components/HintModalV2New.tsx`
- Layout:
  - Header title "HINTS" with subtle italic subtitle "Using a hint will reduce your score."
  - Summary strip shows total penalties with pill badges: Accuracy in green, XP in blue.
  - Segmented control to switch between `When` and `Where`.
  - Single-column list for the active tab. Each row:
    - Left: hint label (capitalized).
    - Right: two rounded badges — green percent and blue XP — both display a leading minus sign.
    - Purchased hints turn the row solid green and show the revealed text below the label.
    - Locked hints show a centered lock overlay with the message “You must first use the hint above”.
- Behavior:
  - Negative signs are always rendered for both accuracy and XP: e.g. `-15%`, `-50 XP`.
  - Clicking a row purchases the hint unless it is purchased/locked.

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


## Landing Page — Global Scores Removed

- File: `src/pages/LandingPage.tsx`
- Change:
  - Removed global Accuracy and XP badges from the top-left of the fixed header on the landing page.
  - Deleted the badge block and related imports (`Badge`, `Award`, `Target`, `formatInteger`).
  - Stopped destructuring/using `globalXP`, `globalAccuracy`, and `fetchGlobalMetrics` from `useGame()` on this page.
  - Left header grid layout intact by rendering an empty left column (`<div class="col-start-1" />`).
- Rationale: Simplify the landing experience by removing scores from this page without affecting other pages.

## Auth Modal — Unified Layout and Styling

- File: `src/components/AuthModal.tsx`
- Purpose: Standardize the sign in/up modal layout and button styles.
- Header:
  - Title: "Welcome to Guess History" (no subtitle)
- Primary CTA (guest):
  - "Continue as guest" — orange button (`bg-orange-500 hover:bg-orange-600`, `rounded-xl`, white text) with `UserX` icon from `lucide-react`.
- Separator:
  - Centered divider text: `OR SIGN IN`
  - Subtitle below: "to track your progress and compete with others."
- Social:
  - "Continue with Google" — white button with black text (`bg-white text-black border`) and Google logo.
- Email forms:
  - Tabs: Sign In / Sign Up
  - Inputs: `email`, `password`
  - Sign In extras: `Remember me` checkbox (`@/components/ui/checkbox`) and "Forgot password?" text link.
  - Submit buttons: white with black text (`bg-white text-black border`) and `Mail` icon.
- Behavior:
  - Remember me controls session persistence: when checked, auth tokens are stored in `localStorage` with a persistent cookie; when unchecked, tokens use `sessionStorage` with a session cookie. Implementation uses the `auth.remember` flag read by `src/integrations/supabase/client.ts` custom storage adapter.
  - Forgot password sends a Supabase password reset email via `supabase.auth.resetPasswordForEmail(email)` using optional `VITE_AUTH_EMAIL_REDIRECT_TO` for the redirect target.
- Notes:
  - Business logic unchanged (uses `useAuth()` methods).
  - Icons from `lucide-react`; no new dependencies added.

## Auth Route Guard — RequireAuthSession

- File: `src/components/RequireAuthSession.tsx`
- Purpose: Prevent access to app routes when there is no Supabase session (fully signed-out). Allows both registered and anonymous (guest) sessions.
- Behavior:
  - Waits for `useAuth().isLoading` to finish, then:
    - If `user === null` → redirects to landing `/`.
    - Else renders nested routes via `<Outlet />`.
- Routing integration (in `src/App.tsx`):
  - Wrapped ALL routes except landing (`/`) under `<Route element={<RequireAuthSession />}>`.
  - Includes: `/play`, `/room/:roomCode`, all `/test/*`, and `/test/game/room/:roomId/final`.
  - Result: Visiting any non-landing route while signed-out redirects to `/`. Home (`/test`) can never be seen while logged out.
- Notes:
  - `ProtectedRoute` remains for additional protection of `/test/account` (blocks guests specifically).
  - No UI changes; this is routing-only.

## Geo Search — Nominatim + Fuzzy Fallback (2025-08-18)

- Overview:
  - The Where? input now uses a single Nominatim backend with a client-side fuzzy fallback powered by Fuse.js.
  - Debounced autocomplete, LRU + IndexedDB caching (7-day TTL), distance-aware ranking, and manual pin placement are supported.
  - The typed-year input behavior remains unchanged.

- Core Files:
  - Client components:
    - `src/components/game/LocationSelector.tsx` — integrates the new geo search, hides legacy map search (`showSearch={false}`), syncs selection to the map via `externalPosition`, and captures map center via `onCenterChange`.
    - `src/components/geo/GeoSearchInput.tsx` — debounced (350ms) suggest UI with spinner, keyboard nav, ARIA roles, and manual pin affordance.
    - `src/components/HomeMap.tsx` — accepts:
      - `showSearch?: boolean` (hide legacy search when false)
      - `externalPosition?: { lat: number; lng: number } | null` (parent-controlled marker)
      - `onCenterChange?: (center: { lat: number; lon: number }) => void` (feeds ranking distance)
  - Geo lib:
    - `src/lib/geo/types.ts` — `GeoHit`, `GazetteerEntry`, `LatLon` types
    - `src/lib/geo/normalize.ts` — normalization for case/diacritics
    - `src/lib/geo/haversine.ts` — km distance helper
    - `src/lib/geo/rank.ts` — `rank(hits, query, center?)` and `dedupe(hits)`
    - `src/lib/geo/nominatim.ts` — `fetchNominatim(query, signal?)`, `mapNominatim(rows)`, `withTimeout(p, ms)`; token-bucket limiter (capacity 3) with ~1 rps sustained
    - `src/lib/geo/cache/lru.ts` — in-memory LRU (default 100)
    - `src/lib/geo/cache/idb.ts` — `persistToIndexedDB(key, hits)`, `hydrateLRU(max)` with 7-day TTL trimming
    - `src/lib/geo/fuzzy/FuseEngine.ts` — lazy Fuse.js load and search over a local gazetteer
    - `src/lib/geo/suggest.ts` — orchestrates: hydrate cache → Nominatim (2.5s timeout) → fallback to fuzzy only on zero results → dedupe/rank → persist

- Assets:
  - `public/geo/gazetteer.json` — local gazetteer array used only for fuzzy fallback. Structure per entry:
    - `{ name, admin?, country, lat, lon, population?, altNames?: string[] }`
  - Empty array is acceptable (fallback effectively no-ops until populated); no mock data checked in.
  - Update process:
    - Source from a vetted dataset (e.g., Geonames, OSM extracts), prefilter to cities/towns POIs.
    - Keep size ~200–500 KB. Include only required fields above. Save to `public/geo/gazetteer.json`.
    - No build step required; file is fetched at runtime by `FuseEngine`.

- Behavior:
  - Primary search: Nominatim (1 rps sustained, 2.5s timeout). Errors/timeouts do not auto-fallback unless zero results.
  - Fallback: Fuse.js fuzzy search over the gazetteer only when Nominatim yields no results.
  - Ranking: combines exactness, population, and distance to current map center (if available via `onCenterChange`).
  - Caching: LRU in-memory and IndexedDB (7-day TTL) hydrate on load.
  - Manual pin: When no results, users can place a pin by clicking the map; reverse geocode flows as before.

- Dependencies:
  - `fuse.js` (runtime, dynamic import in `FuseEngine.ts`). Install with `npm i fuse.js`.
  - `lucide-react` already present for icons.

- Integration Notes:
  - Do not invent data. Populate `public/geo/gazetteer.json` from a vetted source (e.g., preprocessed Geonames) with the required fields only.
  - If a strict `User-Agent` is required for Nominatim policy compliance, introduce a minimal server proxy; browsers cannot set `User-Agent` headers.
  - Keep debounce/cancellation responsive. `GeoSearchInput` uses `AbortController` and clears timers on unmount.

## UI Updates — Home and Game Pages (2025-08-27)

- Home Logo image
  - File: `src/components/Logo.tsx`
  - Change: Replaced text logo with `<img src="/icons/logo.webp" />` inside the Link to `/test`.

- Home play cards
  - File: `src/pages/HomePage.tsx`
  - Center Solo card on mobile by padding the scroll container: `pl-[calc((100vw-13.5rem)/2)]` so the first snap-center card is visually centered.
  - Collaborate card icon now uses `/icons/collaborate.webp` (previously `/icons/symbol.webp`).

- Game overlay settings button removed
  - File: `src/components/navigation/GameOverlayHUD.tsx`
  - Removed the top-right on-image Settings button (desktop-only) to simplify the HUD.

- Bottom action bar updates (Game page)
  - File: `src/components/layouts/GameLayout1.tsx`
  - Renamed the bottom "Home" button to "Settings" on both desktop and mobile; it now opens the global settings modal.
  - Unified button styles (shape, size, font) across Settings, Hints, and Submit: rounded-md, 48px height (h-12), consistent font weights.
  - Standardized disabled Submit button to background `#444` with white text across all instances.
  - Passed `onNavigateHome` into the settings modal so the modal can navigate home when requested.

- Settings modal header/actions
  - File: `src/components/settings/GlobalSettingsModal.tsx`
  - Added a Home button at the top-left of the modal header (navigates to `/` or via injected `onNavigateHome`).
  - Bottom of the modal now only shows a Close button (removed the previous Home button from the footer).

Notes
- Assets referenced are in `public/icons/` and can be used directly with absolute paths (e.g., `/icons/logo.webp`).
- Ensure mobile and desktop views are tested for scroll-snap centering and unified button sizing.

### Profile — LevelProgressCard (2025-09-03)

- Component: `src/components/profile/LevelProgressCard.tsx`
- Purpose: Shows current level, total XP, overall accuracy, and best axis accuracy with progress bars toward the next level’s requirements.
- Integration: Rendered in `src/components/layouts/ProfileLayout1.tsx` inside the Stats tab, above `StatsTab`.

- Props
  - `profile: UserProfile | null`
  - `stats: UserStats`
  - `isLoading?: boolean`

- Data sources
  - Current level from `profile.level_up_best_level` (defaults to 1, clamped to 1..100).
  - Stats from `UserStats`: `avg_accuracy`, `time_accuracy`, `location_accuracy`, `total_xp`.
  - Constraints for the next level via `getLevelUpConstraints(nextLevel)` from `src/lib/levelUpConfig.ts`.

- Computation
  - `currentLevel = clamp(Number(profile?.level_up_best_level || 1), 1, 100)`.
  - `nextLevel = min(100, currentLevel + 1)`.
  - Accuracy inputs (clamped 0..100):
    - `overallAcc = stats.avg_accuracy`
    - `timeAcc = stats.time_accuracy`
    - `locAcc = stats.location_accuracy`
    - `bestAxis = max(timeAcc, locAcc)` with label "Time" or "Location".
  - Constraints:
    - `requiredOverallAccuracy`, `requiredRoundAccuracy`, `levelYearRange.start/end`, `timerSec` from `getLevelUpConstraints(nextLevel)`.
  - Progress percents (0..100, rounded):
    - `overallProgressPct = (overallAcc / requiredOverallAccuracy) * 100` (guarded for zero).
    - `roundProgressPct = (bestAxis.value / requiredRoundAccuracy) * 100` (guarded for zero).

- Display
  - Header shows "Level Up Progress" with "Next: Level {nextLevel}".
  - Summary cards: `Level {currentLevel}`, `Total XP` (formatted via `formatInteger`), `Overall Accuracy`, `Best Axis`.
  - Progress bars: Overall vs `requiredOverallAccuracy` and Best Axis vs `requiredRoundAccuracy` using `Progress` UI.
  - Footer note shows next level year range and timer seconds from constraints.

- Notes
  - This card is display-only. It reflects `levelUpConfig` requirements for the next level and does not change gameplay.
  - Pass/fail criteria for Level Up sessions are documented under Final Results sections; this card mirrors the requirement thresholds for user awareness.

### Navbar — Level Badge (2025-09-06)

- Component: `src/components/navigation/MainNavbar.tsx`
- Purpose: Show the user's current Level next to Global Accuracy and XP.
- Data source: `profiles.level_up_best_level` fetched via `fetchUserProfile(user.id)`.
- Behavior:
  - On mount and on `avatarUpdated`/`usernameUpdated` events, the navbar fetches the profile and sets:
    - `avatarUrl ← profile.avatar_image_url || profile.avatar_url`
    - `currentLevel ← clamp(Number(profile.level_up_best_level || 1), 1, 100)`
  - Renders a level badge (Medal icon) as `Lv {currentLevel}` to the left group beside Accuracy and XP.
  - No navigation is attached to the Level badge; XP badge continues to navigate to `/leaderboard` on click.

## Server-Authoritative Countdown Timer (2025-08-28)

- Overview
  - Timers are stored and enforced in Postgres. Clients read server deadlines and compensate for local clock skew.
  - Supports multiple independent timers keyed by `timer_id`, namespaced per user via composite PK `(user_id, timer_id)`.

- Database
  - Table: `public.round_timers`
    - Columns: `user_id uuid`, `timer_id text`, `started_at timestamptz`, `end_at timestamptz`, `duration_sec int`, `created_at`, `updated_at`
    - PK: `(user_id, timer_id)`
    - Indexes: `user_id`, `end_at`
    - RLS enabled with owner-only `SELECT/INSERT/UPDATE` (`user_id = auth.uid()`).
  - Trigger: `public.touch_updated_at()` updates `updated_at` on row updates.
  - RPCs (security definer):
    - `start_timer(p_timer_id text, p_duration_sec int)` → upsert for `auth.uid()`, server-computed `end_at`; returns `{ timer_id, end_at, server_now, duration_sec, started_at }`.
    - `get_timer(p_timer_id text)` → returns the same shape for `auth.uid()`.
  - Grants: `grant execute on function start_timer, get_timer to authenticated`.

- Client Code
  - Supabase client: `src/integrations/supabase/client.ts` (existing)
  - Timer utilities: `src/lib/timers.ts`
    - `startTimer(timerId, durationSec)` calls `start_timer` RPC.
    - `getTimer(timerId)` calls `get_timer` RPC.
    - Both return a `TimerRecord` with `server_now` for skew compensation and log under `[timers]`.
  - React hook: `src/hooks/useServerCountdown.ts`
    - Computes fixed server offset: `offsetMs = server_now - Date.now()`.
    - Tracks `remainingMs/remainingSec`, `expired`, `ready`, and runs an interval tick (default 250ms).
    - `autoStart` will call `startTimer` if the timer is missing (requires `durationSec`).
    - Invokes `onExpire` exactly once when remaining time reaches 0.
  - Optional UI: `src/components/Timer/Countdown.tsx`
    - Minimal renderer that uses `useServerCountdown`. Accepts `render` prop for custom display.

- Usage Notes
  - Persist timer by calling `startTimer(timerKey, durationSec)` when a round begins (e.g., host broadcast or solo start).
  - Always render client countdown via `useServerCountdown({ timerId: timerKey })`; never trust local clocks.
  - Multiple timers per user are supported via distinct `timerId` keys (e.g., `round:room123:1`).

- Verification
  - Refresh the page mid-round: remaining time should continue from the server deadline.
  - Change local system clock: countdown remains accurate due to server offset.
  - RLS: authenticated user can only access their own timers; other users get no rows.
  - Multi-timer: start two different `timerId`s and verify independence.

- Migrations
  - Files (under `supabase/migrations/`):
    - `20250828112930_round_timers_01_table.sql`
    - `20250828112931_round_timers_02_policies.sql`
    - `20250828112932_round_timers_03_trigger.sql`
  - `20250828112933_round_timers_04_rpcs.sql`
  - `20250828112934_round_timers_05_grants.sql`
  - Apply with: `SUPABASE_DB_URL=... npx tsx scripts/apply-migrations.ts`

## Timer (Local Persistent) — 2025-09-03

- __Routes__ (public, no auth): defined in `App.tsx`
  - `/timer` → input page
  - `/timer/run` → first countdown
  - `/timer/next` → second countdown
  - `/timer/done` → completion

- __Files__ (source of truth under `src/timer/`)
  - `config/timerConfig.ts` — constants (`STORAGE_KEY`, `MAX_SECONDS`, `DRIFT_WARN_SECONDS`) and types (`TimerSessionV1`, phases `run|next`).
  - `utils/time.ts` — `parseInputToMs()` (seconds or `mm:ss`) and `formatMs()` → `mm:ss`.
  - `utils/storage.ts` — `loadSession`, `saveSession`, `clearSession`, `createSession` using `localStorage[TIMER_CONFIG.STORAGE_KEY]` with runtime validation.
  - `hooks/useCountdown.ts` — headless countdown; computes `remainingMs` from `Date.now() - startAt`, 200ms tick, drift warning, `onFinished`.
  - `pages/MainPage.tsx` — timer input; validates, saves session with `phase='run'`, navigates to `/timer/run`.
  - `pages/RunPage.tsx` — runs first countdown, manual Next/Reset; auto → `/timer/next` when finished.
  - `pages/NextPage.tsx` — second countdown; auto → `/timer/done` when finished.
  - `pages/DonePage.tsx` — simple completion screen with Restart to `/timer`.

- __Behavior__
  - Input accepts integers (seconds) or `mm:ss`. Range: `1s..24h`.
  - Persistence via `localStorage`; session has `{ phase, durationMs, startAt, createdAt, version }`.
  - Countdown is derived from `now - startAt` to avoid drift; progress is `remainingMs / durationMs`.
  - Multi-tab sync: pages listen to `storage` events keyed by `TIMER_CONFIG.STORAGE_KEY`.
  - Auto-navigation at zero: `/timer/run` → `/timer/next` → `/timer/done`.
  - Manual actions: Next (on Run) advances immediately; Reset clears session and returns to `/timer`.

- __QA checklist__
  - Enter `90` and `01:30` → both parse to 90s; errors shown on invalid inputs.
  - Start on `/timer` → `/timer/run`; refresh mid-countdown → time continues correctly.
  - On finish, route auto-advances to `/timer/next`, then to `/timer/done`.
  - Next button on `/timer/run` immediately goes to `/timer/next` and re-seeds `startAt`.
  - Reset at any step clears session and returns to `/timer`.
  - Two tabs stay consistent (storage events cause re-read).

## Game Page — Local Independent Timer (2025-09-05)

- __Purpose__
  - Provide a game-page countdown that mirrors the `/timer` feature’s behavior (persistence, multi-tab sync, single on-expire), while being fully independent of the server-authoritative timer and the unified countdown hook.

- __Hook__
  - `src/gameTimer/useGameLocalCountdown.ts`
    - Headless hook that uses `src/timer/hooks/useCountdown.ts` for ticking and expiry detection.
    - Persists a timer session in `localStorage`, scoped per `timerId` (same shape as `/timer` session: `TimerSessionV1` from `src/timer/config/timerConfig.ts`).
    - Listens to `storage` events for the timer’s key to synchronize across tabs.
    - Uses an "ended" sentinel key to guarantee `onExpire` fires exactly once globally (dedupes across tabs/windows and refreshes).
    - Exposes explicit `start()` and `reset()` helpers; accepts `autoStart`, `durationSec`, `timerId`, and `onExpire`.

- __Integration__
  - `src/pages/GameRoundPage.tsx`
    - Replaces `useUnifiedCountdown` usage with `useGameLocalCountdown` for round play.
    - Gating simplified: local start does not depend on `user`; server refetch/hydration code paths are removed.
    - On expiry, calls the existing `handleTimeComplete()` to route to results. No UI changes were introduced.
    - UI contract remains the same: the page mirrors the hook state into existing props consumed by `GameLayout1`/`TimerDisplay` (external timer mode). `roundTimerSec` continues to represent the total duration; the display decrements based on the provided remaining time.

- __Behavioral Notes__
  - Timer resumes after refresh via persisted `{ startAt, durationMs }`.
  - Independent per `timerId`; multiple game timers can co-exist without interfering with the `/timer` routes or the server timer.
  - Multi-tab consistency is achieved through `storage` events; whichever tab starts/resets updates the others.

- __QA checklist__
  - Start a round, refresh mid-countdown: remaining time continues correctly.
  - Open a second tab on the same round: both tabs stay in sync (start/reset/expiry).
  - On expiry, `handleTimeComplete()` runs once (no duplicate navigations across tabs).
  - Switching between modes or navigating away does not leak countdown intervals (hook cleans up on unmount).

## E2E Testing (Playwright) — 2025-08-30
 
 - __Setup__
  - Dev dependency: `@playwright/test` in `package.json`.
  - Config: `playwright.config.ts` starts Vite dev server on `http://localhost:5173` and runs tests in Chromium/Firefox/WebKit.
- __Commands__
  - Install browsers: `npx playwright install`
  - Run tests: `npm run test:e2e`
  - Run tests UI: `npm run test:e2e:ui`
- __Test locations__
  - E2E specs live under `tests/e2e/`.
  - Final Results smoke test: `tests/e2e/final-results.spec.ts` validates the static test page at `pages/test/final/index.tsx` without UI changes.
- __Selectors policy__
  - Prefer accessible roles/text (e.g., headings, buttons). Avoid adding bespoke data attributes unless stability becomes an issue.
- __CI notes__
  - Retries enabled on CI; server is reused locally for speed.

### Image No-Repeat — played_images tracking (2025-09-08)

- __Goal__
  - Prevent users from seeing the same images across different games on the same account.

- __Storage__
  - Table: `public.played_images (user_id uuid, image_id uuid, played_at timestamptz default now(), primary key (user_id, image_id))`
  - Policies: select/insert own rows for `authenticated` users.
  - Migration source: `supabase/migrations/20250817_create_game_prep_rpc.sql`

- __Selection RPC__
  - `public.create_game_session_and_pick_images(p_count, p_user_id?, p_room_id?, p_seed?, p_min_year?, p_max_year?)`
    - Excludes images already present in `played_images` for `p_user_id`.
    - Solo/Level Up: called from `src/hooks/useGamePreparation.ts` with `p_user_id = user.id` (or `NULL` for guests), year bounds as provided.

- __Recording points__ (so subsequent games exclude these images)
  - File: `src/contexts/GameContext.tsx`
    - `startGame(...)`
      - Multiplayer deterministic path → after `setImages(preparedImages)` call: `recordPlayedImages(user?.id ?? null, preparedImages.map(i => i.id))`.
      - Solo path (RPC prepared) → after `setImages(preparedImages)` call: `recordPlayedImages(...)`.
      - Solo fallback (`getNewImages`) → after `setImages(mappedImages)` call: `recordPlayedImages(...)`.
    - `startLevelUpGame(level, ...)`
      - After `setImages(preparedImages)` call: `recordPlayedImages(...)`.

- __Guest behavior__
  - Guests without a Supabase user id use a small local history in `localStorage` (see `src/utils/imageHistory.ts`) to reduce repeats. Authenticated (registered or anonymous) users persist to `played_images` and are excluded server-side by the RPC.

- __Notes__
  - If the database has fewer than `p_count` eligible images after exclusions and filters (e.g., year bounds), the RPC may return fewer rows; the client guards for this and surfaces an error when insufficient images are available.
