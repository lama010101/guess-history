import { supabase } from '@/integrations/supabase/client';

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

export async function startTimer(timerId: string, durationSec: number): Promise<TimerRecord> {
  log('startTimer →', { timerId, durationSec });
  const { data, error } = await supabase.rpc('start_timer', {
    p_timer_id: timerId,
    p_duration_sec: durationSec,
  });
  if (error) {
    log('startTimer error', error);
    throw error;
  }
  const row = (data as TimerRecord[] | null)?.[0] || null;
  if (!row) throw new Error('start_timer returned no rows');
  log('startTimer ←', row);
  return row;
}

export async function getTimer(timerId: string): Promise<TimerRecord | null> {
  log('getTimer →', { timerId });
  const { data, error } = await supabase.rpc('get_timer', { p_timer_id: timerId });
  if (error) {
    log('getTimer error', error);
    throw error;
  }
  const row = (data as TimerRecord[] | null)?.[0] || null;
  log('getTimer ←', row);
  return row;
}
