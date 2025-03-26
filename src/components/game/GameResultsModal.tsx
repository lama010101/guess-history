
import GameResult from './GameResult';
import { HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useGameState } from '@/hooks/useGameState';

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
  const { isDaily } = useGameState();
  
  if (!showResults) return null;
  
  const isLastRound = currentRound >= maxRounds;

  return (
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
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
          eventTitle={currentImage.title}
          eventDescription={currentImage.description}
          locationName={currentImage.locationName}
          removeShadow={true} // Remove the shadow at the bottom
        />
        
        <div className="p-4">
          <Button 
            onClick={onNextRound} 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
          >
            {isLastRound ? "Final Score" : "Next Image"}
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameResultsModal;
