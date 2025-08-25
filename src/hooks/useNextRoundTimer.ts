import { useCallback, useEffect, useRef, useState } from 'react';

export interface NextRoundTimerOptions {
  durationMs: number;
  enabled?: boolean; // default false
  autoStart?: boolean; // default false
  onExpire?: () => void;
  tickMs?: number; // default 1000
}

export interface NextRoundTimerControls {
  start: () => void;
  pause: () => void;
  reset: (newDurationMs?: number) => void;
  setRemaining: (ms: number) => void;
}

export function useNextRoundTimer(options: NextRoundTimerOptions) {
  const { durationMs, enabled = false, autoStart = false, onExpire, tickMs = 1000 } = options;

  const [remainingMs, setRemainingMs] = useState<number>(Math.max(0, enabled ? durationMs : 0));
  const [isActive, setIsActive] = useState<boolean>(false);

  const intervalRef = useRef<number | null>(null);
  const onExpireRef = useRef<typeof onExpire>();
  onExpireRef.current = onExpire;

  // Stop interval helper
  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    setRemainingMs((prev) => {
      const next = Math.max(0, prev - tickMs);
      if (next === 0) {
        // We will stop the interval in the effect reacting to remainingMs === 0
      }
      return next;
    });
  }, [tickMs]);

  const start = useCallback(() => {
    if (!enabled || isActive || remainingMs <= 0) return;
    setIsActive(true);
  }, [enabled, isActive, remainingMs]);

  const pause = useCallback(() => {
    setIsActive(false);
  }, []);

  const reset = useCallback((newDuration?: number) => {
    const ms = Math.max(0, newDuration ?? durationMs);
    setRemainingMs(ms);
    setIsActive(false);
  }, [durationMs]);

  const setRemaining = useCallback((ms: number) => {
    setRemainingMs(Math.max(0, ms));
  }, []);

  // Manage interval lifecycle when isActive changes
  useEffect(() => {
    if (!enabled || !isActive) {
      clearTimer();
      return;
    }
    // Only start interval if there is time left
    if (remainingMs <= 0) {
      clearTimer();
      setIsActive(false);
      return;
    }
    intervalRef.current = window.setInterval(tick, tickMs) as unknown as number;
    return () => clearTimer();
  }, [enabled, isActive, remainingMs, tick, tickMs, clearTimer]);

  // Handle enabled flag and autoStart
  useEffect(() => {
    if (!enabled) {
      // Disable timer entirely
      setIsActive(false);
      setRemainingMs(0);
      clearTimer();
      return;
    }
    // When enabled toggles on or duration changes, set remaining to duration
    setRemainingMs(Math.max(0, durationMs));
    if (autoStart && durationMs > 0) {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [enabled, durationMs, autoStart, clearTimer]);

  // Fire onExpire once when time hits zero while active
  const didFireRef = useRef<boolean>(false);
  useEffect(() => {
    if (remainingMs === 0 && enabled) {
      // Stop the timer and trigger onExpire once
      if (isActive) setIsActive(false);
      clearTimer();
      if (!didFireRef.current) {
        didFireRef.current = true;
        onExpireRef.current?.();
      }
    } else {
      // Reset fire guard when time moves above zero
      didFireRef.current = false;
    }
  }, [remainingMs, enabled, isActive, clearTimer]);

  const controls: NextRoundTimerControls = {
    start,
    pause,
    reset,
    setRemaining,
  };

  return { remainingMs, isActive, controls } as const;
}
