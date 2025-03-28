
import { HistoricalImage, RoundScore } from './game';

export interface GameState {
  selectedLocation: { lat: number; lng: number } | null;
  selectedYear: number;
  showResults: boolean;
  currentImageIndex: number;
  currentRound: number;
  totalScore: number;
  roundScores: RoundScore[];
  gameComplete: boolean;
  hintCoins: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  timerEnabled: boolean;
  timerDuration: number;
  timerPaused: boolean;
  isDaily: boolean;
  dailyCompleted: boolean;
  dailyScore: number;
  dailyDate: string;
}

export interface GameStateActions {
  setSelectedLocation: React.Dispatch<React.SetStateAction<{ lat: number; lng: number } | null>>;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  setGameComplete: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit: () => void;
  handleNextRound: () => void;
  handleNewGame: () => void;
  handleUseLocationHint: () => void;
  handleUseYearHint: () => void;
  setTimerEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setTimerDuration: React.Dispatch<React.SetStateAction<number>>;
  setTimerPaused: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface GameStateReturn extends GameState, GameStateActions {
  currentImage: HistoricalImage;
  currentScores: {
    locationScore: number;
    yearScore: number;
    distanceKm: number;
    yearDifference: number;
    hintPenalty: number;
  };
  sampleImages: HistoricalImage[];
  maxRounds: number;
}
