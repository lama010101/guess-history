import { useCallback, useEffect, useRef, useState } from 'react';
import { getTimer, startTimer, type TimerRecord } from '@/lib/timers';

export type UseServerCountdownOptions = {
  timerId: string;
  durationSec?: number; // required if autoStart is true
  autoStart?: boolean; // start if missing
  intervalMs?: number; // tick interval
  onExpire?: () => void; // called exactly once
  disabled?: boolean;
};

export type UseServerCountdown = {
  ready: boolean;
  expired: boolean;
  remainingMs: number; // clamped to >= 0
  remainingSec: number; // ceil(remainingMs/1000)
  refetch: () => Promise<TimerRecord | null>;
};

/**
 * Server-authoritative countdown with clock-skew compensation.
 * Computes a fixed offset from server_now and uses it for all ticks.
 */
export function useServerCountdown(opts: UseServerCountdownOptions): UseServerCountdown {
  const { timerId, durationSec, autoStart = false, intervalMs = 250, onExpire, disabled = false } = opts;
  if (import.meta.env.DEV && !disabled) {
    try {
      console.debug('[useServerCountdown] init', { timerId, durationSec, autoStart, intervalMs });
    } catch {}
  }

  // Helper: normalize Supabase error objects for consistent logging
  const toErrorInfo = (e: any) => {
    try {
      if (!e) return { message: 'unknown error' };
      const { status, code, message, details, hint } = e as any;
      return { status, code, message, details, hint };
    } catch {
      return { message: String(e ?? 'unknown') };
    }
  };

  // Helper: expose last hydration snapshot for quick inspection
  const setWindowDebug = (payload: Record<string, any>) => {
    try {
      (window as any).__gh_timer_debug = {
        ...(window as any).__gh_timer_debug,
        ...payload,
        ts: new Date().toISOString(),
      };
    } catch {}
  };

  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  // Handle empty timerId case immediately
  useEffect(() => {
    if (disabled) return;
    if (!timerId) {
      setReady(true);
      setExpired(false);
      setRemainingMs(0);
      if (import.meta.env.DEV) {
        try { console.debug('[useServerCountdown] No timerId, skipping server interaction'); } catch {}
      }
      setWindowDebug({ phase: 'no-timer-id', reason: 'empty timerId' });
    }
  }, [timerId, disabled]);

  const endAtRef = useRef<number | null>(null);
  const offsetMsRef = useRef<number>(0);
  const expiredCalledRef = useRef<boolean>(false);
  const tickTimerRef = useRef<number | null>(null);
  const prevSecRef = useRef<number | null>(null);

  const computeNowServerMs = () => Date.now() + offsetMsRef.current;

  const clearTick = () => {
    if (tickTimerRef.current !== null) {
      window.clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
      if (import.meta.env.DEV) {
        try { console.debug('[useServerCountdown] clearTick'); } catch {}
      }
    }
  };

  const startTick = () => {
    clearTick();
    if (import.meta.env.DEV) {
      try { console.debug('[useServerCountdown] startTick', { intervalMs }); } catch {}
    }
    tickTimerRef.current = window.setInterval(() => {
      if (endAtRef.current == null) return;
      const now = computeNowServerMs();
      const remain = Math.max(0, endAtRef.current - now);
      setRemainingMs(remain);
      const sec = Math.ceil(remain / 1000);
      if (import.meta.env.DEV && prevSecRef.current !== sec) {
        prevSecRef.current = sec;
        try { console.debug('[useServerCountdown] tick', { sec, remainMs: remain }); } catch {}
      }
      const isExpired = remain <= 0;
      if (isExpired && !expiredCalledRef.current) {
        expiredCalledRef.current = true;
        setExpired(true);
        try { onExpire?.(); } catch {}
      }
    }, intervalMs) as unknown as number;
  };

  const hydrate = useCallback(async (): Promise<TimerRecord | null> => {
    if (disabled) {
      return null;
    }
    if (!timerId) {
      if (import.meta.env.DEV) {
        try { console.debug('[useServerCountdown] hydrate:skip', { reason: 'no-timer-id' }); } catch {}
      }
      setReady(true);
      setExpired(false);
      setRemainingMs(0);
      clearTick();
      setWindowDebug({ phase: 'hydrate-skip', reason: 'no-timer-id' });
      return null;
    }

    if (import.meta.env.DEV) {
      try { console.debug('[useServerCountdown] hydrate:start', { timerId, autoStart, durationSec }); } catch {}
    }
    setWindowDebug({ phase: 'hydrate:start', timerId, autoStart, durationSec });
    setReady(false);
    setExpired(false);
    expiredCalledRef.current = false;

    let row: TimerRecord | null = null;
    try {
      row = await getTimer(timerId);
      if (import.meta.env.DEV) {
        try { console.debug('[useServerCountdown] hydrate:getTimer', { found: !!row }); } catch {}
      }
      setWindowDebug({ phase: 'hydrate:getTimer', found: !!row });
    } catch (e) {
      try { console.error('[useServerCountdown] hydrate:getTimer error', e, toErrorInfo(e)); } catch {}
      setWindowDebug({ phase: 'hydrate:getTimer:error', error: toErrorInfo(e) });
      throw e; // preserve original behavior
    }
    if (!row && autoStart) {
      if (!durationSec || durationSec <= 0) throw new Error('durationSec required to autoStart');
      try {
        row = await startTimer(timerId, durationSec);
        if (import.meta.env.DEV) {
          try { console.debug('[useServerCountdown] hydrate:startTimer', { started: !!row, durationSec }); } catch {}
        }
        setWindowDebug({ phase: 'hydrate:startTimer', started: !!row, durationSec });
      } catch (e) {
        try { console.error('[useServerCountdown] hydrate:startTimer error', e, { timerId, durationSec }, toErrorInfo(e)); } catch {}
        setWindowDebug({ phase: 'hydrate:startTimer:error', error: toErrorInfo(e), timerId, durationSec });
        throw e; // preserve original behavior
      }
    }

    if (row) {
      const serverNow = new Date(row.server_now).getTime();
      const clientNow = Date.now();
      offsetMsRef.current = serverNow - clientNow; // positive if server ahead of client
      endAtRef.current = new Date(row.end_at).getTime();

      const now = computeNowServerMs();
      const remain = Math.max(0, endAtRef.current - now);
      setRemainingMs(remain);
      setExpired(remain <= 0);
      setReady(true);
      if (import.meta.env.DEV) {
        try {
          console.debug('[useServerCountdown] hydrate:row', {
            offsetMs: offsetMsRef.current,
            endAt: endAtRef.current,
            remainMs: remain,
            remainSec: Math.ceil(remain / 1000),
          });
        } catch {}
      }
      setWindowDebug({
        phase: 'hydrate:row',
        offsetMs: offsetMsRef.current,
        endAt: endAtRef.current,
        remainMs: remain,
        remainSec: Math.ceil(remain / 1000),
      });
      startTick();
      return row;
    } else {
      // No timer and not auto-starting
      endAtRef.current = null;
      offsetMsRef.current = 0;
      setRemainingMs(0);
      setExpired(true);
      setReady(true);
      clearTick();
      if (import.meta.env.DEV) {
        try {
          console.debug('[useServerCountdown] hydrate:none', {
            reason: !autoStart ? 'no-timer-no-autostart' : 'unknown',
            timerId,
            autoStart,
            durationSec,
          });
        } catch {}
      }
      setWindowDebug({ phase: 'hydrate:none', reason: !autoStart ? 'no-autostart' : 'unknown', timerId, autoStart, durationSec });
      return null;
    }
  }, [timerId, autoStart, durationSec]);

  useEffect(() => {
    if (disabled) return;
    hydrate();
    return () => clearTick();
  }, [hydrate, disabled]);

  const refetch = useCallback(async () => {
    if (import.meta.env.DEV) {
      try { console.debug('[useServerCountdown] refetch'); } catch {}
    }
    return hydrate();
  }, [hydrate]);

  const remainingSec = Math.ceil(remainingMs / 1000);

  return { ready, expired, remainingMs, remainingSec, refetch };
}
