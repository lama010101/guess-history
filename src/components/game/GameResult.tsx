
import { Button } from '@/components/ui/button';
import ScoreDisplay from '../ScoreDisplay';

interface GameResultProps {
  isVisible: boolean;
  locationScore: number;
  yearScore: number;
  actualLocation: { lat: number; lng: number };
  guessedLocation?: { lat: number; lng: number };
  actualYear: number;
  guessedYear: number;
  distanceKm: number;
  yearDifference: number;
  onNextRound: () => void;
}

const GameResult = ({
  isVisible,
  locationScore,
  yearScore,
  actualLocation,
  guessedLocation,
  actualYear,
  guessedYear,
  distanceKm,
  yearDifference,
  onNextRound
}: GameResultProps) => {
  if (!isVisible) return null;
  
  return (
    <div className="glass-card p-4 rounded-lg max-w-md w-full">
      <ScoreDisplay
        isVisible={isVisible}
        locationScore={locationScore}
        yearScore={yearScore}
        actualLocation={actualLocation}
        guessedLocation={guessedLocation}
        actualYear={actualYear}
        guessedYear={guessedYear}
        distanceKm={distanceKm}
        yearDifference={yearDifference}
      />
      
      <div className="mt-4 flex justify-center">
        <Button onClick={onNextRound} className="px-6 w-full">
          Next Round
        </Button>
      </div>
    </div>
  );
};

export default GameResult;
