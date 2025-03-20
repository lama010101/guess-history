
export interface HistoricalImage {
  id: number;
  src: string;
  year: number;
  location: { lat: number; lng: number };
  description: string;
  title?: string;
  locationName?: string;
}

export interface RoundScore {
  locationScore: number;
  yearScore: number;
  image: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  hintPenalty: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}
