import React from 'react';
import { useServerCountdown } from '@/hooks/useServerCountdown';

export type CountdownProps = {
  timerId: string;
  durationSec?: number;
  autoStart?: boolean;
  onExpire?: () => void;
  className?: string;
  render?: (args: { ready: boolean; remainingSec: number; expired: boolean }) => React.ReactNode;
};

/**
 * Minimal countdown UI. Server-authoritative via useServerCountdown.
 * Does not style beyond a simple wrapper; pass className or render for custom UI.
 */
export function Countdown({ timerId, durationSec, autoStart, onExpire, className, render }: CountdownProps) {
  const { ready, remainingSec, expired } = useServerCountdown({
    timerId,
    durationSec,
    autoStart,
    onExpire,
  });

  if (render) return <>{render({ ready, remainingSec, expired })}</>;

  return (
    <div className={className}>
      {!ready ? '…' : expired ? '0' : String(remainingSec)}
    </div>
  );
}

export default Countdown;
