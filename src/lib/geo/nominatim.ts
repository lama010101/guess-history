import { GeoHit } from './types';

// Token-bucket limiter: small initial burst with ~1 rps sustained
const BUCKET_CAPACITY = 3; // allow short burst
const REFILL_INTERVAL_MS = 1000; // ~1 token per second
let tokens = BUCKET_CAPACITY; // start full to allow burst on load
let lastRefillAt = Date.now();

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function refillTokens(now: number) {
  const elapsed = now - lastRefillAt;
  if (elapsed <= 0) return;
  const toAdd = Math.floor(elapsed / REFILL_INTERVAL_MS);
  if (toAdd > 0) {
    tokens = Math.min(BUCKET_CAPACITY, tokens + toAdd);
    lastRefillAt += toAdd * REFILL_INTERVAL_MS;
  }
}

export async function enqueueRateLimited<T>(fn: () => Promise<T>): Promise<T> {
  // Wait until a token is available
  // Poll at small intervals to keep the code simple and robust in the browser
  while (true) {
    const now = Date.now();
    refillTokens(now);
    if (tokens > 0) {
      tokens -= 1;
      break;
    }
    const elapsed = now - lastRefillAt;
    const waitMs = Math.max(REFILL_INTERVAL_MS - (elapsed % REFILL_INTERVAL_MS), 25);
    await delay(waitMs);
  }
  return fn();
}

export async function fetchNominatim(query: string, signal?: AbortSignal): Promise<any[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '8');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('accept-language', 'en');

  const resp = await enqueueRateLimited(async () => {
    const r = await fetch(url.toString(), {
      method: 'GET',
      // 'User-Agent' is a forbidden header in browsers; use query param and referrer.
      referrer: document.location.href,
      headers: {
        'Accept-Language': 'en',
      },
      signal,
    });
    if (!r.ok) throw new Error(`Nominatim HTTP ${r.status}`);
    return r.json();
  });
  return Array.isArray(resp) ? resp : [];
}

export function mapNominatim(rows: any[]): GeoHit[] {
  return rows.map((r) => {
    const name = r.display_name?.split(',')[0]?.trim() || r.name || 'Unknown';
    const admin = r.address?.state || r.address?.county || r.address?.region || undefined;
    const country = r.address?.country || r.country || 'Unknown';
    const population = r.extra?.population ? Number(r.extra.population) : undefined;
    return {
      name,
      admin,
      country,
      lat: Number(r.lat),
      lon: Number(r.lon),
      population,
      source: 'nominatim',
      altNames: r.aliases || undefined,
    } as GeoHit;
  });
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}
