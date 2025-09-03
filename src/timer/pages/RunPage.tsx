import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMs } from '../utils/time';
import { clearSession, loadSession, saveSession } from '../utils/storage';
import { useCountdown } from '../hooks/useCountdown';
import { TIMER_CONFIG } from '../config/timerConfig';

export default function TimerRunPage() {
  const navigate = useNavigate();
  const [version, setVersion] = useState(0); // bump to re-read storage on storage events
  const session = useMemo(() => loadSession(), [version]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TIMER_CONFIG.STORAGE_KEY) {
        setVersion((v) => v + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Redirect if no session
  useEffect(() => {
    const now = Date.now();
    if (!session) {
      navigate('/timer', { replace: true });
      return;
    }
    const remaining = session.durationMs - (now - session.startAt);
    console.log('[timer] Route: /timer/run; session:', {
      phase: session.phase,
      durationMs: session.durationMs,
      startAt: session.startAt,
      now,
      remainingMs: remaining,
    });

    if (remaining <= 0) {
      // Auto-transition to next
      const next = { ...session, phase: 'next' as const, startAt: Date.now() };
      saveSession(next);
      console.log('[timer] Timer finished on mount; navigating to /timer/next');
      navigate('/timer/next', { replace: true });
    }
  }, [session, navigate]);

  if (!session) return null;

  const { remainingMs, percentageLeft } = useCountdown({
    durationMs: session.durationMs,
    startAt: session.startAt,
    onFinished: () => {
      const next = { ...session, phase: 'next' as const, startAt: Date.now() };
      saveSession(next);
      console.log('[timer] Timer finished; navigating to /timer/next');
      navigate('/timer/next', { replace: true });
    },
  });

  const [navBusy, setNavBusy] = useState(false);

  const handleNext = () => {
    if (navBusy) return;
    setNavBusy(true);
    const s = loadSession();
    if (!s) {
      navigate('/timer', { replace: true });
      return;
    }
    const next = { ...s, phase: 'next' as const, startAt: Date.now() };
    saveSession(next);
    console.log('[timer] Next pressed; navigating to /timer/next', next);
    navigate('/timer/next');
  };

  const handleReset = () => {
    clearSession();
    navigate('/timer', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-xl font-semibold mb-4">Countdown</h1>
        <div className="text-6xl font-mono tabular-nums" aria-live="polite" aria-atomic>
          {formatMs(remainingMs)}
        </div>
        <div className="mt-4 h-2 w-full bg-neutral-800 rounded">
          <div
            className="h-2 bg-orange-500 rounded"
            style={{ width: `${percentageLeft}%`, transition: 'width 0.2s linear' }}
            aria-hidden
          />
        </div>
        <p className="mt-2 text-sm text-neutral-400">Session: {formatMs(session.durationMs)}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleNext}
            disabled={navBusy}
            className="flex-1 rounded-md bg-orange-500 text-white py-2 font-medium hover:bg-orange-600 disabled:opacity-60"
          >
            Next
          </button>
          <button
            onClick={handleReset}
            className="rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2 hover:bg-neutral-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
