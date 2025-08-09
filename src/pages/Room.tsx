import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { partyUrl, LobbyServerMessage, LobbyClientMessage } from '@/lib/partyClient';
import { useGame } from '@/contexts/GameContext';

interface ChatItem {
  id: string;
  from: string;
  message: string;
  timestamp: string;
}

const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 30000;

function isoNow() {
  return new Date().toISOString();
}

const Room: React.FC = () => {
  const { roomCode = '' } = useParams<{ roomCode: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { startGame } = useGame();

  const name = useMemo(() => (params.get('name')?.trim() || 'Anonymous').slice(0, 32), [params]);
  const isHost = useMemo(() => params.get('host') === '1', [params]);
  const url = useMemo(() => partyUrl('lobby', roomCode), [roomCode]);

  const [players, setPlayers] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'full'>('connecting');

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);

  const cleanupSocket = () => {
    try {
      wsRef.current?.close();
    } catch {}
    wsRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const scheduleReconnect = useCallback(() => {
    if (retryRef.current >= MAX_RETRIES) {
      setStatus('closed');
      return;
    }
    retryRef.current += 1;
    const delay = Math.min(1000 * 2 ** (retryRef.current - 1), MAX_BACKOFF_MS);
    timerRef.current = setTimeout(() => connect(), delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(() => {
    cleanupSocket();
    setStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setStatus('open');
      retryRef.current = 0; // reset backoff on success
      const joinMsg: LobbyClientMessage = { type: 'join', name };
      ws.send(JSON.stringify(joinMsg));
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as LobbyServerMessage;
        if (data && typeof data === 'object' && 'type' in data) {
          switch (data.type) {
            case 'players':
              if (Array.isArray(data.players)) {
                setPlayers(data.players.map((p) => String(p)));
              }
              break;
            case 'full':
              setStatus('full');
              // Redirect to /play per spec
              setTimeout(() => navigate('/play', { replace: true }), 300);
              break;
            case 'chat':
              if (
                typeof data.from === 'string' &&
                typeof data.message === 'string' &&
                typeof data.timestamp === 'string'
              ) {
                setChat((prev) => [
                  ...prev,
                  { id: `${Date.now()}-${prev.length}`, from: data.from, message: data.message, timestamp: data.timestamp },
                ]);
              }
              break;
            default:
              // ignore
              break;
          }
        }
      } catch {
        // ignore invalid json
      }
    });

    ws.addEventListener('close', () => {
      if (status !== 'full') {
        scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, url, navigate, scheduleReconnect]);

  useEffect(() => {
    if (!roomCode) {
      navigate('/play', { replace: true });
      return;
    }
    connect();
    return () => {
      cleanupSocket();
    };
  }, [connect, navigate, roomCode]);

  // Auto-start game when two players are present. To avoid UI changes, we pick the host
  // deterministically as the first joined player (players[0]) from the server roster.
  useEffect(() => {
    if (status === 'open' && players.length >= 2 && !startedRef.current && isHost) {
      startedRef.current = true;
      // Use lobby room code as the multiplayer roomId for the game context
      startGame({ roomId: roomCode }).catch(() => {
        startedRef.current = false; // allow retry in case of failure
      });
    }
  }, [status, players, isHost, roomCode, startGame]);

  const sendChat = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msg = input.trim();
    if (!msg) return;
    const payload: LobbyClientMessage = { type: 'chat', message: msg, timestamp: isoNow() };
    ws.send(JSON.stringify(payload));
    setInput('');
  }, [input]);

  return (
    <div className="min-h-screen w-full bg-history-light dark:bg-black text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Room {roomCode}</h1>
          <span className="text-sm text-neutral-400">Status: {status}</span>
        </div>

        <div className="rounded-md border border-neutral-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Players</h2>
            <span className="text-xs text-neutral-400">{players.length}/2</span>
          </div>
          <ul className="list-disc list-inside space-y-1">
            {players.map((p, i) => (
              <li key={i} className="text-sm">{p}</li>
            ))}
            {players.length === 0 && <li className="text-sm text-neutral-500">Waiting for players...</li>}
          </ul>
        </div>

        <div className="rounded-md border border-neutral-800 p-4">
          <h2 className="font-semibold mb-2">Chat</h2>
          <div className="h-56 overflow-y-auto space-y-2 bg-neutral-950/40 p-2 rounded">
            {chat.length === 0 && (
              <div className="text-sm text-neutral-500">No messages yet</div>
            )}
            {chat.map((c) => (
              <div key={c.id} className="text-sm">
                <span className="text-history-primary font-medium">{c.from}</span>:
                <span className="ml-2">{c.message}</span>
                <span className="ml-2 text-xs text-neutral-500">{new Date(c.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  sendChat();
                }
              }}
              className="bg-neutral-900 border-neutral-700 text-white"
            />
            <Button onClick={sendChat} disabled={status !== 'open'} className="bg-history-primary hover:bg-history-primary/90">
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
