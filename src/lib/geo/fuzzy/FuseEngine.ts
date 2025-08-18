import type Fuse from 'fuse.js';
import { GazetteerEntry, GeoHit } from '../types';
import { normalize } from '../normalize';

let fuse: Fuse<any> | null = null;
let ready = false;
let loading: Promise<void> | null = null;

async function loadGazetteer(): Promise<GazetteerEntry[]> {
  try {
    const resp = await fetch('/geo/gazetteer.json');
    if (!resp.ok) return [];
    const json = await resp.json();
    if (Array.isArray(json)) return json as GazetteerEntry[];
    return [];
  } catch {
    return [];
  }
}

function prepareIndex(entries: GazetteerEntry[]) {
  // Precompute normalized fields for diacritic-insensitive matching
  return entries.map((e) => ({
    ...e,
    nName: normalize(e.name),
    nAdmin: e.admin ? normalize(e.admin) : '',
    nCountry: normalize(e.country),
    nAlt: (e.altNames ?? []).map(normalize),
  }));
}

export async function ensureFuseReady() {
  if (ready) return;
  if (loading) return loading;
  loading = (async () => {
    const [{ default: Fuse }, entries] = await Promise.all([
      import('fuse.js'),
      loadGazetteer(),
    ]);
    const indexed = prepareIndex(entries);
    fuse = new Fuse(indexed, {
      includeScore: true,
      ignoreLocation: true,
      minMatchCharLength: 2,
      threshold: 0.35,
      keys: [
        { name: 'nName', weight: 0.6 },
        { name: 'nAdmin', weight: 0.2 },
        { name: 'nCountry', weight: 0.2 },
        { name: 'nAlt', weight: 0.5 },
      ] as any,
    });
    ready = true;
  })();
  return loading;
}

export async function fuzzySearch(query: string, limit = 8): Promise<GeoHit[]> {
  await ensureFuseReady();
  if (!fuse || !ready) return [];
  const nq = normalize(query);
  const res = fuse.search(nq, { limit });
  return res.map((r) => {
    const e = r.item as any as GazetteerEntry & { nName: string };
    return {
      name: e.name,
      admin: e.admin,
      country: e.country,
      lat: e.lat,
      lon: e.lon,
      population: e.population,
      source: 'fuzzy',
      score: r.score ?? undefined,
      altNames: e.altNames,
    } satisfies GeoHit;
  });
}
