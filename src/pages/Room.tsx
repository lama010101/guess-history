import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { X, Home, Copy, Users, ArrowLeft, Zap, Share2, Search, UserPlus, UserMinus, ExternalLink } from 'lucide-react';
import { partyUrl, LobbyServerMessage, LobbyClientMessage } from '@/lib/partyClient';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { NavMenu } from '@/components/NavMenu';
import { v5 as uuidv5 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

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
  const { startGame, abortPreparation, roundTimerSec, timerEnabled, setRoundTimerSec, setTimerEnabled } = useGame();
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
  const [mode, setMode] = useState<'sync' | 'async'>('sync');
  const [ownId, setOwnId] = useState<string>('');

  // Host-only friends helpers
  type FriendEntry = { id: string; display_name: string; avatar_url?: string };
  const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // Room invites
  type InviteEntry = { id: string; friend_id: string; display_name: string };
  const [invites, setInvites] = useState<InviteEntry[]>([]);

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
                // Derive a deterministic UUID seed from roomCode and startedAt timestamp
                const seed = uuidv5(`${roomCode}:${data.startedAt}`, uuidv5.URL);
                try {
                  console.debug('[Room] start event received', {
                    roomCode,
                    startedAt: data.startedAt,
                    durationSec: data.durationSec,
                    timerEnabled: data.timerEnabled,
                    seed,
                  });
                } catch {}
                // Ensure any ongoing preparation is aborted before reseeding
                try {
                  abortPreparation();
                  console.debug('[Room] Aborted any existing preparation before starting game');
                } catch {}
                startGame({ roomId: roomCode, seed, timerSeconds: data.durationSec, timerEnabled: data.timerEnabled }).catch(() => {
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

  // Host-only friends helpers
  const loadFriends = useCallback(async () => {
    if (!user?.id) return;
    setFriendsLoading(true);
    try {
      const { data: friendsRows, error: friendsErr } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);
      if (friendsErr) throw friendsErr;
      const ids = (friendsRows || []).map((r: any) => r.friend_id);
      if (ids.length === 0) {
        setFriendsList([]);
      } else {
        const { data: profiles, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', ids);
        if (profilesErr) throw profilesErr;
        const mapped = (profiles || []).map((p: any) => ({ id: p.id, display_name: p.display_name || 'User', avatar_url: p.avatar_url || undefined }));
        setFriendsList(mapped);
      }
    } catch (e) {
      console.error('[Room] loadFriends error', e);
      toast({ description: 'Failed to load friends', variant: 'destructive' });
    } finally {
      setFriendsLoading(false);
    }
  }, [user?.id]);

  const loadInvites = useCallback(async () => {
    if (!user?.id || !roomCode) return;
    try {
      const { data, error } = await supabase
        .from('room_invites')
        .select('id, friend_id, profiles!room_invites_friend_id_fkey(display_name)')
        .eq('room_id', roomCode)
        .eq('inviter_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const mapped: InviteEntry[] = (data || []).map((r: any) => ({ id: r.id, friend_id: r.friend_id, display_name: r.profiles?.display_name || 'User' }));
      setInvites(mapped);
    } catch (e) {
      console.error('[Room] loadInvites error', e);
    }
  }, [user?.id, roomCode]);

  

  useEffect(() => {
    if (isHost && user?.id) {
      loadFriends();
      loadInvites();
    }
  }, [isHost, user?.id, loadFriends, loadInvites]);

  // Format time similar to Play Solo UI
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds) return 'No timer';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m${remainingSeconds}s` : `${minutes}m`;
  }, []);

  const readyCount = useMemo(() => roster.filter(r => r.ready).length, [roster]);
  const filteredFriends = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return friendsList;
    return friendsList.filter(f => (f.display_name || '').toLowerCase().includes(term));
  }, [friendsList, searchTerm]);

  // Host sends current settings to server whenever they change (debounced by ref to avoid spam)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!isHost) return;
    const sec = Number(roundTimerSec) || 60;
    const enabled = true; // Timer is always displayed; simplified per new UI
    const last = lastSentSettingsRef.current;
    if (!last || last.sec !== sec || last.enabled !== enabled) {
      const payload: LobbyClientMessage = { type: 'settings', timerSeconds: sec, timerEnabled: enabled } as any;
      try {
        ws.send(JSON.stringify(payload));
        lastSentSettingsRef.current = { sec, enabled };
      } catch {}
    }
  }, [isHost, roundTimerSec, status]);

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

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [roomCode]);

  const inviteFriend = useCallback(async (f: FriendEntry) => {
    if (!user?.id || !roomCode) return;
    try {
      const { error, data } = await supabase
        .from('room_invites')
        .insert([{ room_id: roomCode, inviter_user_id: user.id, friend_id: f.id }])
        .select('id')
        .single();
      if (error) throw error;
      setInvites((prev) => [{ id: data!.id, friend_id: f.id, display_name: f.display_name }, ...prev]);
      toast({ description: `Invited ${f.display_name}` });
    } catch (e) {
      console.error('[Room] inviteFriend error', e);
      toast({ description: 'Failed to invite', variant: 'destructive' });
    }
  }, [user?.id, roomCode]);

  const cancelInvite = useCallback(async (inviteId: string) => {
    try {
      const { error } = await supabase.from('room_invites').delete().eq('id', inviteId);
      if (error) throw error;
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (e) {
      console.error('[Room] cancelInvite error', e);
    }
  }, []);

  const kickPlayer = useCallback((targetId: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload: LobbyClientMessage = { type: 'kick', targetId } as any;
    try {
      ws.send(JSON.stringify(payload));
    } catch {}
  }, []);

  return (
    <div className="min-h-screen w-full bg-history-light dark:bg-black text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 pb-24">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              className="px-2 text-neutral-300 hover:text-white"
              aria-label="Back"
              type="button"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              onClick={() => navigate('/test')}
              className="h-9 w-9 rounded-full border-none text-black bg-[linear-gradient(90deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] hover:opacity-90"
              aria-label="Go to Home"
              type="button"
            >
              <Home className="h-4 w-4" />
            </Button>
            <NavMenu />
            <Button
              size="icon"
              onClick={() => navigate('/play')}
              className="h-9 w-9 rounded-full bg-neutral-800 hover:bg-neutral-700"
              aria-label="Leave lobby"
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex justify-center">
          <div className="p-1 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 inline-flex items-center">
            <button
              type="button"
              className={`px-5 py-1.5 rounded-full text-sm font-semibold ${mode === 'sync' ? 'bg-black text-white' : 'text-black/70'}`}
              onClick={() => setMode('sync')}
            >
              <span className="inline-flex items-center gap-1"><Zap className="h-4 w-4" />SYNC</span>
            </button>
            <button
              type="button"
              className={`px-5 py-1.5 rounded-full text-sm font-semibold ${mode === 'async' ? 'bg-black text-white' : 'text-black/70'}`}
              onClick={() => setMode('async')}
            >
              ASYNC
            </button>
          </div>
        </div>

        {/* Two-column layout: Left (Timer, Room Info) | Right (Friends, Players) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Timer (simplified) */}
            <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-900/50">
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm">Round Duration</Label>
                <div className="text-sm text-teal-300">{formatTime(roundTimerSec)}</div>
              </div>
              {isHost ? (
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
              ) : (
                <div className="text-xs text-neutral-400">Host controls the timer</div>
              )}
            </div>

            {/* Room Information */}
            <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-900/50">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Room Information</h2>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Users className="h-4 w-4" /> {(roster.length || players.length)} player{(roster.length || players.length) === 1 ? '' : 's'}
                </div>
              </div>
              <Label className="text-xs text-neutral-400">Room Code</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input value={roomCode} readOnly className="bg-neutral-950 border-neutral-700 text-white tracking-widest uppercase" />
                {isHost && (
                  <Button onClick={copyCode} size="icon" className="bg-neutral-800 hover:bg-neutral-700" aria-label="Copy room code">
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isHost && (
                <Button onClick={copyInvite} className="mt-3 w-full bg-white text-black hover:bg-white/90 inline-flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  {copied ? 'Link copied!' : 'Share Invite'}
                </Button>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Host-only Friends management */}
            {isHost && (
              <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-900/50">
                {/* Friends accordion with internal search + invite */}
                {friendsLoading ? (
                  <div className="text-xs text-neutral-400">Loading friends…</div>
                ) : (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="friends">
                      <AccordionTrigger>Your Friends ({friendsList.length})</AccordionTrigger>
                      <AccordionContent>
                        {/* Search bar inside accordion to filter friends list */}
                        <div className="mb-3 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                          <Input
                            placeholder="Filter your friends by name..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        {/* Manage Friends link moved here */}
                        <div className="-mt-2 mb-3 text-right">
                          <button
                            type="button"
                            onClick={() => navigate('/test/friends')}
                            className="text-xs text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Manage friends
                          </button>
                        </div>
                        {filteredFriends.length === 0 ? (
                          <div className="text-xs text-neutral-400">No friends match your filter.</div>
                        ) : (
                          <div className="space-y-2">
                            {filteredFriends.map((f) => (
                              <div key={f.id} className="flex items-center justify-between rounded-lg bg-neutral-800/60 border border-neutral-700 px-3 py-2">
                                <div className="truncate text-sm">{f.display_name}</div>
                                <Button size="sm" variant="ghost" className="text-emerald-300 hover:text-emerald-200" onClick={() => inviteFriend(f)}>
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            )}

            {/* Players grid */}
            <div className="rounded-xl border border-neutral-800 p-4 bg-neutral-900/40">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Players ({roster.length || players.length})</h2>
                <div className="text-xs text-neutral-400">Room {roomCode} · Status: {status}</div>
              </div>
              {(() => {
                const invitedExtras = invites
                  .filter((inv) => !roster.some((r) => r.name === inv.display_name))
                  .map((inv) => ({ id: `invite:${inv.id}`, name: inv.display_name, ready: false, host: false, _inviteId: inv.id } as any));
                const display = [...roster, ...invitedExtras];
                return display.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {display.map((r: any, i: number) => {
                      const isYou = r.id === ownId;
                      return (
                        <div key={`${r.name}-${i}`} className="rounded-lg bg-neutral-800/60 border border-neutral-700 px-3 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-semibold">
                                {r.name?.[0]?.toUpperCase() || '?' }
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate max-w-[160px]">{r.name}</span>
                                  {r.host && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">Host</span>}
                                  {typeof r._inviteId === 'string' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Invited</span>}
                                </div>
                                <div className="text-xs text-neutral-400">{r.ready ? 'Ready' : (typeof r._inviteId === 'string' ? 'Waiting to join' : 'Not ready')}</div>
                              </div>
                            </div>
                            <div className="ml-3 flex items-center gap-2">
                              {typeof r._inviteId === 'string' ? (
                                isHost && (
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-300 hover:text-red-200" onClick={() => cancelInvite(r._inviteId)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                )
                              ) : isYou ? (
                                <button onClick={toggleReady} disabled={status !== 'open'} className={`px-2.5 py-1.5 rounded-md text-xs font-medium ${ownReady ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-700 text-neutral-200'}`}>{ownReady ? 'Ready' : 'Ready?'}</button>
                              ) : (
                                <span className={`text-xs ${r.ready ? 'text-emerald-300' : 'text-neutral-400'}`}>{r.ready ? 'Ready' : 'Not ready'}</span>
                              )}
                              {isHost && !isYou && typeof r._inviteId !== 'string' && (
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-300 hover:text-red-200" onClick={() => kickPlayer(r.id)}>
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                          {typeof r._inviteId !== 'string' && (
                            <div className="mt-3 h-1.5 rounded-full bg-neutral-700 overflow-hidden">
                              <div className={`h-full ${r.ready ? 'bg-emerald-400 w-full' : 'bg-neutral-500 w-1/5'}`}></div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-neutral-500">Waiting for players...</div>
                );
              })()}
              {roster.length === 1 && (
                <div className="mt-3 text-xs text-neutral-400">Share the invite link to bring friends into this room.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Sticky Waiting banner at bottom */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-4">
          <div className="rounded-xl bg-teal-600/20 text-teal-300 border border-teal-600/40 p-3 text-center backdrop-blur">
            <div className="font-medium">Waiting for players ({readyCount}/{roster.length || players.length} ready)</div>
            <div className="text-xs text-neutral-300 mt-1">All players must be ready to start in Sync mode</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
