export function formatInteger(value: number): number {
  return Math.round(value);
}

// Convert km to mi
export function kmToMi(km: number): number {
  return km * 0.621371;
}

// Format a distance (in km input) according to a unit preference
export function formatDistanceFromKm(distanceKm: number | null | undefined, unit: 'km' | 'mi' = 'km'): { value: number; unitLabel: 'km' | 'mi' } {
  if (distanceKm == null) return { value: 0, unitLabel: unit };
  const v = unit === 'mi' ? kmToMi(distanceKm) : distanceKm;
  return { value: formatInteger(v), unitLabel: unit };
}
