
import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/useGameState';

interface HintDisplayProps {
  availableHints: number;
  onClose: () => void;
}

const HintDisplay = ({ availableHints, onClose }: HintDisplayProps) => {
  const { 
    handleUseLocationHint, 
    handleUseYearHint,
    locationHintUsed,
    yearHintUsed,
    hintCoins,
    currentImage
  } = useGameState();

  const useLocationHint = () => {
    handleUseLocationHint();
  };

  const useYearHint = () => {
    handleUseYearHint();
  };

  // Function to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-lg border border-border shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">Available Hints</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4 py-2">
          <Button 
            onClick={useLocationHint}
            disabled={locationHintUsed || hintCoins <= 0}
            variant={locationHintUsed ? "outline" : "secondary"}
            className="w-full"
          >
            {locationHintUsed ? "Location Hint Used" : "Use Location Hint"}
            <span className="ml-1 text-xs">(-500 pts)</span>
          </Button>
          
          <Button 
            onClick={useYearHint}
            disabled={yearHintUsed || hintCoins <= 0}
            variant={yearHintUsed ? "outline" : "secondary"}
            className="w-full"
          >
            {yearHintUsed ? "Year Hint Used" : "Use Year Hint"}
            <span className="ml-1 text-xs">(-500 pts)</span>
          </Button>
        </div>
        
        {/* Hint results if used */}
        {(locationHintUsed || yearHintUsed) && (
          <div className="mt-2 border-t pt-2">
            <h4 className="font-medium text-xs mb-1">Active Hints:</h4>
            {locationHintUsed && currentImage && (
              <p className="text-xs bg-amber-100 dark:bg-amber-900/30 p-1 rounded mb-1">
                <span className="font-medium">Location:</span> {getCountryOnly(currentImage.locationName)}
              </p>
            )}
            {yearHintUsed && currentImage && (
              <p className="text-xs bg-amber-100 dark:bg-amber-900/30 p-1 rounded">
                <span className="font-medium">Year:</span> {currentImage.year.toString().slice(0, -1) + "X"}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-2 pt-2 border-t">
          <h4 className="text-xs font-medium mb-1">How to earn hint coins:</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Play daily challenges (+2 coins)</li>
            <li>• Achieve perfect scores (+1 coin)</li>
            <li>• Log in consecutive days (+1 coin)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HintDisplay;
