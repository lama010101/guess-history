
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HistoricalImage } from '@/types/game';
import GameResult from './game/GameResult';
import YearTimeline from './game/YearTimeline';
import { MapPin, Calendar } from 'lucide-react';

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

const GameResultsModal: React.FC<GameResultsModalProps> = ({
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
}) => {
  const totalScore = locationScore + yearScore;
  const isLastRound = currentRound >= maxRounds;
  
  // Calculate the year difference description
  const getYearDifferenceText = () => {
    if (yearDifference === 0) return "Perfect guess!";
    
    const abs = Math.abs(yearDifference);
    const direction = yearDifference > 0 ? "too early" : "too late";
    
    return `You guessed ${selectedYear} (${abs} year${abs !== 1 ? 's' : ''} ${direction})`;
  };

  return (
    <Dialog open={showResults} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="relative overflow-hidden">
          <div className="p-6">
            {selectedLocation && (
              <GameResult
                isVisible={true}
                locationScore={locationScore}
                yearScore={yearScore}
                actualLocation={currentImage.location}
                guessedLocation={selectedLocation}
                actualYear={currentImage.year}
                guessedYear={selectedYear}
                distanceKm={distanceKm}
                yearDifference={yearDifference}
                locationHintUsed={locationHintUsed}
                yearHintUsed={yearHintUsed}
                hintPenalty={hintPenalty}
                onNextRound={onNextRound}
                currentRound={currentRound}
                maxRounds={maxRounds}
                eventTitle={currentImage.title}
                eventDescription={currentImage.description}
                locationName={currentImage.locationName}
              />
            )}
            
            <div className="space-y-3 mt-6">
              <h3 className="text-lg font-semibold">Result Details</h3>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="mr-1.5 h-4 w-4" />
                    <span>Distance</span>
                  </div>
                  <p className="font-medium">
                    {distanceKm.toLocaleString(undefined, { 
                      maximumFractionDigits: 1 
                    })} km away
                    {locationHintUsed && (
                      <span className="text-amber-500 ml-1.5 text-xs">(Hint used)</span>
                    )}
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-1.5 h-4 w-4" />
                    <span>Year</span>
                  </div>
                  <p className="font-medium">
                    {getYearDifferenceText()}
                    {yearHintUsed && (
                      <span className="text-amber-500 ml-1.5 text-xs">(Hint used)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="px-2 pb-2">
            <YearTimeline
              guessedYear={selectedYear}
              actualYear={currentImage.year}
              minYear={1900}
              maxYear={2025}
            />
          </div>
        </div>
        
        <DialogFooter className="px-6 py-4 bg-muted/50">
          <Button 
            className="w-full" 
            onClick={onNextRound}
          >
            {isLastRound ? "See Final Results" : "Next Round"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GameResultsModal;
