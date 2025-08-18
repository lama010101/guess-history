import { GeoHit } from './types';
import { LRUCache } from './cache/lru';
import { persistToIndexedDB, hydrateLRU } from './cache/idb';
import { dedupe, rank } from './rank';
import { fetchNominatim, mapNominatim, withTimeout } from './nominatim';
import { fuzzySearch } from './fuzzy/FuseEngine';
import { normalize } from './normalize';

const lru = new LRUCache<GeoHit[]>(100);
let hydrated = false;

async function ensureHydrated() {
  if (hydrated) return;
  const entries = await hydrateLRU(100);
  lru.load(entries.map((e) => ({ key: e.key, value: e.hits })));
  hydrated = true;
}

function keyFor(query: string) {
  return normalize(query);
}

export interface SuggestOptions {
  signal?: AbortSignal;
  center?: { lat: number; lon: number };
}

export async function suggest(query: string, opts: SuggestOptions = {}): Promise<GeoHit[]> {
  if (!query.trim()) return [];
  await ensureHydrated();
  const key = keyFor(query);
  const cached = lru.get(key);
  if (cached) return cached;

  let hits: GeoHit[] = [];
  try {
    const rows = await withTimeout(fetchNominatim(query, opts.signal), 2500);
    const mapped = mapNominatim(rows);
    if (mapped.length > 0) {
      hits = mapped;
    } else {
      // Fallback to fuzzy only if Nominatim yielded zero results
      hits = await fuzzySearch(query, 10);
    }
  } catch (e) {
    // On timeout or error, do not fallback unless Nominatim had zero results; here we likely had zero
    // But to keep strict behavior, only fallback if no results (hits is empty)
    if (hits.length === 0) {
      try {
        hits = await fuzzySearch(query, 10);
      } catch {
        hits = [];
      }
    }
  }

  const merged = dedupe(hits);
  const ranked = rank(merged, query, opts.center);
  const final = ranked.slice(0, 10);

  if (final.length > 0) {
    lru.set(key, final);
    persistToIndexedDB(key, final).catch(() => {});
  }
  return final;
}
