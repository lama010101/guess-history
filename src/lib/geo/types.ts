export type GeoSource = 'nominatim' | 'fuzzy' | 'cache';

export interface GeoHit {
  name: string;
  admin?: string;
  country: string;
  lat: number;
  lon: number;
  population?: number;
  source: GeoSource;
  score?: number; // lower is better for Fuse.js; we'll invert for display if needed
  altNames?: string[];
}

export interface GazetteerEntry {
  name: string;
  admin?: string;
  country: string;
  lat: number;
  lon: number;
  population?: number;
  altNames?: string[];
}

export interface LatLon {
  lat: number;
  lon: number;
}
