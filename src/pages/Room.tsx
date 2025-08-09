import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { partyUrl, LobbyServerMessage, LobbyClientMessage } from '@/lib/partyClient';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';

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

type RosterEntry = { name: string; ready: boolean; host: boolean };

const Room: React.FC = () => {
  const { roomCode = '' } = useParams<{ roomCode: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { startGame } = useGame();
  const { user } = useAuth();

  const name = useMemo(() => {
    const authName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '')) as string;
    const paramName = params.get('name')?.trim() || '';
    return (authName?.trim() || paramName || 'Anonymous').slice(0, 32);
  }, [user, params]);
  const urlHostFlag = useMemo(() => params.get('host') === '1', [params]);
  const url = useMemo(() => partyUrl('lobby', roomCode), [roomCode]);

  const [players, setPlayers] = useState<string[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'full'>('connecting');
  const [ownReady, setOwnReady] = useState(false);
  const [copied, setCopied] = useState(false);

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
      // reset ready status upon fresh connection
      setOwnReady(false);
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
            case 'roster':
              if (Array.isArray(data.players)) {
                const entries = data.players.map(p => ({ name: String(p.name), ready: !!p.ready, host: !!p.host }));
                setRoster(entries);
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
            case 'start':
              if (!startedRef.current) {
                startedRef.current = true;
                startGame({ roomId: roomCode, seed: data.startedAt }).catch(() => {
                  startedRef.current = false;
                });
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

  // Remove previous auto-start behavior. Start is now driven by server 'start' event.

  const sendChat = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const msg = input.trim();
    if (!msg) return;
    const payload: LobbyClientMessage = { type: 'chat', message: msg, timestamp: isoNow() };
    ws.send(JSON.stringify(payload));
    setInput('');
  }, [input]);

  const toggleReady = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const next = !ownReady;
    const payload: LobbyClientMessage = { type: 'ready', ready: next } as any;
    ws.send(JSON.stringify(payload));
    setOwnReady(next);
  }, [ownReady]);

  const isHost = useMemo(() => {
    // Prefer roster host detection; fallback to URL host flag for initial render
    const hostEntry = roster.find(r => r.host);
    return hostEntry ? hostEntry.name === name : urlHostFlag;
  }, [roster, name, urlHostFlag]);

  const copyInvite = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Fallback: open prompt
      // eslint-disable-next-line no-alert
      window.prompt('Copy invite link:', window.location.href);
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-history-light dark:bg-black text-white">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Room {roomCode}</h1>
            <div className="text-xs text-neutral-400">Status: {status}</div>
          </div>
          <div className="flex items-center gap-2">
            {isHost && (
              <Button onClick={copyInvite} variant="secondary" className="bg-neutral-800 hover:bg-neutral-700">
                {copied ? 'Link copied!' : 'Share invite link'}
              </Button>
            )}
            <Button onClick={() => navigate('/play')} variant="ghost" className="text-neutral-300">Leave</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-md border border-neutral-800 p-4 bg-neutral-950/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Players</h2>
              <span className="text-xs text-neutral-400">{players.length}/8</span>
            </div>
            <ul className="space-y-2">
              {roster.length > 0 ? (
                roster.map((r, i) => (
                  <li key={`${r.name}-${i}`} className="flex items-center justify-between text-sm bg-neutral-900/40 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.host && <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">Host</span>}
                      <span className="font-medium">{r.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={r.ready ? 'text-green-400' : 'text-neutral-500'}>{r.ready ? 'Ready' : 'Not ready'}</span>
                      {r.name === name && (
                        <Button size="sm" onClick={toggleReady} disabled={status !== 'open'} className={ownReady ? 'bg-green-600 hover:bg-green-500' : 'bg-history-primary hover:bg-history-primary/90'}>
                          {ownReady ? 'Unready' : "I'm Ready"}
                        </Button>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-neutral-500">Waiting for players...</li>
              )}
            </ul>
            {roster.length === 1 && (
              <div className="mt-3 text-xs text-neutral-400">Share the invite link to bring friends into this room.</div>
            )}
          </div>

          <div className="rounded-md border border-neutral-800 p-4 bg-neutral-950/30">
            <h2 className="font-semibold mb-2">Chat</h2>
            <div className="h-64 overflow-y-auto space-y-2 bg-neutral-950/40 p-2 rounded">
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
    </div>
  );
};

export default Room;
