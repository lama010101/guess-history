
import { useState } from 'react';
import { ArrowRight, CheckCircle, X } from 'lucide-react';
import YearSlider from '../YearSlider';

interface GameControlsProps {
  selectedLocation: { lat: number; lng: number } | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onSubmit: () => void;
}

const GameControls = ({ 
  selectedLocation, 
  selectedYear, 
  onYearChange, 
  onSubmit 
}: GameControlsProps) => {
  return (
    <div className="p-4 border-t border-border bg-white/50">
      <div className="mb-4">
        <YearSlider onChange={onYearChange} />
      </div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center text-sm">
          {selectedLocation ? (
            <span className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Location selected
            </span>
          ) : (
            <span className="flex items-center text-amber-600">
              <X className="h-4 w-4 mr-1" />
              No location selected
            </span>
          )}
        </div>
        
        <button
          onClick={onSubmit}
          disabled={!selectedLocation}
          className={`px-5 py-2.5 rounded-lg flex items-center ${
            selectedLocation
              ? 'bg-primary text-primary-foreground btn-transition hover:shadow-md hover:brightness-110'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          }`}
        >
          Submit Guess
          <ArrowRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default GameControls;
