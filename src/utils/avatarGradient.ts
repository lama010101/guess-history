import type { CSSProperties } from 'react';

const PASTEL_COLOR_POOL: readonly string[] = [
  '#bde9ff', // pastel blue
  '#c4e1ff', // baby periwinkle
  '#ccd9ff', // powder indigo
  '#d6d1ff', // soft wisteria
  '#dfc9ff', // lilac haze
  '#e7c1ff', // orchid blush
  '#f0b9ff', // lavender pink
  '#f8b1ff', // cotton candy
  '#ffabf0', // bubblegum rose
  '#ffb3da', // petal pink
  '#ffbfc1', // apricot blush
  '#ffc9a8', // melon cream
  '#ffd38f', // peach sorbet
  '#ffdf86', // buttercup
  '#f1ef88', // pale lemon
  '#d9f4a0', // fresh pear
  '#c2f8bb', // mint sherbet
  '#aef7d4', // seafoam
  '#9ff3e6', // aqua breeze
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

function createSeededRandom(seed: string | undefined) {
  let state = hashSeed(seed ?? '');
  if (state === 0) {
    state = 0x1fffffff;
  }
  return () => {
    state = (state * 1664525 + 1013904223) | 0;
    return ((state >>> 0) / 0x100000000);
  };
}

function pickPalette(seed: string | undefined): [string, string, string] {
  const rng = createSeededRandom(seed);
  const chosen = new Set<number>();
  while (chosen.size < 3) {
    const index = Math.floor(rng() * PASTEL_COLOR_POOL.length);
    chosen.add(index % PASTEL_COLOR_POOL.length);
  }
  const ordered = Array.from(chosen).sort((a, b) => a - b);
  const [first, second, third] = ordered;
  return [PASTEL_COLOR_POOL[first], PASTEL_COLOR_POOL[second], PASTEL_COLOR_POOL[third]];
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
