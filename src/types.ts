export interface Image {
  id: string;
  url: string;
  title: string;
  year: number;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface RoundResult {
  imageId: string;
  roundIndex: number;
  guessYear: number | null;
  distanceKm: number | null;
  score: number;
  hintsUsed: number;
  xpWhen?: number;
  xpWhere?: number;
  accuracy?: number;
}
