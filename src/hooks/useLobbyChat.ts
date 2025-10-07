import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { partyUrl, LobbyClientMessage, LobbyServerMessage } from '@/lib/partyClient';

export interface LobbyChatMessage {
  id: string;
  from: string;
  message: string;
  timestamp: string;
}

interface UseLobbyChatOptions {
  roomCode: string | null | undefined;
  displayName: string;
  userId?: string | null;
  enabled?: boolean;
}

const MAX_RETRIES = 5;
const MAX_BACKOFF_MS = 30000;

const isoNow = () => new Date().toISOString();

type LobbyChatStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'full';

export function useLobbyChat({
  roomCode,
  displayName,
  userId,
  enabled = true,
}: UseLobbyChatOptions) {
  const [status, setStatus] = useState<LobbyChatStatus>('idle');
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentNameRef = useRef('');
  const latestDisplayNameRef = useRef(displayName.trim());
  const latestUserIdRef = useRef<string | undefined>(userId ?? undefined);
  const statusRef = useRef<LobbyChatStatus>('idle');

  const cleanup = useCallback(() => {
    try {
      wsRef.current?.close();
    } catch {
      /* noop */
    }
    wsRef.current = null;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!enabled) return;
    if (!roomCode) return;
    if (retryRef.current >= MAX_RETRIES) {
      setStatus('closed');
      return;
    }
    retryRef.current += 1;
    const delay = Math.min(1000 * 2 ** (retryRef.current - 1), MAX_BACKOFF_MS);
    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomCode]);

  const connect = useCallback(() => {
    cleanup();

    if (!enabled || !roomCode) {
      setStatus(enabled ? 'closed' : 'idle');
      return;
    }

    try {
      const url = partyUrl('lobby', roomCode);
      const ws = new WebSocket(url);
      wsRef.current = ws;
      setStatus('connecting');
      setLastError(null);

      ws.addEventListener('open', () => {
        retryRef.current = 0;
        setStatus('open');
        const joinName = latestDisplayNameRef.current.trim();
        const payload: LobbyClientMessage = {
          type: 'join',
          name: joinName,
          userId: latestUserIdRef.current,
        };
        try {
          ws.send(JSON.stringify(payload));
          lastSentNameRef.current = joinName;
        } catch (err) {
          setLastError(err instanceof Error ? err.message : String(err));
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data as string) as LobbyServerMessage;
          if (!data || typeof data !== 'object' || !('type' in data)) return;
          switch (data.type) {
            case 'chat':
              if (
                typeof data.from === 'string' &&
                typeof data.message === 'string' &&
                typeof data.timestamp === 'string'
              ) {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}-${prev.length}`,
                    from: data.from,
                    message: data.message,
                    timestamp: data.timestamp,
                  },
                ]);
              }
              break;
            case 'full':
              setStatus('full');
              break;
            default:
              // Ignore other lobby messages in chat context
              break;
          }
        } catch (err) {
          setLastError(err instanceof Error ? err.message : String(err));
        }
      });

      ws.addEventListener('close', () => {
        if (statusRef.current === 'full') return;
        setStatus('closed');
        scheduleReconnect();
      });

      ws.addEventListener('error', (err) => {
        setLastError(err instanceof Error ? err.message : 'WebSocket error');
        try { ws.close(); } catch { /* noop */ }
      });
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
      scheduleReconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanup, enabled, roomCode, scheduleReconnect]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    latestDisplayNameRef.current = displayName.trim();
  }, [displayName]);

  useEffect(() => {
    latestUserIdRef.current = userId ?? undefined;
  }, [userId]);

  useEffect(() => {
    if (!enabled || !roomCode) {
      cleanup();
      setMessages([]);
      setStatus(enabled ? 'closed' : 'idle');
      return;
    }
    connect();
    return () => {
      cleanup();
    };
  }, [enabled, roomCode, cleanup, connect]);

  useEffect(() => {
    const ws = wsRef.current;
    const nextName = latestDisplayNameRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (nextName.length === 0 || nextName === lastSentNameRef.current) return;
    const payload: LobbyClientMessage = { type: 'rename', name: nextName };
    try {
      ws.send(JSON.stringify(payload));
      lastSentNameRef.current = nextName;
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
    }
  }, [displayName]);

  const sendMessage = useCallback((rawMessage: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    const trimmed = rawMessage.trim();
    if (!trimmed) return false;
    const payload: LobbyClientMessage = {
      type: 'chat',
      message: trimmed,
      timestamp: isoNow(),
    };
    try {
      ws.send(JSON.stringify(payload));
      return true;
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err));
      return false;
    }
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
  }, []);

  const derivedStatus = useMemo<LobbyChatStatus>(() => {
    if (!enabled) return 'idle';
    return status;
  }, [enabled, status]);

  return {
    status: derivedStatus,
    messages,
    sendMessage,
    resetChat,
    lastError,
  };
}
