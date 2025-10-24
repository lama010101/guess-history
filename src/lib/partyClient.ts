function isPrivateHost(h: string): boolean {
  // Accept both hostname and host:port inputs
  const hostname = h.split(':')[0];
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.')
  ) {
    return true;
  }
  if (hostname.startsWith('172.')) {
    const second = Number(hostname.split('.')[1]);
    return Number.isFinite(second) && second >= 16 && second <= 31;
  }
  return false;
}

export function partyUrl(party: string, roomCode: string): string {
  // Prefer explicit env override when provided
  const envHost = (import.meta as any).env?.VITE_PARTYKIT_HOST as string | undefined;

  // Default cloud host derived from partykit.json "name"
  const CLOUD_HOST = 'guess-history-multiplayer.partykit.dev';

  let host: string;
  let isLocal: boolean;

  if (envHost && envHost.trim().length > 0) {
    host = envHost.trim();
    isLocal = isPrivateHost(host);
  } else {
    // If running locally/private network, assume PartyKit dev server on port 1999
    const pageHost = typeof window !== 'undefined' ? window.location.host : 'localhost:5173';
    const pageHostname = pageHost.split(':')[0];
    const pageIsLocal = isPrivateHost(pageHostname);
    if (pageIsLocal) {
      host = `${pageHostname}:1999`;
      isLocal = true;
    } else {
      // Production: connect directly to PartyKit cloud unless explicitly overridden
      host = CLOUD_HOST;
      isLocal = false;
    }
  }

  const protocol = isLocal ? 'ws' : 'wss';
  return `${protocol}://${host}/parties/${encodeURIComponent(party)}/${encodeURIComponent(roomCode)}`;
}

export type LobbyServerMessage =
  | { type: 'players'; players: string[] }
  | { type: 'full' }
  | { type: 'chat'; from: string; message: string; timestamp: string }
  | { type: 'roster'; players: { id: string; name: string; ready: boolean; host: boolean; userId?: string | null }[] }
  | { type: 'settings'; timerSeconds?: number; timerEnabled?: boolean; mode?: 'sync' | 'async'; yearMin?: number; yearMax?: number }
  | { type: 'hello'; you: { id: string; name: string; host: boolean } }
  | { type: 'start'; startedAt: string; durationSec: number; timerEnabled: boolean; seed: string; yearMin?: number; yearMax?: number }
  | { type: 'progress'; from: string; roundNumber: number; substep?: string }
  | { type: 'submission'; roundNumber: number; connectionId: string; from: string; userId?: string | null; submittedCount: number; totalPlayers: number; lobbySize: number }
  | { type: 'round-complete'; roundNumber: number; submittedCount: number; totalPlayers: number; lobbySize: number }
  | { type: 'results-ready'; roundNumber: number; readyCount: number; totalPlayers: number };

export type LobbyClientMessage =
  | { type: 'join'; name: string; userId?: string; token?: string }
  | { type: 'chat'; message: string; timestamp: string }
  | { type: 'ready'; ready: boolean }
  // Optional: host can send settings prior to start; server validates host
  | { type: 'settings'; timerSeconds?: number; timerEnabled?: boolean; mode?: 'sync' | 'async'; yearMin?: number; yearMax?: number }
  | { type: 'progress'; roundNumber: number; substep?: string }
  | { type: 'submission'; roundNumber: number }
  | { type: 'results-ready'; roundNumber: number; ready: boolean }
  // Host-only: remove a player from the lobby
  | { type: 'kick'; targetId: string }
  // Runtime display-name update; client may send when its name source changes
  | { type: 'rename'; name: string };
