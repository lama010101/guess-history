import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCountdown } from '@/timer/hooks/useCountdown';

// A dedicated local game timer that mirrors the logic of /timer:
// - persisted session per timerId in localStorage
// - multi-tab synchronisation via storage events
// - single onExpire invocation ensured via an ":ended" sentinel key
// - independent of unified/server timers

export type UseGameLocalCountdownOptions = {
  timerId: string; // e.g., gh:{gameId}:{roundIndex}
  durationSec: number; // seconds
  autoStart: boolean; // start when true (gated by game logic)
  onExpire?: () => void; // called once when expired
  tickMs?: number; // local tick interval; default 200ms (to match /timer)
};

export type UseGameLocalCountdown = {
  ready: boolean;
  expired: boolean;
  remainingSec: number; // ceil(seconds)
  start: () => void; // explicit start (writes a session if not exists)
  reset: () => void; // clear local session and ended sentinel
  clampRemaining: (seconds: number) => void; // force remaining duration to provided seconds
};

// Storage keys (scoped per timerId)
const keyForSession = (timerId: string) => `gh-game-timer/session/${timerId || 'unknown'}`;
const keyForEnded = (timerId: string) => `${keyForSession(timerId)}:ended`;

// Local session shape mirroring /timer session essentials
interface LocalSessionV1 {
  version: 1;
  durationMs: number;
  startAt: number; // epoch ms
  createdAt: number; // epoch ms
}

function readSession(timerId: string): LocalSessionV1 | null {
  try {
    const raw = localStorage.getItem(keyForSession(timerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed && typeof parsed === 'object' &&
      parsed.version === 1 &&
      typeof parsed.durationMs === 'number' && parsed.durationMs > 0 &&
      typeof parsed.startAt === 'number' && parsed.startAt > 0 &&
      typeof parsed.createdAt === 'number' && parsed.createdAt > 0
    ) {
      return parsed as LocalSessionV1;
    }
    localStorage.removeItem(keyForSession(timerId));
    return null;
  } catch {
    return null;
  }
}

function writeSession(timerId: string, sess: LocalSessionV1) {
  try {
    localStorage.setItem(keyForSession(timerId), JSON.stringify(sess));
  } catch {}
}

function clearSession(timerId: string) {
  try {
    localStorage.removeItem(keyForSession(timerId));
  } catch {}
}

function readEnded(timerId: string): number | null {
  try {
    const raw = localStorage.getItem(keyForEnded(timerId));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeEnded(timerId: string) {
  try {
    localStorage.setItem(keyForEnded(timerId), String(Date.now()));
  } catch {}
}

function clearEnded(timerId: string) {
  try {
    localStorage.removeItem(keyForEnded(timerId));
  } catch {}
}

export function useGameLocalCountdown(options: UseGameLocalCountdownOptions): UseGameLocalCountdown {
  const { timerId, durationSec, autoStart, onExpire, tickMs = 200 } = options;

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number>(() => Math.max(0, durationSec * 1000));
  const [virtualStartAt, setVirtualStartAt] = useState<number>(() => Date.now() + Math.max(0, durationSec * 1000));

  // Keep duration in sync with props ONLY when no active session exists yet.
  // If a session is already running (startAt != null) or has ended, do not overwrite
  // the persisted duration mid-round to avoid rewinding after refresh.
  useEffect(() => {
    if (startAt == null && !expired) {
      setDurationMs(Math.max(0, durationSec * 1000));
    }
  }, [durationSec, startAt, expired]);

  // Hydrate existing session or start a new one when autoStart becomes true
  useEffect(() => {
    if (!timerId) return;

    // Prefer an existing active session if present
    const existing = readSession(timerId);
    // If already ended in another tab/session, only treat as expired when the timer had actually started
    // (i.e., we either have an existing session or autoStart is true). This avoids false-expire on fresh rounds.
    const endedAt = readEnded(timerId);
    if (endedAt && (existing != null || autoStart) && durationMs > 0) {
      setReady(true);
      setExpired(true);
      setStartAt(null);
      return;
    }

    if (existing) {
      // Hydrate both startAt and duration from the persisted session
      setStartAt(existing.startAt);
      setDurationMs(existing.durationMs);
      setReady(true);
      setExpired(false);
      return;
    }

    if (autoStart && durationMs > 0) {
      const s: LocalSessionV1 = {
        version: 1,
        durationMs,
        startAt: Date.now(),
        createdAt: Date.now(),
      };
      writeSession(timerId, s);
      setStartAt(s.startAt);
      setReady(true);
      setExpired(false);
    } else {
      // Not started yet; still ready (remaining == duration)
      setStartAt(null);
      setReady(true);
      setExpired(false);
    }
  }, [timerId, autoStart, durationMs]);

  // Multi-tab sync for session changes and ended sentinel
  useEffect(() => {
    if (!timerId) return;
    const sessKey = keyForSession(timerId);
    const endedKey = keyForEnded(timerId);

    const onStorage = (e: StorageEvent) => {
      if (e.key === sessKey) {
        const s = readSession(timerId);
        if (s) {
          setStartAt(s.startAt);
          setDurationMs(s.durationMs);
          setExpired(false);
          setReady(true);
        }
      } else if (e.key === endedKey) {
        // Respect ended sentinel only for active timers
        if (autoStart && durationMs > 0) {
          setExpired(true);
          setReady(true);
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [timerId]);

  // Local ticking using the shared /timer countdown hook
  useEffect(() => {
    if (startAt != null) {
      setVirtualStartAt(startAt);
      return;
    }

    if (expired) {
      // Keep display at zero once the timer has expired until reset/next round
      setVirtualStartAt(Date.now() - durationMs);
      return;
    }

    setVirtualStartAt(Date.now() + durationMs);
  }, [startAt, expired, durationMs]);

  const { remainingMs } = useCountdown({
    durationMs,
    startAt: virtualStartAt,
    onFinished: () => {
      // Do not fire timeout if the timer hasn't actually started yet or has zero duration.
      // This protects Solo mode when autoStart is false or durationSec is 0.
      if (expired) return;
      if (startAt == null || durationMs <= 0) {
        // Not started: keep session in a non-expired, ready state and do not emit onExpire
        return;
      }
      writeEnded(timerId);
      setExpired(true);
      try { onExpire?.(); } catch {}
    },
    tickMs,
  });

  const clampRemaining = useCallback((seconds: number) => {
    const clampedSec = Math.max(0, Math.floor(seconds));
    const ms = clampedSec * 1000;
    const now = Date.now();

    if (!timerId) {
      setDurationMs(ms);
      setStartAt(ms > 0 ? now : null);
      setExpired(ms <= 0);
      setReady(true);
      return;
    }

    if (ms <= 0) {
      clearSession(timerId);
      writeEnded(timerId);
      setDurationMs(0);
      setStartAt(null);
      setExpired(true);
      setReady(true);
      return;
    }

    const session: LocalSessionV1 = {
      version: 1,
      durationMs: ms,
      startAt: now,
      createdAt: now,
    };

    writeSession(timerId, session);
    clearEnded(timerId);
    setDurationMs(ms);
    setStartAt(session.startAt);
    setExpired(false);
    setReady(true);
  }, [timerId]);

  const remainingSec = useMemo(() => {
    return Math.ceil(Math.max(0, remainingMs) / 1000);
  }, [remainingMs]);

  const start = useCallback(() => {
    if (!timerId) return;
    // don't restart if ended already
    if (readEnded(timerId)) return;

    const existing = readSession(timerId);
    if (existing) return; // already running

    const s: LocalSessionV1 = {
      version: 1,
      durationMs,
      startAt: Date.now(),
      createdAt: Date.now(),
    };
    writeSession(timerId, s);
    setStartAt(s.startAt);
    setReady(true);
    setExpired(false);
  }, [timerId, durationMs]);

  const reset = useCallback(() => {
    if (!timerId) return;
    clearSession(timerId);
    clearEnded(timerId);
    setStartAt(null);
    setExpired(false);
    setReady(true);
  }, [timerId]);

  return { ready, expired, remainingSec, start, reset, clampRemaining };
}
