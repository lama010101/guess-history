
import GameResult from './GameResult';
import { HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  
  const isLastRound = currentRound >= maxRounds;

  return (
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 z-50">
      <div className="flex-1 overflow-auto w-full max-w-md flex items-center justify-center">
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
        />
      </div>
      
      {/* Fixed bottom bar with buttons */}
      <div className="w-full max-w-md bg-background p-4 border-t rounded-b-lg mt-4 flex gap-2">
        {isLastRound && (
          <Button 
            variant="outline" 
            className="flex-1 flex items-center justify-center"
            asChild
          >
            <Link to="/">
              <Home className="mr-1.5 h-4 w-4" />
              Home
            </Link>
          </Button>
        )}
        <Button 
          onClick={onNextRound} 
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
        >
          {isLastRound ? "See Final Results" : "Next Round"}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default GameResultsModal;
