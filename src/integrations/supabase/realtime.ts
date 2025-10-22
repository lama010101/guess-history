import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './client';

// Reference-counted realtime channel registry to dedupe channels across components.
// Always call handle.release() in cleanup.

type Entry = { channel: RealtimeChannel; refs: number; subscribed: boolean };
const registry = new Map<string, Entry>();

export type ChannelHandle = {
  channel: RealtimeChannel;
  release: () => void;
};

export function acquireChannel(name: string): ChannelHandle {
  let entry = registry.get(name);
  if (!entry) {
    const ch = supabase.channel(name);
    entry = { channel: ch as RealtimeChannel, refs: 0, subscribed: false };
    registry.set(name, entry);
  }

  entry.refs += 1;

  if (!entry.subscribed) {
    entry.channel.subscribe(() => {
      // status callback not required; callers can attach .on() listeners freely
    });
    entry.subscribed = true;
  }

  const release = () => {
    const e = registry.get(name);
    if (!e) return;
    e.refs -= 1;
    if (e.refs <= 0) {
      try { supabase.removeChannel(e.channel); } catch {}
      registry.delete(name);
    }
  };

  return { channel: entry.channel, release };
}

export function getActiveChannelNames(): string[] {
  return Array.from(registry.keys());
}
