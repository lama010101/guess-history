import { useCallback, useEffect, useRef, useState } from 'react';

export type UseRoundTimerOptions = {
  // Initial duration in milliseconds
  durationMs: number;
  // If false, the timer logic is disabled entirely
  enabled?: boolean;
  // If true, timer starts running on mount (when enabled)
  autoStart?: boolean;
  // Called once when remainingMs reaches 0
  onTimeout?: () => void;
  // Tick resolution in ms (default 1000)
  tickMs?: number;
};

export type RoundTimerControls = {
  start: () => void;
  pause: () => void;
  reset: (nextDurationMs?: number) => void;
  setRemaining: (ms: number) => void;
};

export type UseRoundTimerReturn = {
  remainingMs: number;
  isActive: boolean;
  controls: RoundTimerControls;
};

/**
 * A simple, reusable countdown timer hook for game rounds.
 *
 * - Non-invasive: does not alter UI; components decide how to render.
 * - Reliable: guarantees onTimeout triggers exactly once per cycle.
 * - Flexible: supports pause/resume/reset and dynamic duration updates.
 */
export function useRoundTimer(options: UseRoundTimerOptions): UseRoundTimerReturn {
  const {
    durationMs,
    enabled = true,
    autoStart = false,
    onTimeout,
    tickMs = 1000,
  } = options;

  const [remainingMs, setRemainingMs] = useState<number>(Math.max(0, durationMs));
  const [isActive, setIsActive] = useState<boolean>(Boolean(autoStart && enabled));

  const timeoutFiredRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // Ensure onTimeout only fires once per countdown cycle
  const maybeFireTimeout = useCallback(() => {
    if (!timeoutFiredRef.current) {
      timeoutFiredRef.current = true;
      onTimeout?.();
    }
  }, [onTimeout]);

  // Start/pause/reset controls
  const start = useCallback(() => {
    if (!enabled) return;
    setIsActive(true);
  }, [enabled]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback(
    (nextDurationMs?: number) => {
      const next = Math.max(0, nextDurationMs ?? durationMs);
      setRemainingMs(next);
      timeoutFiredRef.current = false;
      if (enabled && autoStart) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    },
    [autoStart, durationMs, enabled]
  );

  const setRemaining = useCallback((ms: number) => {
    setRemainingMs(Math.max(0, ms));
  }, []);

  // Keep internal remainingMs in sync when durationMs changes (and timer is not actively counting)
  useEffect(() => {
    if (!isActive) {
      setRemainingMs(Math.max(0, durationMs));
      timeoutFiredRef.current = false;
    }
    // Only react on duration changes when not active to avoid abrupt jumps while running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  // Timer ticking logic
  useEffect(() => {
    if (!enabled || !isActive) {
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
          // Stop interval first to avoid duplicate calls
          if (intervalRef.current != null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // pause the timer and fire timeout once
          setIsActive(false);
          maybeFireTimeout();
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
  }, [enabled, isActive, maybeFireTimeout, tickMs]);

  return {
    remainingMs,
    isActive,
    controls: { start, pause, reset, setRemaining },
  };
}
