import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMER_CONFIG } from '../config/timerConfig';

export interface UseCountdownArgs {
  durationMs: number;
  startAt: number; // epoch ms
  onFinished?: () => void;
  tickMs?: number; // default 200ms
}

export function useCountdown({ durationMs, startAt, onFinished, tickMs = 200 }: UseCountdownArgs) {
  const [now, setNow] = useState<number>(() => Date.now());
  const finishedRef = useRef(false);

  const remainingMs = useMemo(() => {
    const rem = Math.max(0, durationMs - (now - startAt));
    return rem;
  }, [durationMs, startAt, now]);

  const percentageLeft = useMemo(() => {
    const pct = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));
    return pct;
  }, [remainingMs, durationMs]);

  useEffect(() => {
    // Warn if clock drift leads to large negative remainder
    const earlyRemaining = durationMs - (Date.now() - startAt);
    if (earlyRemaining < -TIMER_CONFIG.DRIFT_WARN_SECONDS * 1000) {
      console.warn('[timer] Detected potential system clock change/drift', {
        earlyRemaining,
        startAt,
        durationMs,
        now: Date.now(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    finishedRef.current = false;
  }, [durationMs, startAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  useEffect(() => {
    if (remainingMs <= 0 && !finishedRef.current) {
      finishedRef.current = true;
      onFinished?.();
    }
  }, [remainingMs, onFinished]);

  return { remainingMs, isFinished: remainingMs <= 0, percentageLeft } as const;
}
