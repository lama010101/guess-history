import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export type TimerRecord = {
  timer_id: string;
  end_at: string; // ISO timestamp from server
  server_now: string; // ISO timestamp from server (when fetched)
  duration_sec: number;
  started_at: string; // ISO timestamp
};

function log(...args: any[]) {
  // Centralized logging for easier tracing in prod logs
  console.log('[timers]', ...args);
}

const TimerRow = z.object({
  timer_id: z.string().min(1),
  end_at: z.string().datetime(),
  server_now: z.string().datetime(),
  duration_sec: z.number().int().positive(),
  started_at: z.string().datetime(),
});

const TimerRows = z.array(TimerRow).min(1);

// Some generated Database types may not include all RPCs (e.g., start_timer/get_timer) yet.
// Use a narrowly typed wrapper to avoid string literal narrowing errors while preserving runtime checks.
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as any).rpc(name, args) as Promise<{ data: unknown; error: any }>;

export async function startTimer(timerId: string, durationSec: number): Promise<TimerRecord> {
  log('startTimer →', { timerId, durationSec });
  const { data, error } = await rpc('start_timer', {
    p_timer_id: timerId,
    p_duration_sec: durationSec,
  });
  if (error) {
    // Supabase error shape often contains details/status/code
    const e: any = error;
    log('startTimer error', {
      status: e?.status,
      code: e?.code,
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      timerId,
      durationSec,
    });
    throw error;
  }
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const parsed = TimerRows.safeParse(rows);
  if (!parsed.success || parsed.data.length === 0) {
    try {
      console.error('[timers] start_timer invalid rows', {
        raw: data,
        rowsType: Array.isArray(data) ? 'array' : typeof data,
        zodIssues: !parsed.success ? parsed.error.flatten() : undefined,
      });
    } catch {}
    throw new Error('start_timer returned invalid rows');
  }
  const row = parsed.data[0];
  log('startTimer ←', row);
  return row as TimerRecord;
}

export async function getTimer(timerId: string): Promise<TimerRecord | null> {
  log('getTimer →', { timerId });
  const { data, error } = await rpc('get_timer', { p_timer_id: timerId });
  if (error) {
    const e: any = error;
    log('getTimer error', {
      status: e?.status,
      code: e?.code,
      message: e?.message,
      details: e?.details,
      hint: e?.hint,
      timerId,
    });
    throw error;
  }
  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  if (rows.length === 0) {
    log('getTimer ←', null);
    return null;
  }
  const parsed = TimerRows.safeParse(rows);
  if (!parsed.success || parsed.data.length === 0) {
    try {
      console.error('[timers] get_timer invalid rows', {
        raw: data,
        rowsType: Array.isArray(data) ? 'array' : typeof data,
        zodIssues: parsed.error.flatten(),
      });
    } catch {}
    throw new Error('get_timer returned invalid rows');
  }
  const row = parsed.data[0];
  log('getTimer ←', row);
  return row as TimerRecord;
}

