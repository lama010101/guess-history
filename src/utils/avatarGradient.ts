import type { CSSProperties } from 'react';

export const AVATAR_GRADIENT_PALETTES: readonly [string, string, string][] = [
  ["#22c55e", "#0ea5e9", "#a855f7"], // green → blue → violet
  ["#f97316", "#facc15", "#22c55e"], // orange → amber → green
  ["#ef4444", "#ec4899", "#6366f1"], // red → pink → indigo
  ["#38bdf8", "#22d3ee", "#14b8a6"], // sky → cyan → teal
  ["#f472b6", "#fb7185", "#f97316"], // pink → rose → orange
  ["#0ea5e9", "#6366f1", "#8b5cf6"], // light blue → indigo → violet
  ["#84cc16", "#22c55e", "#14b8a6"], // lime → green → teal
  ["#fcd34d", "#fb923c", "#ef4444"], // gold → orange → red
  ["#8b5cf6", "#ec4899", "#22d3ee"], // violet → pink → cyan
  ["#14b8a6", "#22c55e", "#facc15"], // teal → green → amber
] as const;

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function withAlpha(hex: string, alpha: number): string {
  const trimmed = hex.replace('#', '');
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pickPalette(seed: string | undefined): [string, string, string] {
  if (!seed) {
    return AVATAR_GRADIENT_PALETTES[0];
  }
  const index = hashSeed(seed) % AVATAR_GRADIENT_PALETTES.length;
  return AVATAR_GRADIENT_PALETTES[index];
}

export function getAvatarFrameGradient(seed?: string): string {
  const [from, mid, to] = pickPalette(seed);
  return `linear-gradient(135deg, ${from} 0%, ${mid} 50%, ${to} 100%)`;
}

export function getAvatarPanelGradient(seed?: string): string {
  const [from, mid, to] = pickPalette(seed);
  const softFrom = withAlpha(from, 0.16);
  const softMid = withAlpha(mid, 0.16);
  const softTo = withAlpha(to, 0.16);
  return `linear-gradient(135deg, ${softFrom} 0%, ${softMid} 45%, ${softTo} 100%)`;
}

export function getAvatarAccentColor(seed?: string): string {
  const [, mid] = pickPalette(seed);
  return mid;
}

export function getAvatarTextGradientStyle(seed?: string): CSSProperties {
  const gradient = getAvatarFrameGradient(seed);
  return {
    backgroundImage: gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    display: 'inline-block',
  };
}
