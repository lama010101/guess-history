import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TIMER_CONFIG } from '../config/timerConfig';
import { parseInputToMs, formatMs } from '../utils/time';
import { clearSession, createSession, saveSession } from '../utils/storage';

export default function TimerMainPage() {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleGo = () => {
    setError(null);
    const ms = parseInputToMs(input);
    if (ms == null) {
      setError('Enter seconds (e.g., 90) or mm:ss (e.g., 01:30)');
      return;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 1) {
      setError('Minimum is 1 second');
      return;
    }
    if (seconds > TIMER_CONFIG.MAX_SECONDS) {
      setError('Maximum is 24 hours');
      return;
    }

    const startAt = Date.now();
    const session = createSession('run', ms, startAt);
    saveSession(session);

    console.log('[timer] Go pressed; navigating to /timer/run', {
      route: '/timer',
      stored: session,
      now: startAt,
      remainingMs: ms,
      note: `Session: ${formatMs(ms)}`,
    });

    navigate('/timer/run');
  };

  const handleReset = () => {
    clearSession();
    setInput('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-center mb-6">Timer</h1>
        <label htmlFor="t-input" className="block text-sm mb-2">Enter time (seconds or mm:ss)</label>
        <input
          id="t-input"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 p-3 outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="e.g., 90 or 01:30"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          inputMode="numeric"
          aria-invalid={!!error}
          aria-describedby={error ? 't-error' : undefined}
        />
        {error && (
          <p id="t-error" className="mt-2 text-sm text-red-400">{error}</p>
        )}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleGo}
            className="flex-1 rounded-md bg-orange-500 text-white py-2 font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 focus:ring-offset-black"
          >
            Go
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
