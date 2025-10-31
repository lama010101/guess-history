import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { X, Copy, Search, UserPlus, UserMinus, ChevronDown, ChevronUp, Clock, MessageSquare, ChevronLeft, Users, Calendar } from 'lucide-react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import FriendsPage from '@/pages/FriendsPage';
import { partyUrl, LobbyServerMessage, LobbyClientMessage } from '@/lib/partyClient';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { v5 as uuidv5 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { cacheRoomInviteToken, declineInviteForRoom, ensureRoomInviteToken, getCachedRoomInviteToken } from '@/integrations/supabase/invites';
import type { Tables } from '@/integrations/supabase/types';
import { acquireChannel } from '@/integrations/supabase/realtime';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import GradientName from '@/components/ui/GradientName';
import { fetchAvatarUrlsForUserIds } from '@/utils/profile/avatarLoader';
import { getAvatarFrameGradient } from '@/utils/avatarGradient';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore, YEAR_RANGE_MIN, YEAR_RANGE_MAX, sanitizeYearRange } from '@/lib/useSettingsStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

type RosterEntry = { id: string; name: string; ready: boolean; host: boolean; userId?: string | null };
type DisplayRosterEntry = RosterEntry & { avatarUrl: string | null; _inviteId?: string };

const DEFAULT_COMPETE_TIMER_SEC = 120;

const Room: React.FC = () => {
  const { roomCode = '' } = useParams<{ roomCode: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { startGame, abortPreparation, roundTimerSec, timerEnabled, setRoundTimerSec, setTimerEnabled } = useGame();
  const { user } = useAuth();

  const [profileName, setProfileName] = useState<string>('');
  const [profileLoaded, setProfileLoaded] = useState<boolean>(false);

  const name = useMemo(() => {
    const authName = (user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split('@')[0] : '')) as string;
    const paramName = params.get('name')?.trim() || '';
    const chosen = (profileName?.trim() || authName?.trim() || paramName || 'Anonymous').slice(0, 32);
    return chosen;
  }, [user, params, profileName]);
  const url = useMemo(() => partyUrl('lobby', roomCode), [roomCode]);

  const [players, setPlayers] = useState<string[]>([]);
  const playersRef = useRef<string[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const rosterRef = useRef<RosterEntry[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [chatCollapsed, setChatCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(`room:${roomCode}:chatCollapsed`);
      return stored === '1';
    } catch {
      return false;
    }
  });
  const chatDefaultAppliedRef = useRef(false);
  const [playersCollapsed, setPlayersCollapsed] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed' | 'full'>('connecting');
  const [kicked, setKicked] = useState(false);
  const [ownReady, setOwnReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareInviteUrl, setShareInviteUrl] = useState('');
  const [ownId, setOwnId] = useState<string>('');
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [friendsListVisible, setFriendsListVisible] = useState(false);
  const [localTimerSec, setLocalTimerSec] = useState<number>(Number(roundTimerSec || DEFAULT_COMPETE_TIMER_SEC));
  const [draggingTimer, setDraggingTimer] = useState(false);
  const settings = useSettingsStore();
  const [yearRange, setYearRange] = useState<[number, number]>(settings.yearRange);
  const [localYearRange, setLocalYearRange] = useState<[number, number] | null>(null);
  const [draggingYear, setDraggingYear] = useState(false);
  const [editingTimer, setEditingTimer] = useState(false);
  const [timerInput, setTimerInput] = useState('');
  const [editingYearSide, setEditingYearSide] = useState<null | 'min' | 'max'>(null);
  const [yearInput, setYearInput] = useState('');
  type FriendEntry = { id: string; display_name: string; avatarUrl: string | null };
  const [friendsList, setFriendsList] = useState<FriendEntry[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  type InviteEntry = { id: string; friend_id: string; display_name: string };
  const [invites, setInvites] = useState<InviteEntry[]>([]);
  const [inviteAccordionOpen, setInviteAccordionOpen] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const inviteTokenRef = useRef<string | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedRef = useRef(false);
  const lastSentSettingsRef = useRef<{ sec: number; enabled: boolean; yearMin?: number; yearMax?: number } | null>(null);
  const lastSentNameRef = useRef<string>('');
  const clearedInvitesRef = useRef(false);
  const friendsModalOpenedRef = useRef(false);
  const latestNameRef = useRef<string>('');
  const statusRef = useRef<typeof status>(status);
  const timerEnabledRef = useRef<boolean>(!!timerEnabled);
  const roundTimerSecRef = useRef<number>(Number(roundTimerSec || 0));
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string | null>>({});
  const yearRangeRef = useRef<[number, number]>(settings.yearRange);
  const initialSettingsSyncedRef = useRef(false);
  const kickedRef = useRef(false);
  const kickedHandledRef = useRef(false);

  const updateShareInviteUrl = useCallback((token: string | null): string => {
    if (typeof window === 'undefined' || !roomCode) {
      setShareInviteUrl((prev) => (prev === '' ? prev : ''));
      return '';
    }
    const baseUrl = `${window.location.origin}/room/${encodeURIComponent(roomCode)}`;
    const url = token ? `${baseUrl}?token=${encodeURIComponent(token)}` : baseUrl;
    setShareInviteUrl((prev) => (prev === url ? prev : url));
    return url;
  }, [roomCode]);

  useEffect(() => {
    updateShareInviteUrl(inviteTokenRef.current ?? null);
  }, [updateShareInviteUrl]);

  const removeRosterEntry = useCallback((targetId: string, targetName?: string | null) => {
    setRoster((prev) => {
      const filtered = prev.filter((entry) => entry.id !== targetId);
      if (filtered.length !== prev.length) {
        rosterRef.current = filtered;
        return filtered;
      }
      return prev;
    });
    if (targetName && targetName.trim().length > 0) {
      const nameToRemove = targetName.trim();
      setPlayers((prev) => {
        const filtered = prev.filter((name) => name.trim() !== nameToRemove);
        if (filtered.length !== prev.length) {
          playersRef.current = filtered;
          return filtered;
        }
        return prev;
      });
    }
  }, []);

  const getInitial = useCallback((value: string | null | undefined) => {
    const trimmed = (value ?? '').trim();
    return trimmed.length > 0 ? trimmed[0]!.toUpperCase() : 'U';
  }, []);

  const isHost = useMemo(() => {
    return roster.some((r) => r.host && r.id === ownId);
  }, [roster, ownId]);

  // Load the user's profile display_name (preferred join name)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (user?.id) {
          const { data, error } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .maybeSingle();
          if (!cancelled) {
            if (!error) setProfileName((data?.display_name || '').trim());
          }
        }
      } catch {
        // ignore, fall back to auth metadata
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Persist chat collapsed state per room
  useEffect(() => {
    try {
      localStorage.setItem(`room:${roomCode}:chatCollapsed`, chatCollapsed ? '1' : '0');
    } catch {}
  }, [chatCollapsed, roomCode]);
  useEffect(() => {
    chatDefaultAppliedRef.current = false;
    try {
      const stored = localStorage.getItem(`room:${roomCode}:chatCollapsed`);
      if (stored === '1' || stored === '0') {
        setChatCollapsed(stored === '1');
        chatDefaultAppliedRef.current = true;
      } else {
        setChatCollapsed(false);
      }
    } catch {
      setChatCollapsed(false);
    }
  }, [roomCode]);

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

  const connect = useCallback(async () => {
    kickedRef.current = false;
    kickedHandledRef.current = false;
    setKicked(false);
    cleanupSocket();
    setStatus('connecting');

    const tokenParam = params.get('token');
    if (tokenParam && tokenParam.trim().length > 0) {
      inviteTokenRef.current = tokenParam;
      cacheRoomInviteToken(roomCode, tokenParam);
    }

    if (!inviteTokenRef.current) {
      inviteTokenRef.current = getCachedRoomInviteToken(roomCode);
    }
    if (!inviteTokenRef.current && roomCode) {
      inviteTokenRef.current = await ensureRoomInviteToken(roomCode, 'sync');
    }

    updateShareInviteUrl(inviteTokenRef.current ?? null);

    initialSettingsSyncedRef.current = false;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      setStatus('open');
      retryRef.current = 0; // reset backoff on success
      const joinName = (latestNameRef.current || '').trim();
      const joinMsg: LobbyClientMessage = {
        type: 'join',
        name: joinName,
        userId: user?.id || undefined,
        token: inviteTokenRef.current || undefined,
      };
      ws.send(JSON.stringify(joinMsg));
      // reset ready status upon fresh connection
      setOwnReady(false);
      // track the last name we told the server to support runtime rename updates
      lastSentNameRef.current = joinName;
    });

    ws.addEventListener('message', (ev) => {
      try {
        const data = JSON.parse(ev.data as string) as LobbyServerMessage;
        if (data && typeof data === 'object' && 'type' in data) {
          switch (data.type) {
            case 'players':
              if (Array.isArray(data.players)) {
                setPlayers((prev) => {
                  const next = data.players.map((p) => String(p));
                  playersRef.current = next;
                  return next;
                });
              }
              break;
            case 'roster':
              if (Array.isArray(data.players)) {
                const raw: RosterEntry[] = data.players.map((p) => ({
                  id: String(p.id),
                  name: String(p.name),
                  ready: !!p.ready,
                  host: !!p.host,
                  userId:
                    typeof (p as any).userId === 'string' && (p as any).userId.trim().length > 0
                      ? String((p as any).userId)
                      : null,
                }));

                const deduped = new Map<string, RosterEntry>();
                for (const entry of raw) {
                  const nameLc = (entry.name || '').trim().toLowerCase();
                  const key = entry.userId
                    ? `user:${entry.userId}`
                    : (nameLc ? `name:${nameLc}` : `conn:${entry.id}`);
                  const existing = deduped.get(key);
                  if (!existing) {
                    deduped.set(key, entry);
                    continue;
                  }
                  // Prefer host over non-host, then ready over not ready, then one with a userId
                  const pickNew = (
                    (!existing.host && entry.host) ||
                    (existing.host === entry.host && !existing.ready && entry.ready) ||
                    (existing.host === entry.host && existing.ready === entry.ready && !existing.userId && !!entry.userId)
                  );
                  if (pickNew) deduped.set(key, entry);
                }
                const nextRoster = Array.from(deduped.values());
                setRoster((prev) => {
                  rosterRef.current = nextRoster;
                  return nextRoster;
                });

                const rosterFriendIds = nextRoster
                  .map((entry) => entry.userId)
                  .filter((id): id is string => typeof id === 'string' && id.length > 0);
                if (rosterFriendIds.length > 0) {
                  setInvites((prev) => prev.filter((invite) => !rosterFriendIds.includes(invite.friend_id)));
                }
              }
              break;
            case 'hello':
              if (data.you && typeof data.you.id === 'string') {
                setOwnId(data.you.id);
                // After a successful join, auto-decline any invites in this room for the current user
                if (!clearedInvitesRef.current && user?.id) {
                  declineInviteForRoom(roomCode, user.id)
                    .then((deleted) => {
                      try {
                        console.debug('[Room] Cleared pending invites for current user on join', {
                          roomCode,
                          userId: user.id,
                          deleted,
                        });
                      } catch {}
                    })
                    .catch((e) => {
                      try {
                        console.warn('[Room] Failed to clear invites on join', e);
                      } catch {}
                    })
                    .finally(() => {
                      clearedInvitesRef.current = true;
                    });
                }
              }
              break;
            case 'settings':
              // Live sync timer values from server (on join and when host changes settings)
              // Ignore exact echo messages from our own last send to avoid UI jitter
              if (lastSentSettingsRef.current) {
                const echoEnabled =
                  typeof data.timerEnabled === 'boolean'
                    ? data.timerEnabled === lastSentSettingsRef.current.enabled
                    : true;
                const echoSeconds =
                  typeof data.timerSeconds === 'number'
                    ? data.timerSeconds === lastSentSettingsRef.current.sec
                    : true;
                const dm: any = data as any;
                const echoYears =
                  typeof dm.yearMin === 'number' &&
                  typeof dm.yearMax === 'number' &&
                  lastSentSettingsRef.current.yearMin !== undefined &&
                  lastSentSettingsRef.current.yearMax !== undefined &&
                  dm.yearMin === lastSentSettingsRef.current.yearMin &&
                  dm.yearMax === lastSentSettingsRef.current.yearMax;
                if (echoEnabled && echoSeconds && echoYears) {
                  break;
                }
              }
              if (typeof data.timerEnabled === 'boolean' && data.timerEnabled !== timerEnabledRef.current) {
                setTimerEnabled(data.timerEnabled);
              }
              if (typeof data.timerSeconds === 'number') {
                // Clamp to UI range and step to prevent oscillation if server holds a wider range
                const uiSec = Math.max(5, Math.min(300, Math.round(Number(data.timerSeconds) / 5) * 5));
                if (uiSec !== roundTimerSecRef.current) {
                  setRoundTimerSec(uiSec);
                }
              }
              if (typeof (data as any).yearMin === 'number' || typeof (data as any).yearMax === 'number') {
                const rawMin = typeof (data as any).yearMin === 'number' ? Math.round((data as any).yearMin) : yearRangeRef.current[0];
                const rawMax = typeof (data as any).yearMax === 'number' ? Math.round((data as any).yearMax) : yearRangeRef.current[1];
                const sanitized = sanitizeYearRange([rawMin, rawMax]);
                if (!draggingYear && (sanitized[0] !== yearRangeRef.current[0] || sanitized[1] !== yearRangeRef.current[1])) {
                  setYearRange(sanitized);
                  try { settings.setYearRange(sanitized); } catch {}
                }
              }
              initialSettingsSyncedRef.current = true;
              break;
            case 'full':
              setStatus('full');
              // Redirect to /compete
              setTimeout(() => navigate('/compete', { replace: true }), 300);
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
                // Prefer server-provided seed; fall back to deterministic UUIDv5(roomCode:startedAt)
                const seed = data.seed && data.seed.length > 0
                  ? data.seed
                  : uuidv5(`${roomCode}:${data.startedAt}`, uuidv5.URL);
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
                // Apply compete theming immediately so PreparationOverlay uses turquoise accents on Room route
                try {
                  document.body.classList.add('mode-compete');
                  document.body.classList.remove('mode-levelup');
                } catch {}
                startGame({
                  roomId: roomCode,
                  seed,
                  timerSeconds: data.durationSec,
                  timerEnabled: data.timerEnabled,
                  competeVariant: 'sync',
                  useHostHistory: isHost,
                  minYear: (data as any).yearMin,
                  maxYear: (data as any).yearMax,
                  authoritativeTimer: !!(data as any).authoritativeTimer,
                }).catch(() => {
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

    ws.addEventListener('close', (event) => {
      if (event.code === 4000) {
        kickedRef.current = true;
        kickedHandledRef.current = false;
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        wsRef.current = null;
        retryRef.current = MAX_RETRIES;
        setStatus('closed');
        setKicked(true);
        return;
      }
      if (statusRef.current !== 'full') {
        scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, navigate, scheduleReconnect, user?.id, roomCode, params]);

  useEffect(() => {
    if (!roomCode) {
      navigate('/compete', { replace: true });
      return;
    }
    // If authenticated, wait for profile load to ensure we send the correct name on join.
    if (user?.id && !profileLoaded) return;
    // Do not connect until we have a user id (compete requires auth)
    if (!user?.id) return;
    connect();
    return () => {
      cleanupSocket();
    };
  }, [navigate, roomCode, user?.id, profileLoaded]);

  // If the computed display name changes after connection, inform the server
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const prev = lastSentNameRef.current || '';
    const next = (name || '').trim();
    if (next.length > 0 && next !== prev) {
      const payload: LobbyClientMessage = { type: 'rename', name: next };
      try {
        ws.send(JSON.stringify(payload));
        lastSentNameRef.current = next;
      } catch {}
    }
  }, [name]);

  // Keep refs in sync with latest dynamic values without causing re-creations
  useEffect(() => { latestNameRef.current = name; }, [name]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { timerEnabledRef.current = !!timerEnabled; }, [timerEnabled]);
  useEffect(() => { roundTimerSecRef.current = Number(roundTimerSec || 0); }, [roundTimerSec]);
  useEffect(() => { yearRangeRef.current = yearRange; }, [yearRange]);

  useEffect(() => {
    if (!kicked || kickedHandledRef.current) return;
    kickedHandledRef.current = true;
    try {
      toast({
        title: 'Removed from room',
        description: 'The host removed you from the room.',
        variant: 'destructive',
      });
    } catch {}
    navigate('/compete', { replace: true });
  }, [kicked, navigate]);

  // Keep local slider value in sync when not dragging
  useEffect(() => {
    if (draggingTimer) return;
    const val = Number(roundTimerSec || DEFAULT_COMPETE_TIMER_SEC);
    setLocalTimerSec(Math.max(5, Math.min(300, Math.round(val / 5) * 5)));
  }, [roundTimerSec, draggingTimer]);

  useEffect(() => {
    if (!chatDefaultAppliedRef.current) {
      const defaultCollapsed = isHost;
      setChatCollapsed(defaultCollapsed);
      try {
        localStorage.setItem(`room:${roomCode}:chatCollapsed`, defaultCollapsed ? '1' : '0');
      } catch {}
      chatDefaultAppliedRef.current = true;
    }
    if (isHost && !timerEnabled) {
      setTimerEnabled(true);
    }
  }, [isHost, timerEnabled, setTimerEnabled, roomCode]);

  const commitTimerSeconds = useCallback((val: number) => {
    const clamped = Math.max(5, Math.min(300, Math.round(Number(val) / 5) * 5));
    setDraggingTimer(false);
    setLocalTimerSec(clamped);
    // This will trigger the host settings sender effect downstream
    setRoundTimerSec(clamped);
  }, [setRoundTimerSec]);

  const hasOtherParticipants = useMemo(() => roster.some((entry) => entry.id !== ownId), [roster, ownId]);

  const sendChat = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (isHost && !hasOtherParticipants) return;
    const msg = input.trim();
    if (!msg) return;
    const payload: LobbyClientMessage = { type: 'chat', message: msg, timestamp: isoNow() };
    ws.send(JSON.stringify(payload));
    setInput('');
  }, [input, isHost, hasOtherParticipants]);

  const toggleReady = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const next = !ownReady;
    const payload: LobbyClientMessage = { type: 'ready', ready: next } as any;
    ws.send(JSON.stringify(payload));
    setOwnReady(next);
  }, [ownReady]);

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
          .select('id, display_name, avatar_image_url, avatar_url, avatar_id')
          .in('id', ids);
        if (profilesErr) throw profilesErr;
        const avatarMap = await fetchAvatarUrlsForUserIds(ids);
        if (avatarMap && Object.keys(avatarMap).length > 0) {
          setAvatarUrls((prev) => ({ ...prev, ...avatarMap }));
        }
        const mapped = (profiles || []).map((p: any) => ({
          id: p.id,
          display_name: p.display_name || 'User',
          avatarUrl: avatarMap?.[p.id] ?? null,
        }));
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

  // Host-side realtime: keep invites list in sync for this room
  useEffect(() => {
    if (!isHost || !user?.id) return;
    const channelName = `room_invites:host:${user.id}`;
    const handle = acquireChannel(channelName);
    handle.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'room_invites',
        filter: `inviter_user_id=eq.${user.id}`,
      },
      (payload) => {
        const row = payload.new as Tables<'room_invites'>;
        if (!row || row.room_id !== roomCode) return;
        setInvites((prev) => {
          if (prev.some((i) => i.id === row.id)) return prev;
          return [{ id: row.id, friend_id: row.friend_id, display_name: '' }, ...prev];
        });
        // Enrich with invitee's display name asynchronously
        (async () => {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('display_name')
              .eq('id', row.friend_id)
              .maybeSingle();
            if (error) return;
            const dn = (data?.display_name || '').trim();
            if (!dn) return;
            setInvites((prev) => prev.map((i) => (i.id === row.id ? { ...i, display_name: dn } : i)));
          } catch {
            // ignore
          }
        })();
      }
    );
    handle.channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'room_invites',
        filter: `inviter_user_id=eq.${user.id}`,
      },
      (payload) => {
        const row = payload.old as { id: string };
        if (!row?.id) return;
        setInvites((prev) => prev.filter((i) => i.id !== row.id));
      }
    );

    return () => {
      handle.release();
    };
  }, [isHost, user?.id, roomCode]);

  useEffect(() => {
    if (!isHost || !user?.id) return;
    const channelName = `friends:room:${user.id}`;
    const handle = acquireChannel(channelName);

    const refreshFriends = async () => {
      try {
        await loadFriends();
      } catch (e) {
        try {
          console.warn('[Room] failed to refresh friends after realtime update', e);
        } catch {}
      }
    };

    handle.channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'friends',
        filter: `user_id=eq.${user.id}`,
      },
      () => {
        void refreshFriends();
      },
    );

    handle.channel.on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'friends',
        filter: `user_id=eq.${user.id}`,
      },
      ({ old }) => {
        const prevFriendId = (old as { friend_id?: string } | null)?.friend_id;
        setFriendsList((prev) => (prevFriendId ? prev.filter((f) => f.id !== prevFriendId) : prev));
        void refreshFriends();
      },
    );

    return () => {
      handle.release();
    };
  }, [isHost, user?.id, loadFriends]);

  useEffect(() => {
    if (isHost && user?.id) {
      loadFriends();
      loadInvites();
    }
  }, [isHost, user?.id, loadFriends, loadInvites]);

  useEffect(() => {
    if (!isHost || !user?.id) return;
    const handleFriendChanged = () => {
      void loadFriends();
    };
    window.addEventListener('gh:friends:added', handleFriendChanged);
    window.addEventListener('gh:friends:removed', handleFriendChanged);
    return () => {
      window.removeEventListener('gh:friends:added', handleFriendChanged);
      window.removeEventListener('gh:friends:removed', handleFriendChanged);
    };
  }, [isHost, user?.id, loadFriends]);

  // Format time similar to Play Solo UI
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds) return 'No timer';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m${remainingSeconds}s` : `${minutes}m`;
  }, []);

  const formatChatTime = useCallback((iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat]);

  const readyCount = useMemo(() => roster.filter(r => r.ready).length, [roster]);

  const rosterWithAvatars = useMemo<DisplayRosterEntry[]>(() =>
    roster.map((entry) => ({
      ...entry,
      avatarUrl: entry.userId ? avatarUrls[entry.userId] ?? null : null,
    })),
  [roster, avatarUrls]);

  useEffect(() => {
    const missingUserIds = Array.from(
      new Set(
        roster
          .map((entry) => entry.userId)
          .filter((id): id is string => !!id && !(id in avatarUrls)),
      ),
    );
    if (missingUserIds.length === 0) return;
    (async () => {
      const map = await fetchAvatarUrlsForUserIds(missingUserIds);
      if (map && Object.keys(map).length > 0) {
        setAvatarUrls((prev) => ({ ...prev, ...map }));
      }
    })();
  }, [roster, avatarUrls]);

  useEffect(() => {
    if (!user?.id || avatarUrls[user.id]) return;
    (async () => {
      const map = await fetchAvatarUrlsForUserIds([user.id]);
      if (map && Object.keys(map).length > 0) {
        setAvatarUrls((prev) => ({ ...prev, ...map }));
      }
    })();
  }, [user?.id, avatarUrls]);

  const filteredFriends = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return friendsList;
    return friendsList.filter(f => (f.display_name || '').toLowerCase().includes(term));
  }, [friendsList, searchTerm]);
  const limitedFriends = useMemo(() => filteredFriends.slice(0, 10), [filteredFriends]);
  const hasMoreFriends = useMemo(() => filteredFriends.length > 10, [filteredFriends]);
  const extendedRoster = useMemo<DisplayRosterEntry[]>(() => {
    const rosterNameSet = new Set(
      rosterWithAvatars.map((entry) => (entry.name || '').trim().toLowerCase()).filter((name) => name.length > 0),
    );
    const invitedExtras: DisplayRosterEntry[] = invites
      .filter((inv) => !rosterNameSet.has((inv.display_name || '').trim().toLowerCase()))
      .map((inv) => ({
        id: `invite:${inv.id}`,
        name: inv.display_name,
        ready: false,
        host: false,
        userId: null,
        avatarUrl: null,
        _inviteId: inv.id,
      }));
    return [...rosterWithAvatars, ...invitedExtras];
  }, [invites, rosterWithAvatars]);

  // Host sends current settings to server whenever they change (debounced by ref to avoid spam)
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (!isHost) return;
    if (draggingYear) return; // do not broadcast while dragging year range
    if (!initialSettingsSyncedRef.current) return;
    const enabled = !!timerEnabled;
    const last = lastSentSettingsRef.current;
    let next: { sec: number; enabled: boolean } | null = null;
    let payload: LobbyClientMessage | null = null as any;
    if (enabled) {
      // Normalize to UI range (5–300) and step to avoid server/client mismatches
      const raw = Number(roundTimerSec) || DEFAULT_COMPETE_TIMER_SEC;
      const clamped = Math.max(5, Math.min(300, Math.round(raw / 5) * 5));
      next = { sec: clamped, enabled: true };
      payload = { type: 'settings', timerSeconds: clamped, timerEnabled: true, yearMin: yearRangeRef.current[0], yearMax: yearRangeRef.current[1] } as any;
    } else {
      // When disabling, omit timerSeconds to satisfy server schema (min 5)
      next = { sec: 0, enabled: false };
      payload = { type: 'settings', timerEnabled: false, yearMin: yearRangeRef.current[0], yearMax: yearRangeRef.current[1] } as any;
    }
    if (payload) {
      try {
        ws.send(JSON.stringify(payload));
        lastSentSettingsRef.current = { ...next!, yearMin: yearRangeRef.current[0], yearMax: yearRangeRef.current[1] };
      } catch {}
    }
  }, [isHost, roundTimerSec, timerEnabled, yearRange[0], yearRange[1], draggingYear]);

  const copyInvite = useCallback(async () => {
    if (!roomCode) return;

    const computeInviteUrl = () => {
      const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${encodeURIComponent(roomCode)}` : '';
      return updateShareInviteUrl(inviteTokenRef.current ?? null) || shareInviteUrl || baseUrl;
    };

    try {
      if (!inviteTokenRef.current) {
        const ensured = await ensureRoomInviteToken(roomCode, 'sync');
        if (ensured) {
          inviteTokenRef.current = ensured;
        }
      }
      const inviteUrl = computeInviteUrl();
      if (!inviteUrl) return;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      const inviteUrl = computeInviteUrl();
      if (!inviteUrl) return;
      // Fallback: open prompt
      // eslint-disable-next-line no-alert
      window.prompt('Copy invite link:', inviteUrl);
    }
  }, [roomCode, shareInviteUrl, updateShareInviteUrl]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode.toUpperCase());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }, [roomCode]);

  const inviteFriend = useCallback(async (f: FriendEntry) => {
    if (!user?.id || !roomCode) return;

    if (roster.some((entry) => entry.userId && entry.userId === f.id)) {
      toast({ description: `${f.display_name} is already in this room.` });
      return;
    }

    if (invites.some((invite) => invite.friend_id === f.id)) {
      toast({ description: `${f.display_name} has already been invited.` });
      return;
    }

    try {
      const { error, data } = await supabase
        .from('room_invites')
        .insert([{ room_id: roomCode, inviter_user_id: user.id, friend_id: f.id }])
        .select('id')
        .single();

      if (error) {
        const code = (error as any)?.code as string | undefined;
        const message = (error as any)?.message as string | undefined;
        const isDuplicate = code === '23505' || code === '409' || (message ? /duplicate/i.test(message) : false);
        if (isDuplicate) {
          toast({ description: `${f.display_name} has already been invited.` });
          return;
        }
        throw error;
      }

      if (data?.id) {
        setInvites((prev) => [{ id: data.id, friend_id: f.id, display_name: f.display_name }, ...prev]);
      }
      toast({ description: `Invited ${f.display_name}` });
    } catch (e) {
      console.error('[Room] inviteFriend error', e);
      toast({ description: 'Failed to invite', variant: 'destructive' });
    }
  }, [user?.id, roomCode, roster, invites, toast]);

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

  const handleBack = useCallback(() => {
    navigate('/compete');
  }, [navigate]);

  // Round timer now uses Radix Slider, so no manual gradient calculations are needed.

  const parseTimerInput = useCallback((val: string): number | null => {
    const s = (val || '').trim().toLowerCase();
    if (!s) return null;
    // Support raw seconds, or formats like "90s", "2m"
    if (s.endsWith('m')) {
      const m = Number(s.slice(0, -1).trim());
      if (!Number.isFinite(m)) return null;
      return Math.round(m * 60);
    }
    if (s.endsWith('s')) {
      const sec = Number(s.slice(0, -1).trim());
      if (!Number.isFinite(sec)) return null;
      return Math.round(sec);
    }
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  }, []);

  const commitTimerInput = useCallback(() => {
    const raw = parseTimerInput(timerInput);
    if (raw == null) {
      setEditingTimer(false);
      return;
    }
    const clamped = Math.max(5, Math.min(300, raw));
    setEditingTimer(false);
    setLocalTimerSec(clamped);
    setRoundTimerSec(clamped);
  }, [parseTimerInput, timerInput, setRoundTimerSec]);

  const displayedYearRange = useMemo<[number, number]>(() => {
    return draggingYear && localYearRange ? localYearRange : yearRange;
  }, [draggingYear, localYearRange, yearRange]);

  const commitYearFromInput = useCallback((side: 'min' | 'max') => {
    const raw = Math.round(Number((yearInput || '').trim()));
    if (!Number.isFinite(raw)) {
      setEditingYearSide(null);
      return;
    }
    const clamped = Math.max(YEAR_RANGE_MIN, Math.min(YEAR_RANGE_MAX, raw));
    const base: [number, number] = [...yearRange] as [number, number];
    const next: [number, number] = side === 'min' ? [clamped, base[1]] : [base[0], clamped];
    const sanitized = sanitizeYearRange(next);
    setEditingYearSide(null);
    setYearRange(sanitized);
    try { settings.setYearRange(sanitized); } catch {}
  }, [yearInput, yearRange, settings]);

  const playerCount = roster.length || players.length;

  const renderChatCard = (extraClasses?: string) => (
    <section
      className={`rounded-2xl border border-[#3f424b] bg-[#333333] p-6${extraClasses ? ` ${extraClasses}` : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-4 w-4 text-white" />
          <h2 className="text-base font-semibold text-white">Chat</h2>
          <span className="text-xs text-neutral-400">{chat.length} message{chat.length === 1 ? '' : 's'}</span>
        </div>
        <button
          type="button"
          onClick={() => setChatCollapsed((v) => !v)}
          className="text-neutral-300 hover:text-white"
          aria-label={chatCollapsed ? 'Expand chat' : 'Collapse chat'}
        >
          {chatCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>
      {!chatCollapsed && (
        <>
          <div
            ref={chatListRef}
            className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-[#3f424b] bg-[#1d2026] px-4 py-3"
            aria-label="Chat messages"
          >
            {chat.length === 0 ? (
              <div className="text-sm text-neutral-400">No messages yet…</div>
            ) : (
              chat.map((c) => (
                <div key={c.id} className="pb-3 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="max-w-[70%] truncate text-sm font-semibold text-[#22d3ee]">{c.from}</span>
                    <span className="text-[10px] text-neutral-400">{formatChatTime(c.timestamp)}</span>
                  </div>
                  <div className="mt-1 break-words whitespace-pre-wrap text-sm text-neutral-200">{c.message}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex items-center gap-3 pt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder={status === 'open' ? 'Type a message…' : 'Connecting…'}
              className="flex-1 rounded-xl border border-white/25 bg-[#35373d] px-3 py-2 text-sm text-white caret-[#22d3ee] placeholder:text-[#22d3ee] placeholder:opacity-80 transition-colors focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Type a chat message"
              disabled={status !== 'open' || (isHost && !hasOtherParticipants)}
            />
            <Button
              type="button"
              onClick={sendChat}
              className="rounded-lg bg-[#22d3ee] px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#1cbfdb] disabled:bg-white/20 disabled:text-white/50"
              disabled={!input.trim() || status !== 'open' || (isHost && !hasOtherParticipants)}
            >
              Send
            </Button>
          </div>
        </>
      )}
    </section>
  );

  return (
    <div className="min-h-screen w-full bg-[#0b0b0f] text-white">
      <style>{`
        /* Radix-based sliders styling for compete theme */
        .room-year-range .slider-range { background: #22d3ee; }
        .room-year-range .slider-thumb { background: #101316; border-color: #22d3ee; box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.25); }
        .room-year-range .slider-thumb:focus-visible { outline: none; }
        .room-timer .slider-range { background: #22d3ee; }
        .room-timer .slider-thumb { background: #101316; border-color: #22d3ee; box-shadow: 0 0 0 4px rgba(34, 211, 238, 0.25); }
        .room-timer .slider-thumb:focus-visible { outline: none; }
      `}</style>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-28 pt-6 lg:gap-8">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-black/90 px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex w-full items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white transition-colors hover:text-neutral-200"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex flex-1 items-center justify-center text-center">
              <h1 className="text-2xl font-semibold text-white">Compete</h1>
            </div>
            <div className="hidden w-[52px] sm:block" aria-hidden="true" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:gap-8">
          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-[#3f424b] bg-[#333333] p-6">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
                  <Clock className="h-5 w-5 text-white" />
                  <span>Round Timer</span>
                </div>
                <div className="ml-auto flex items-center gap-2 text-sm font-semibold text-[#22d3ee]">
                  {isHost ? (
                    editingTimer ? (
                      <Input
                        autoFocus
                        value={timerInput}
                        onChange={(e) => setTimerInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitTimerInput(); if (e.key === 'Escape') setEditingTimer(false); }}
                        onBlur={() => setEditingTimer(false)}
                        className="h-7 w-24 rounded-md border border-[#3f424b] bg-[#1d2026] px-2 text-right text-sm text-white"
                        placeholder={`${Number(roundTimerSec || 120)}s`}
                        aria-label="Set round timer in seconds"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditingTimer(true); setTimerInput(String(Number(roundTimerSec || localTimerSec || 120))); }}
                        className="hover:text-[#b6ecff]"
                        aria-label="Edit round timer"
                      >
                        {formatTime(Number(isHost && draggingTimer ? localTimerSec : (roundTimerSec || 0)))}
                      </button>
                    )
                  ) : (
                    <span>{formatTime(Number(roundTimerSec || 0))}</span>
                  )}
                </div>
              </div>
              {isHost && (
                <div className="mt-4 room-timer">
                  <Slider
                    value={[Number(draggingTimer ? localTimerSec : (roundTimerSec || DEFAULT_COMPETE_TIMER_SEC))]}
                    min={5}
                    max={300}
                    step={5}
                    onValueChange={(vals) => {
                      const v = Array.isArray(vals) ? Number(vals[0]) : Number(vals as unknown as number);
                      setDraggingTimer(true);
                      setLocalTimerSec(v);
                    }}
                    onValueCommit={(vals) => {
                      const v = Array.isArray(vals) ? Number(vals[0]) : Number(vals as unknown as number);
                      commitTimerSeconds(v);
                    }}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-between text-xs text-white">
                    <span>5s</span>
                    <span>5m</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#3f424b] bg-[#333333] p-6">
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
                  <Calendar className="h-5 w-5 text-white" />
                  <span>Year Range</span>
                </div>
                <div className="ml-auto flex items-center gap-1 text-sm font-semibold text-[#22d3ee]">
                  {isHost && editingYearSide === 'min' ? (
                    <Input
                      autoFocus
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitYearFromInput('min'); if (e.key === 'Escape') setEditingYearSide(null); }}
                      onBlur={() => setEditingYearSide(null)}
                      className="h-7 w-20 rounded-md border border-[#3f424b] bg-[#1d2026] px-2 text-right text-sm text-white"
                      aria-label="Edit minimum year"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { if (isHost) { setEditingYearSide('min'); setYearInput(String(yearRange[0])); } }}
                      className="hover:text-[#b6ecff]"
                      aria-label="Edit minimum year"
                    >
                      {displayedYearRange[0]}
                    </button>
                  )}
                  <span className="px-1">—</span>
                  {isHost && editingYearSide === 'max' ? (
                    <Input
                      autoFocus
                      value={yearInput}
                      onChange={(e) => setYearInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') commitYearFromInput('max'); if (e.key === 'Escape') setEditingYearSide(null); }}
                      onBlur={() => setEditingYearSide(null)}
                      className="h-7 w-20 rounded-md border border-[#3f424b] bg-[#1d2026] px-2 text-right text-sm text-white"
                      aria-label="Edit maximum year"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => { if (isHost) { setEditingYearSide('max'); setYearInput(String(yearRange[1])); } }}
                      className="hover:text-[#b6ecff]"
                      aria-label="Edit maximum year"
                    >
                      {displayedYearRange[1]}
                    </button>
                  )}
                </div>
              </div>
              {isHost && (
                <div className="mt-4 room-year-range">
                  <Slider
                    value={displayedYearRange}
                    min={YEAR_RANGE_MIN}
                    max={YEAR_RANGE_MAX}
                    step={5}
                    onValueChange={(vals) => {
                      if (!Array.isArray(vals) || vals.length !== 2) return;
                      const a = Math.round(Number(vals[0]));
                      const b = Math.round(Number(vals[1]));
                      if (!draggingYear) setDraggingYear(true);
                      const sanitized = sanitizeYearRange([a, b] as [number, number]);
                      setLocalYearRange(sanitized);
                    }}
                    onPointerDown={() => setDraggingYear(true)}
                    onValueCommit={(vals) => {
                      if (!Array.isArray(vals) || vals.length !== 2) return;
                      const a = Math.round(Number(vals[0]));
                      const b = Math.round(Number(vals[1]));
                      const sanitized = sanitizeYearRange([a, b] as [number, number]);
                      setDraggingYear(false);
                      setLocalYearRange(null);
                      setYearRange(sanitized);
                      try { settings.setYearRange(sanitized); } catch {}
                    }}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-between text-xs text-white">
                    <span>{YEAR_RANGE_MIN}</span>
                    <span>{YEAR_RANGE_MAX}</span>
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            {isHost && (
              <Accordion
                type="single"
                collapsible
                value={inviteAccordionOpen ? 'invite-card' : ''}
                onValueChange={(val) => setInviteAccordionOpen(val === 'invite-card')}
                className="rounded-2xl border border-[#3f424b] bg-[#333333]"
              >
                <AccordionItem value="invite-card" className="overflow-hidden">
                  <AccordionTrigger className="flex items-center justify-between px-6 py-5 text-base font-semibold text-white">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-white" />
                      <span>Invite Your Friends</span>
                    </div>
                    {copied && <span className="text-xs font-semibold text-[#22d3ee]">Copied!</span>}
                  </AccordionTrigger>
                  <AccordionContent className="space-y-5 px-6 pb-6 pt-0">
                    <div>
                      <Label className="text-xs text-neutral-200">Share Room Code</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={roomCode.toUpperCase()}
                          readOnly
                          className="h-11 flex-1 rounded-[14px] border border-[#454852] bg-[#1d2026] text-lg font-semibold tracking-[0.28em] text-white"
                        />
                        <Button
                          onClick={copyCode}
                          size="icon"
                          className="h-11 w-11 bg-[#22d3ee] px-0 text-black hover:bg-[#1cbfdb]"
                          aria-label="Copy room code"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-neutral-400">Share this room code so friends can join.</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="flex items-center gap-2 text-neutral-400">
                          Or send them this link
                          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <button
                          type="button"
                          onClick={copyInvite}
                          className="inline-flex items-center gap-1 text-[#22d3ee] hover:text-[#b6ecff]"
                          aria-label="Copy invite link"
                        >
                          Copy link
                        </button>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-xs text-neutral-200">Send Invite</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                        <Input
                          placeholder="Filter your friends by name..."
                          value={searchTerm}
                          onChange={(e) => {
                            const value = e.target.value;
                            setSearchTerm(value);
                            if (value.trim().length > 0) {
                              setFriendsListVisible(true);
                            } else {
                              setFriendsListVisible(false);
                            }
                          }}
                          className="rounded-lg border border-[#454852] bg-[#1d2026] pl-9 text-sm text-white placeholder:text-neutral-500"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium text-[#22d3ee]">
                        <button
                          type="button"
                          className="hover:text-[#b6ecff]"
                          onClick={() => setFriendsListVisible((prev) => !prev)}
                        >
                          {friendsListVisible ? 'Hide Friends' : 'View Friends'}
                        </button>
                        <button
                          type="button"
                          className="hover:text-[#b6ecff]"
                          onClick={() => {
                            friendsModalOpenedRef.current = true;
                            setFriendsModalOpen(true);
                          }}
                        >
                          Manage Friends
                        </button>
                      </div>
                      {friendsListVisible && (
                        <div className="space-y-2">
                          {friendsLoading ? (
                            <div className="text-xs text-neutral-300">Loading friends…</div>
                          ) : limitedFriends.length === 0 ? (
                            <div className="text-xs text-neutral-300">No friends match your filter.</div>
                          ) : (
                            limitedFriends.map((f) => {
                              const friendSeed = f.id || f.display_name;
                              return (
                                <div key={f.id} className="flex items-center justify-between rounded-lg border border-[#3f424b] bg-[#1d2026] px-3 py-2">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="rounded-full p-[2px]"
                                      style={{ background: getAvatarFrameGradient(friendSeed) }}
                                    >
                                      <Avatar className="h-9 w-9 border border-[#1d2026] bg-[#262930]">
                                        <AvatarImage src={f.avatarUrl ?? avatarUrls[f.id] ?? undefined} alt={`${f.display_name} avatar`} />
                                        <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                                          {getInitial(f.display_name)}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <GradientName seed={friendSeed} className="text-sm font-semibold truncate">
                                      {f.display_name}
                                    </GradientName>
                                  </div>
                                  <Button
                                    onClick={() => inviteFriend(f)}
                                    size="sm"
                                    className="bg-[#22d3ee] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#1cbfdb]"
                                    aria-label="Invite friend"
                                  >
                                    Invite
                                  </Button>
                                </div>
                              );
                            })
                          )}
                          {hasMoreFriends && !friendsLoading && limitedFriends.length > 0 && (
                            <button
                              type="button"
                              className="text-left text-xs font-semibold text-[#22d3ee] hover:text-[#b6ecff]"
                              onClick={() => {
                                friendsModalOpenedRef.current = true;
                                setFriendsModalOpen(true);
                              }}
                            >
                              More
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            {renderChatCard('hidden lg:block')}

            <section className="rounded-2xl border border-[#3f424b] bg-[#333333] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-white" />
                  <h2 className="text-base font-semibold text-white">Players ({playerCount})</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400">
                  <span>Room {roomCode.toUpperCase()} · Status: {status}</span>
                  <button
                    type="button"
                    onClick={() => setPlayersCollapsed((prev) => !prev)}
                    className="text-neutral-300 hover:text-white"
                    aria-label={playersCollapsed ? 'Expand players list' : 'Collapse players list'}
                  >
                    {playersCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {!playersCollapsed && (
                <>
                  {extendedRoster.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {extendedRoster.map((r: any, index: number) => {
                        const isYou = r.id === ownId;
                        const showReadyTag = r.ready && typeof r._inviteId !== 'string' && !isYou;
                        const rosterSeed = r.userId || r.id || r.name;
                        return (
                          <div key={`${r.id}-${index}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3f424b] bg-[#1d2026] px-4 py-3">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <div
                                className="rounded-full p-[2.5px]"
                                style={{ background: getAvatarFrameGradient(rosterSeed) }}
                              >
                                <Avatar className="h-10 w-10 border border-[#1d2026] bg-[#262930]">
                                  <AvatarImage src={r.avatarUrl ?? undefined} alt={`${r.name} avatar`} />
                                  <AvatarFallback className="bg-transparent text-sm font-semibold text-white">
                                    {getInitial(r.name)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <GradientName seed={rosterSeed} className="truncate text-sm font-semibold">
                                    {isYou ? `(You) ${r.name}` : r.name}
                                  </GradientName>
                                  {r.host && <span className="flex-none rounded-full bg-[#22d3ee]/20 px-2 py-0.5 text-[10px] font-semibold text-[#22d3ee]">Host</span>}
                                  {typeof r._inviteId === 'string' && <span className="flex-none rounded-full bg-[#f97316]/15 px-2 py-0.5 text-[10px] font-semibold text-[#f97316]">Invited</span>}
                                </div>
                              </div>
                            </div>
                            <div className="ml-auto flex shrink-0 items-center gap-3">
                              {typeof r._inviteId === 'string' ? (
                                isHost && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-red-300 hover:text-red-200"
                                    onClick={() => cancelInvite(r._inviteId)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )
                              ) : isYou ? (
                                <button
                                  type="button"
                                  onClick={toggleReady}
                                  disabled={status !== 'open'}
                                  className={`rounded-xl px-4 py-1.5 text-xs font-semibold shadow-lg transition-colors ${ownReady ? 'bg-[#22d96d] text-black hover:bg-[#1fb862]' : 'attention-pulse bg-[#22d3ee] text-black hover:bg-[#1cbfdb]'}`}
                                  style={(!ownReady
                                    ? ({ '--attention-pulse-shadow-color': 'rgba(34, 211, 238, 0.35)' } as React.CSSProperties)
                                    : undefined)}
                                >
                                  {ownReady ? 'Ready!' : 'Ready?'}
                                </button>
                              ) : (
                                <>
                                  {showReadyTag ? (
                                    <span className="rounded-full bg-[#22d96d]/20 px-2 py-0.5 text-[10px] font-semibold text-[#22d96d]">Ready!</span>
                                  ) : (
                                    !r.ready && <span className="text-sm font-semibold text-neutral-200">Not ready</span>
                                  )}
                                  {isHost && r.id !== ownId && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-8 w-8 text-red-300 hover:text-red-200"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="max-w-md border border-[#3f424b] bg-[#1d2026] text-white">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remove player?</AlertDialogTitle>
                                          <AlertDialogDescription className="text-sm text-neutral-300">
                                            {r.name?.trim().length
                                              ? `Are you sure you want to remove ${r.name.trim()} from this room?`
                                              : 'Are you sure you want to remove this player from the room?'}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="border border-white/15 bg-transparent text-white hover:bg-white/10">
                                            Cancel
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => {
                                              removeRosterEntry(r.id, r.name);
                                              kickPlayer(r.id);
                                            }}
                                            className="bg-[#ef4444] text-white hover:bg-[#dc2626]"
                                          >
                                            Remove player
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-neutral-400">Waiting for players...</div>
                  )}
                </>
              )}
            </section>
          </aside>
        </div>

        {renderChatCard('lg:hidden')}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <div className="rounded-2xl border border-[#165f70] bg-[#0a2f3d] px-5 py-3 text-center">
            <div className="text-sm font-semibold text-[#22d3ee]">Waiting for players ({readyCount}/{playerCount} ready)</div>
            <div className="mt-1 text-xs text-neutral-200">All players must be ready to start</div>
          </div>
        </div>
      </div>

      <Dialog
        open={friendsModalOpen}
        onOpenChange={(open) => {
          setFriendsModalOpen(open);
          if (!open && friendsModalOpenedRef.current) {
            loadFriends();
            loadInvites();
            friendsModalOpenedRef.current = false;
            setFriendsListVisible(true);
          }
        }}
      >
        <DialogContent
          data-hide-close
          className="max-w-4xl w-[92vw] max-h-[85vh] overflow-y-auto border border-neutral-800 bg-black p-0 text-white"
        >
          <div className="sticky top-0 z-20 bg-black/85 px-4 py-4 backdrop-blur">
            <div className="relative flex items-center justify-center">
              <h2 className="text-xl font-semibold text-white">Friends</h2>
              <button
                type="button"
                aria-label="Close manage friends"
                onClick={() => setFriendsModalOpen(false)}
                className="absolute right-0 grid h-10 w-10 place-items-center rounded-full bg-[#22d3ee] text-black transition-colors hover:bg-[#1cbfdb] focus:outline-none focus:ring-2 focus:ring-[#22d3ee]/60 focus:ring-offset-2 focus:ring-offset-black"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="p-4 pt-2">
            <FriendsPage showHeading={false} />
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Room;
