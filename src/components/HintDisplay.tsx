
import { X, Lightbulb, MapPin, Calendar } from 'lucide-react';
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
    currentImage
  } = useGameState();

  // Function to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };

  return (
    <div className="w-64 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-lg border border-border shadow-lg">
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
            onClick={handleUseLocationHint}
            disabled={locationHintUsed || availableHints <= 0}
            variant={locationHintUsed ? "outline" : "primary"}
            className="w-full"
          >
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-xs">Location</span>
            <span className="ml-1 text-xs">(-500 pts)</span>
          </Button>
          
          <Button 
            onClick={handleUseYearHint}
            disabled={yearHintUsed || availableHints <= 0}
            variant={yearHintUsed ? "outline" : "primary"}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-1" />
            <span className="text-xs">Year</span>
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
          <h4 className="text-xs font-medium mb-1">Hint coins available: {availableHints}</h4>
        </div>
      </div>
    </div>
  );
};

export default HintDisplay;
