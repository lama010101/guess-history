export interface Image {
  id: string;
  url: string;
  title: string;
  year: number;
  location_name: string;
  latitude: number;
  longitude: number;
}

export interface GuessCoordinates {
  lat: number;
  lng: number;
}

export interface RoundResult {
  roundIndex: number;
  imageId: string;
  guessCoordinates?: GuessCoordinates | null;
  actualCoordinates?: { lat: number; lng: number };
  distanceKm: number | null;
  score: number | null;
  guessYear: number | null;
  xpWhen?: number;
  xpWhere?: number;
  accuracy?: number;
  hintsUsed?: number;
  xpTotal?: number;
  timeAccuracy?: number;
  locationAccuracy?: number;
}
