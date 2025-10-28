import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCountdown } from '@/timer/hooks/useCountdown';

export type UseSoloTimerOptions = {
  durationSec: number;
  autoStart: boolean;
  onExpire?: () => void;
  tickMs?: number;
  enabled?: boolean;
};

export type UseSoloTimer = {
  ready: boolean;
  expired: boolean;
  remainingSec: number;
  clamp: (seconds: number) => void;
  reset: (durationSec?: number) => void;
};

export function useSoloTimer(options: UseSoloTimerOptions): UseSoloTimer {
  const { durationSec, autoStart, onExpire, tickMs = 200, enabled = true } = options;

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [startAt, setStartAt] = useState<number | null>(null);
  const [durationMs, setDurationMs] = useState<number>(Math.max(0, durationSec * 1000));

  useEffect(() => {
    setDurationMs(Math.max(0, durationSec * 1000));
  }, [durationSec]);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    if (durationMs <= 0) {
      setStartAt(null);
      setReady(true);
      setExpired(true);
      return;
    }
    if (autoStart) {
      setStartAt((prev) => prev ?? Date.now());
      setReady(true);
      setExpired(false);
    } else {
      setStartAt(null);
      setReady(true);
      setExpired(false);
    }
  }, [enabled, autoStart, durationMs]);

  const { remainingMs } = useCountdown({
    durationMs,
    startAt: startAt ?? (Date.now() + durationMs),
    onFinished: () => {
      if (!enabled) return;
      if (expired) return;
      setExpired(true);
      try { onExpire?.(); } catch {}
    },
    tickMs,
  });

  const remainingSec = useMemo(() => {
    if (!enabled) return Math.ceil(Math.max(0, durationMs) / 1000);
    return Math.ceil(Math.max(0, remainingMs) / 1000);
  }, [enabled, remainingMs, durationMs]);

  const clamp = useCallback((seconds: number) => {
    const secs = Math.max(0, Math.floor(seconds));
    const ms = secs * 1000;
    if (ms <= 0) {
      setStartAt(null);
      setDurationMs(0);
      setExpired(true);
      setReady(true);
      return;
    }
    const now = Date.now();
    setStartAt(now);
    setDurationMs(ms);
    setExpired(false);
    setReady(true);
  }, []);

  const reset = useCallback((nextDurationSec?: number) => {
    const nextMs = Math.max(0, (nextDurationSec ?? durationSec) * 1000);
    setDurationMs(nextMs);
    setExpired(false);
    if (autoStart && nextMs > 0) {
      setStartAt(Date.now());
      setReady(true);
    } else {
      setStartAt(null);
      setReady(true);
    }
  }, [autoStart, durationSec]);

  return { ready, expired, remainingSec, clamp, reset };
}
