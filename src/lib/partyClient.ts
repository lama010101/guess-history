export function partyUrl(party: string, roomCode: string): string {
  const host = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';
  const isLocal =
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    (host.startsWith('172.') && (() => {
      const second = Number(host.split('.')[1]);
      return second >= 16 && second <= 31;
    })());

  const protocol = isLocal ? 'ws' : 'wss';
  // Use /parties/<party>/<roomCode> path to match repo convention
  return `${protocol}://${host}/parties/${encodeURIComponent(party)}/${encodeURIComponent(roomCode)}`;
}

export type LobbyServerMessage =
  | { type: 'players'; players: string[] }
  | { type: 'full' }
  | { type: 'chat'; from: string; message: string; timestamp: string };

export type LobbyClientMessage =
  | { type: 'join'; name: string; token?: string }
  | { type: 'chat'; message: string; timestamp: string };
