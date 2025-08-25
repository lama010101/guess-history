import { useCallback, useEffect, useRef, useState } from 'react';

export type UseNextRoundTimerOptions = {
  durationMs: number;
  enabled?: boolean; // if false, the timer is disabled entirely
  autoStart?: boolean; // start immediately on mount
  onExpire?: () => void; // called once when countdown completes
  tickMs?: number; // default 1000
};

export type NextRoundTimerControls = {
  start: () => void;
  pause: () => void;
  reset: (nextDurationMs?: number) => void;
  setRemaining: (ms: number) => void;
};

export function useNextRoundTimer(
  options: UseNextRoundTimerOptions
): { remainingMs: number; isActive: boolean; controls: NextRoundTimerControls } {
  const { durationMs, enabled = true, autoStart = false, onExpire, tickMs = 1000 } = options;

  const [remainingMs, setRemainingMs] = useState(Math.max(0, durationMs));
  const [isActive, setIsActive] = useState(Boolean(autoStart && enabled));

  const firedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const maybeFire = useCallback(() => {
    if (!firedRef.current) {
      firedRef.current = true;
      onExpire?.();
    }
  }, [onExpire]);

  const start = useCallback(() => {
    if (!enabled) return;
    setIsActive(true);
  }, [enabled]);

  const pause = useCallback(() => setIsActive(false), []);

  const reset = useCallback(
    (nextDurationMs?: number) => {
      const next = Math.max(0, nextDurationMs ?? durationMs);
      setRemainingMs(next);
      firedRef.current = false;
      if (enabled && autoStart) setIsActive(true);
      else setIsActive(false);
    },
    [autoStart, durationMs, enabled]
  );

  const setRemaining = useCallback((ms: number) => setRemainingMs(Math.max(0, ms)), []);

  useEffect(() => {
    if (!isActive || !enabled) {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setRemainingMs((prev) => {
        const next = Math.max(0, prev - tickMs);
        if (next === 0) {
          if (intervalRef.current != null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsActive(false);
          maybeFire();
        }
        return next;
      });
    }, tickMs);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, isActive, maybeFire, tickMs]);

  return { remainingMs, isActive, controls: { start, pause, reset, setRemaining } };
}
