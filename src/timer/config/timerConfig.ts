export const TIMER_CONFIG = {
  STORAGE_KEY: 'gh-timer/session',
  MAX_SECONDS: 86400,
  DRIFT_WARN_SECONDS: 10,
} as const;

export type TimerPhase = 'run' | 'next';

export interface TimerSessionV1 {
  phase: TimerPhase;
  durationMs: number;
  startAt: number; // epoch ms
  createdAt: number; // epoch ms
  version: 1;
}
