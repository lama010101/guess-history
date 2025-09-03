export function parseInputToMs(input: string): number | null {
  const str = input.trim();
  if (!str) return null;

  // mm:ss
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length !== 2) return null;
    const [mmStr, ssStr] = parts;
    if (!/^\d+$/.test(mmStr) || !/^\d{1,2}$/.test(ssStr)) return null;
    const minutes = parseInt(mmStr, 10);
    const seconds = parseInt(ssStr, 10);
    if (seconds >= 60) return null;
    const totalSeconds = minutes * 60 + seconds;
    return totalSeconds * 1000;
  }

  // plain seconds
  if (!/^\d+$/.test(str)) return null;
  const seconds = parseInt(str, 10);
  if (seconds < 0) return null;
  return seconds * 1000;
}

export function formatMs(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}
