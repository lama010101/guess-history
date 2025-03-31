
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import YearSlider from '@/components/YearSlider';
import { ArrowRightCircle } from 'lucide-react';

interface GameControlsProps {
  selectedLocation: { lat: number; lng: number } | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onSubmit: () => void;
  showResults?: boolean;
  onNextRound?: () => void;
  isLastRound?: boolean;
  onFinish?: () => void;
  gameComplete?: boolean;
}

const GameControls = ({
  selectedLocation,
  selectedYear,
  onYearChange,
  onSubmit,
  showResults = false,
  onNextRound,
  isLastRound = false,
  onFinish,
  gameComplete = false
}: GameControlsProps) => {
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-4 z-30">
      <div className="container max-w-5xl mx-auto">
        <div className="flex flex-col gap-4">
          {!showResults && !gameComplete && (
            <>
              <YearSlider
                selectedYear={selectedYear}
                onChange={onYearChange}
                minYear={1900}
                maxYear={2020}
              />
              
              <Button 
                size="lg"
                onClick={onSubmit}
                disabled={!selectedLocation}
                className="w-full"
              >
                Submit Guess
                <ArrowRightCircle className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}
          
          {showResults && onNextRound && (
            <Button 
              size="lg"
              onClick={onNextRound}
              className="w-full"
            >
              {isLastRound ? "See Final Results" : "Next Round"}
            </Button>
          )}
          
          {gameComplete && onFinish && (
            <Button 
              size="lg"
              onClick={onFinish}
              className="w-full"
            >
              Play Again
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameControls;
