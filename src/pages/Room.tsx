import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, X, Home } from 'lucide-react';
import { partyUrl, LobbyServerMessage, LobbyClientMessage } from '@/lib/partyClient';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavMenu } from '@/components/NavMenu';

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

type RosterEntry = { id: string; name: string; ready: boolean; host: boolean };

const Room: React.FC = () => {
  const { roomCode = '' } = useParams<{ roomCode: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { startGame, roundTimerSec, timerEnabled, setRoundTimerSec, setTimerEnabled } = useGame();
  const { user } = useAuth();

  const name = useMemo(() => {
    const authName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '')) as string;
    const paramName = params.get('name')?.trim() || '';
    return (authName?.trim() || paramName || 'Anonymous').slice(0, 32);
  }, [user, params]);
  const url = useMemo(() => partyUrl('lobby', roomCode), [roomCode]);

  const [players, setPlayers] = useState<string[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'full'>('connecting');
  const [ownReady, setOwnReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ownId, setOwnId] = useState<string>('');

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const lastSentSettingsRef = useRef<{ sec: number; enabled: boolean } | null>(null);

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
                const entries = data.players.map(p => ({ id: String(p.id), name: String(p.name), ready: !!p.ready, host: !!p.host }));
                setRoster(entries);
              }
              break;
            case 'hello':
              if (data.you && typeof data.you.id === 'string') {
                setOwnId(data.you.id);
              }
              break;
            case 'settings':
              // Live sync timer values from server (on join and when host changes settings)
              if (typeof data.timerEnabled === 'boolean') {
                setTimerEnabled(data.timerEnabled);
              }
              if (typeof data.timerSeconds === 'number') {
                setRoundTimerSec(data.timerSeconds);
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
                startGame({ roomId: roomCode, seed: data.startedAt, timerSeconds: data.durationSec, timerEnabled: data.timerEnabled }).catch(() => {
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
    // Determine host strictly from roster by connection id
    return roster.some(r => r.host && r.id === ownId);
  }, [roster, ownId]);

  // Format time similar to Play Solo UI
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds) return 'No timer';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m${remainingSeconds}s` : `${minutes}m`;
  }, []);

  // Host sends current settings to server whenever they change (debounced by ref to avoid spam)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!isHost) return;
    const sec = Number(roundTimerSec) || 60;
    const enabled = !!timerEnabled;
    const last = lastSentSettingsRef.current;
    if (!last || last.sec !== sec || last.enabled !== enabled) {
      const payload: LobbyClientMessage = { type: 'settings', timerSeconds: sec, timerEnabled: enabled } as any;
      try {
        ws.send(JSON.stringify(payload));
        lastSentSettingsRef.current = { sec, enabled };
      } catch {}
    }
  }, [isHost, roundTimerSec, timerEnabled, status]);

  const copyInvite = useCallback(async () => {
    try {
      // Share a clean invite URL without any query params like host=1
      const inviteUrl = `${window.location.origin}/room/${encodeURIComponent(roomCode)}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Fallback: open prompt
      // eslint-disable-next-line no-alert
      const inviteUrl = `${window.location.origin}/room/${encodeURIComponent(roomCode)}`;
      window.prompt('Copy invite link:', inviteUrl);
    }
  }, [roomCode]);

  return (
    <div className="min-h-screen w-full bg-history-light dark:bg-black text-white">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Room {roomCode}</h1>
            <div className="text-xs text-neutral-400">Status: {status}</div>
          </div>
          <div className="flex items-center gap-2">
            {/* Home button */}
            <Button
              size="icon"
              onClick={() => navigate('/test')}
              className="h-9 w-9 rounded-full border-none text-black bg-[linear-gradient(90deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] hover:opacity-90"
              aria-label="Go to Home"
              type="button"
            >
              <Home className="h-4 w-4" />
            </Button>
            {/* Avatar/Menu dropdown */}
            <NavMenu />
            {isHost && (
              <Button onClick={copyInvite} variant="secondary" className="bg-neutral-800 hover:bg-neutral-700">
                {copied ? 'Link copied!' : 'Share invite link'}
              </Button>
            )}
            {/* Close button (icon) to leave the lobby */}
            <Button
              size="icon"
              onClick={() => navigate('/play')}
              className="h-9 w-9 rounded-full bg-neutral-800 hover:bg-neutral-700"
              aria-label="Close lobby"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button onClick={() => navigate('/play')} variant="ghost" className="text-neutral-300">Leave</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-md border border-neutral-800 p-4 bg-neutral-950/30">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Players</h2>
              <span className="text-xs text-neutral-400">{(roster.length || players.length)}/8</span>
            </div>

            {/* Round Timer (Host controls, everyone sees value) */}
            <div className="mb-4 p-3 rounded bg-neutral-900/30 border border-neutral-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-history-primary" />
                <h3 className="text-sm font-semibold">Round Timer</h3>
                <div className="ml-auto px-2 py-0.5 rounded bg-history-secondary/20 text-history-secondary text-xs">
                  {timerEnabled ? formatTime(roundTimerSec) : 'No timer'}
                </div>
              </div>

              {isHost ? (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Switch
                      id="lobby-timer-enabled"
                      checked={!!timerEnabled}
                      onCheckedChange={setTimerEnabled}
                    />
                    <Label htmlFor="lobby-timer-enabled" className="text-xs">
                      {timerEnabled ? 'Timer enabled' : 'No time limit'}
                    </Label>
                  </div>

                  {timerEnabled && (
                    <div className="px-1">
                      <Slider
                        value={[roundTimerSec || 60]}
                        min={5}
                        max={300}
                        step={5}
                        onValueChange={(v) => setRoundTimerSec(v[0])}
                        className="my-3"
                      />
                      <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
                        <span>5s</span>
                        <span>30s</span>
                        <span>1m</span>
                        <span>2m</span>
                        <span>3m</span>
                        <span>4m</span>
                        <span>5m</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-neutral-400">Host controls the timer</div>
              )}
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
                      {r.id === ownId && (
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
