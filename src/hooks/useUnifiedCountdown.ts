import { useCallback, useEffect, useMemo, useState } from 'react';
import { useServerCountdown } from '@/hooks/useServerCountdown';
import { useCountdown } from '@/timer/hooks/useCountdown';

export type UseUnifiedCountdownOptions = {
  timerId: string; // canonical game/round id, e.g. gh:{gameId}:{roundIndex}
  durationSec: number; // required when autoStart is true
  autoStart: boolean; // gated by game logic (timerEnabled && roundStarted && hasUser && timerId)
  useServerPreferred?: boolean; // default true
  hasUser?: boolean; // default false; used to decide server eligibility
  onExpire?: () => void; // called exactly once
  intervalMs?: number; // server tick interval (local uses 200ms internally)
};

export type UseUnifiedCountdown = {
  ready: boolean;
  expired: boolean;
  remainingSec: number;
  refetch: () => Promise<unknown | null>;
  mode: 'server' | 'local';
  clamp: (seconds: number) => void;
};

// Local persistent session helpers scoped to a dynamic key per timerId
// We don't alter TIMER_CONFIG here to avoid impacting the /timer pages.
const localKeyFor = (timerId: string) => `gh-timer/game/${timerId || 'unknown'}`;
const endedKeyFor = (timerId: string) => `${localKeyFor(timerId)}:ended`;

type LocalSessionV1 = {
  version: 1;
  startAt: number; // epoch ms
  durationMs: number;
};

function readLocal(timerId: string): LocalSessionV1 | null {
  try {
    const raw = localStorage.getItem(localKeyFor(timerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed === 'object' &&
      parsed.version === 1 && typeof parsed.startAt === 'number' && parsed.startAt > 0 &&
      typeof parsed.durationMs === 'number' && parsed.durationMs > 0
    ) {
      return parsed as LocalSessionV1;
    }
    localStorage.removeItem(localKeyFor(timerId));
    return null;
  } catch (e) {
    try { console.warn('[useUnifiedCountdown] readLocal failed', e); } catch {}
    return null;
  }
}

function writeLocal(timerId: string, sess: LocalSessionV1) {
  try {
    localStorage.setItem(localKeyFor(timerId), JSON.stringify(sess));
  } catch (e) {
    try { console.warn('[useUnifiedCountdown] writeLocal failed', e); } catch {}
  }
}

function readEnded(timerId: string): number | null {
  try {
    const raw = localStorage.getItem(endedKeyFor(timerId));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function useUnifiedCountdown(options: UseUnifiedCountdownOptions): UseUnifiedCountdown {
  const {
    timerId,
    durationSec,
    autoStart,
    useServerPreferred = true,
    hasUser = false,
    onExpire,
    intervalMs = 250,
  } = options;

  // Decide mode
  const shouldUseServer = useMemo(() => {
    return Boolean(useServerPreferred && autoStart && hasUser && timerId);
  }, [useServerPreferred, autoStart, hasUser, timerId]);

  // Track which mode we landed on so it doesn't flap during a render
  const chosenMode: 'server' | 'local' = shouldUseServer ? 'server' : 'local';

  // SERVER MODE
  const server = useServerCountdown({
    timerId,
    durationSec,
    autoStart: (chosenMode === 'server' && autoStart) || (shouldUseServer && !autoStart),
    intervalMs,
    onExpire,
    disabled: chosenMode !== 'server',
  });

  // LOCAL MODE (persistent per timerId)
  const [localReady, setLocalReady] = useState(false);
  const [localExpired, setLocalExpired] = useState(false);
  const [localStartAt, setLocalStartAt] = useState<number | null>(null);
  const [localDurationMs, setLocalDurationMs] = useState<number>(Math.max(0, durationSec * 1000));

  // create or hydrate local session when in local mode
  useEffect(() => {
    if (chosenMode !== 'local') return;

    // Always use latest duration
    const durMs = Math.max(0, durationSec * 1000);
    setLocalDurationMs(durMs);

    // If already ended in another tab, mark expired immediately
    const endedAt = readEnded(timerId);
    if (endedAt) {
      setLocalStartAt(null);
      setLocalReady(true);
      setLocalExpired(true);
      return;
    }

    const existing = readLocal(timerId);

    if (existing) {
      setLocalStartAt(existing.startAt);
      setLocalReady(true);
      setLocalExpired(false);
      return;
    }

    if (autoStart && durMs > 0) {
      const startAt = Date.now();
      const sess: LocalSessionV1 = { version: 1, startAt, durationMs: durMs };
      writeLocal(timerId, sess);
      setLocalStartAt(startAt);
      setLocalReady(true);
      setLocalExpired(false);
    } else {
      // Not started; still ready but not expired. Remaining will equal durationSec.
      setLocalStartAt(null);
      setLocalReady(true);
      setLocalExpired(false);
    }
  }, [chosenMode, timerId, durationSec, autoStart]);

  // Cross-tab sync for local mode
  useEffect(() => {
    if (chosenMode !== 'local') return;
    const key = localKeyFor(timerId);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      const s = readLocal(timerId);
      if (s) {
        setLocalStartAt(s.startAt);
        setLocalDurationMs(s.durationMs);
        setLocalExpired(false);
        setLocalReady(true);
      }
    };
    window.addEventListener('storage', onStorage);
    const endKey = endedKeyFor(timerId);
    const onStorageEnded = (e: StorageEvent) => {
      if (e.key !== endKey) return;
      // Any set on end key marks local as expired
      setLocalExpired(true);
      setLocalReady(true);
    };
    window.addEventListener('storage', onStorageEnded);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('storage', onStorageEnded);
    };
  }, [chosenMode, timerId]);

  const { remainingMs: localRemainingMs } = useCountdown({
    durationMs: localDurationMs,
    startAt: localStartAt ?? Date.now() + localDurationMs, // if not started, pretend far-future so remaining==duration
    onFinished: () => {
      // Do not mark expired or emit onExpire if the timer hasn't actually started
      // or if the duration is zero. This avoids immediate timeouts in Solo mode.
      if (localExpired) return;
      if (!autoStart || localDurationMs <= 0 || localStartAt == null) {
        return;
      }
      // cross-tab guard: set ended sentinel first
      try {
        if (!readEnded(timerId)) {
          localStorage.setItem(endedKeyFor(timerId), String(Date.now()));
        }
      } catch {}
      setLocalExpired(true);
      try { onExpire?.(); } catch {}
    },
    tickMs: 200,
  });

  const ready = chosenMode === 'server' ? server.ready : localReady;
  const expired = chosenMode === 'server' ? server.expired : localExpired;
  const remainingSec = useMemo(() => {
    if (chosenMode === 'server') return server.remainingSec;
    return Math.ceil(Math.max(0, localRemainingMs) / 1000);
  }, [chosenMode, server.remainingSec, localRemainingMs]);

  const refetch = useCallback(async () => {
    if (chosenMode === 'server') return server.refetch();
    // Local refetch: re-hydrate from storage
    const endedAt = readEnded(timerId);
    if (endedAt) {
      setLocalStartAt(null);
      setLocalReady(true);
      setLocalExpired(true);
      return { endedAt };
    }
    const sess = readLocal(timerId);
    if (sess) {
      setLocalStartAt(sess.startAt);
      setLocalDurationMs(sess.durationMs);
      setLocalReady(true);
      setLocalExpired(false);
      return sess;
    }
    return null;
  }, [chosenMode, server, timerId]);

  const clamp = useCallback((seconds: number) => {
    const secs = Math.max(0, Math.floor(seconds));
    if (chosenMode === 'server') {
      return;
    }

    const ms = secs * 1000;
    if (ms <= 0) {
      try { localStorage.removeItem(localKeyFor(timerId)); } catch {}
      try { localStorage.setItem(endedKeyFor(timerId), String(Date.now())); } catch {}
      setLocalStartAt(null);
      setLocalDurationMs(0);
      setLocalExpired(true);
      setLocalReady(true);
      return;
    }

    const startAt = Date.now();
    const sess: LocalSessionV1 = { version: 1, startAt, durationMs: ms };
    writeLocal(timerId, sess);
    try { localStorage.removeItem(endedKeyFor(timerId)); } catch {}
    setLocalStartAt(startAt);
    setLocalDurationMs(ms);
    setLocalExpired(false);
    setLocalReady(true);
  }, [chosenMode, timerId]);

  return { ready, expired, remainingSec, refetch, mode: chosenMode, clamp };
}
