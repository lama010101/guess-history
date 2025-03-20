
import GameResult from './GameResult';
import { HistoricalImage } from '@/types/game';

interface GameResultsModalProps {
  showResults: boolean;
  locationScore: number;
  yearScore: number;
  currentImage: HistoricalImage;
  selectedLocation: { lat: number; lng: number } | null;
  selectedYear: number;
  distanceKm: number;
  yearDifference: number;
  onNextRound: () => void;
  currentRound: number;
  maxRounds: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  hintPenalty: number;
}

const GameResultsModal = ({
  showResults,
  locationScore,
  yearScore,
  currentImage,
  selectedLocation,
  selectedYear,
  distanceKm,
  yearDifference,
  onNextRound,
  currentRound,
  maxRounds,
  locationHintUsed,
  yearHintUsed,
  hintPenalty
}: GameResultsModalProps) => {
  if (!showResults) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <GameResult 
        isVisible={showResults}
        locationScore={locationScore}
        yearScore={yearScore}
        actualLocation={currentImage.location}
        guessedLocation={selectedLocation ?? undefined}
        actualYear={currentImage.year}
        guessedYear={selectedYear}
        distanceKm={distanceKm}
        yearDifference={yearDifference}
        onNextRound={onNextRound}
        currentRound={currentRound}
        maxRounds={maxRounds}
        locationHintUsed={locationHintUsed}
        yearHintUsed={yearHintUsed}
        hintPenalty={hintPenalty}
      />
    </div>
  );
};

export default GameResultsModal;
