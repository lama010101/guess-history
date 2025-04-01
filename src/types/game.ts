
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface HistoricalImage {
  id: number;
  src: string;
  year: number;
  location: Coordinates;
  description: string;
  title?: string;
  locationName?: string;
  country?: string;
  metadata?: {
    tag?: 'Real' | 'AI Recreate' | 'AI Imagine';
    sourceApp?: string;
    sourceName?: string;
    confidenceScore?: number;
    createdAt?: string;
  };
}

export interface RoundScore {
  image: number;
  locationScore: number;
  yearScore: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  hintPenalty: number;
}

export interface GameSettings {
  timerEnabled: boolean;
  timerDuration: number;
  maxRoundsPerGame: number;
  locationThreshold: number;
  maxLocationScore: number;
  maxYearScore: number;
}
