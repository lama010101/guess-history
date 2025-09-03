import { TIMER_CONFIG, TimerSessionV1, TimerPhase } from '../config/timerConfig';

function isValidSession(obj: unknown): obj is TimerSessionV1 {
  if (!obj || typeof obj !== 'object') return false;
  const s = obj as Record<string, unknown>;
  return (
    (s.version === 1) &&
    (s.phase === 'run' || s.phase === 'next') &&
    typeof s.durationMs === 'number' && s.durationMs > 0 &&
    typeof s.startAt === 'number' && s.startAt > 0 &&
    typeof s.createdAt === 'number' && s.createdAt > 0
  );
}

export function loadSession(): TimerSessionV1 | null {
  try {
    const raw = localStorage.getItem(TIMER_CONFIG.STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isValidSession(parsed)) return parsed;
    console.warn('[timer] Invalid session in storage; clearing');
    localStorage.removeItem(TIMER_CONFIG.STORAGE_KEY);
    return null;
  } catch (e) {
    console.error('[timer] Failed to load session', e);
    return null;
  }
}

export function saveSession(session: TimerSessionV1): void {
  try {
    localStorage.setItem(TIMER_CONFIG.STORAGE_KEY, JSON.stringify(session));
    console.log('[timer] Saved session', session);
  } catch (e) {
    console.error('[timer] Failed to save session', e);
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TIMER_CONFIG.STORAGE_KEY);
    console.log('[timer] Cleared session');
  } catch (e) {
    console.error('[timer] Failed to clear session', e);
  }
}

export function createSession(phase: TimerPhase, durationMs: number, startAt: number): TimerSessionV1 {
  const sess: TimerSessionV1 = {
    phase,
    durationMs,
    startAt,
    createdAt: Date.now(),
    version: 1,
  };
  return sess;
}
