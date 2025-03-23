
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
    <div className="w-[290px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-lg border border-border shadow-lg">
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
          <div className="flex flex-col items-center">
            <Button 
              onClick={() => {
                handleUseLocationHint();
                // Don't close popup to see the hint
              }}
              disabled={locationHintUsed || availableHints <= 0}
              variant={locationHintUsed ? "outline" : "default"}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-xs">Country</span>
            </Button>
            <span className="text-xs text-muted-foreground mt-1">-500 pts</span>
            
            {locationHintUsed && currentImage && (
              <span className="text-xs font-medium mt-2">
                {getCountryOnly(currentImage.locationName)}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <Button 
              onClick={() => {
                handleUseYearHint();
                // Don't close popup to see the hint
              }}
              disabled={yearHintUsed || availableHints <= 0}
              variant={yearHintUsed ? "outline" : "default"}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-xs">Decade</span>
            </Button>
            <span className="text-xs text-muted-foreground mt-1">-500 pts</span>
            
            {yearHintUsed && currentImage && (
              <span className="text-xs font-medium mt-2">
                {currentImage.year.toString().slice(0, -1) + "X"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HintDisplay;
