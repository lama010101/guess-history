import { GeoHit } from './types';
import { normalize } from './normalize';
import { haversine } from './haversine';

function exactnessScore(hit: GeoHit, nq: string): number {
  // Higher is better. 0..2
  const name = normalize(hit.name);
  const admin = hit.admin ? normalize(hit.admin) : '';
  const country = normalize(hit.country);
  const tokens = nq.split(' ');

  // startsWith or full-token matches bump score
  let score = 0;
  if (name.startsWith(nq)) score += 2;
  for (const t of tokens) {
    if (!t) continue;
    if (name === t || name.startsWith(t)) score += 1;
    if (admin === t || admin.startsWith(t)) score += 0.5;
    if (country === t || country.startsWith(t)) score += 0.5;
  }
  return score;
}

export function rank(hits: GeoHit[], q: string, center?: { lat: number; lon: number }) {
  const nq = normalize(q);
  const dist = (a: GeoHit) =>
    !center ? 0 : haversine(center.lat, center.lon, a.lat, a.lon);

  return hits.slice().sort((a, b) => {
    const ea = exactnessScore(a, nq);
    const eb = exactnessScore(b, nq);
    const pa = a.population ?? 0;
    const pb = b.population ?? 0;
    const da = dist(a);
    const db = dist(b);
    // Exactness desc, population desc, distance asc
    if (eb !== ea) return eb - ea;
    if (pb !== pa) return pb - pa;
    if (da !== db) return da - db;
    return 0;
  });
}

export function dedupe(hits: GeoHit[]) {
  const seen = new Set<string>();
  const out: GeoHit[] = [];
  for (const h of hits) {
    const key = `${h.name.toLowerCase()}|${(h.admin || '').toLowerCase()}|${h.country.toLowerCase()}|${h.lat.toFixed(4)}|${h.lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
  }
  return out;
}
