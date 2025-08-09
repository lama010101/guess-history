# Guess-History – Multiplayer (PartyKit) Integration

This project integrates a 2‑player lobby over PartyKit with strict typing and resilient reconnects.

If you are looking for the product spec, refer to `PRD.md`. Below are the concrete steps to run and work with the multiplayer features.

## Prerequisites

- Node.js 18+
- npm

## Environment

Copy `.env.example` to `.env` and adjust as needed.

```bash
VITE_PARTYKIT_HOST=localhost:1999
```

Notes:
- The client builds WebSocket URLs dynamically using `VITE_PARTYKIT_HOST` and the path `/parties/lobby/:roomCode`.
- Secure protocol (wss) is used automatically when `VITE_PARTYKIT_HOST` is not a local address.

## Local Development

In one terminal:

```bash
npm install
npm run dev:mp
```

This runs both:
- Vite dev server
- PartyKit dev server on port 1999

Open the app and navigate to `/play` to create or join rooms.

## Routes

- `/play` — Enter display name, create a new 6‑char room code or join an existing one
- `/room/:roomCode` — Lobby room: presence (players) + chat, with auto‑reconnect

## Key Files

- Server: `server/lobby.ts` (2‑player lobby, presence + chat; zod‑validated)
- Client helper: `src/lib/partyClient.ts` (builds `ws(s)://<VITE_PARTYKIT_HOST>/parties/lobby/:roomCode`)
- Pages: `src/pages/PlayWithFriends.tsx`, `src/pages/Room.tsx`
- Routing: `src/App.tsx` (adds `/play` and `/room/:roomCode`)
- Config: `partykit.json` (`parties.lobby = server/lobby.ts`, `MAX_PLAYERS=2`)
- Navigation: `src/components/NavProfile.tsx` (link to `/play`)

## Scripts

```bash
npm run partykit:dev   # PartyKit dev server (port 1999)
npm run dev            # Vite dev server
npm run dev:mp         # Run both concurrently
npm run deploy:partykit
```

## Deployment (PartyKit)

Ensure you are authenticated with PartyKit, then:

```bash
npm run deploy:partykit
```

Set `VITE_PARTYKIT_HOST` for production builds to the deployed PartyKit hostname.

## Troubleshooting

- Cannot connect: verify `VITE_PARTYKIT_HOST` matches the PartyKit dev port (default 1999) or your deployed host.
- Room full: the server enforces a 2‑player limit and sends `{ type: "full" }` before closing.
- Reconnects: the client performs capped exponential backoff on disconnects.

## Security and Validation

- All messages are parsed with zod on the server.
- Hooks for invite token enforcement and event logging are present but not yet enabled.