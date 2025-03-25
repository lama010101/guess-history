
import { X, Lightbulb, MapPin, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGameState } from '@/hooks/useGameState';
import { useEffect, useState } from 'react';

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
    currentImage,
    hintCoins
  } = useGameState();
  
  // Persist hint usage states locally
  const [localLocationHintUsed, setLocalLocationHintUsed] = useState(locationHintUsed);
  const [localYearHintUsed, setLocalYearHintUsed] = useState(yearHintUsed);
  const [localHintValues, setLocalHintValues] = useState<{country?: string, decade?: string}>({});
  const [remainingHints, setRemainingHints] = useState(availableHints);
  
  // Update local state when global state changes
  useEffect(() => {
    setLocalLocationHintUsed(locationHintUsed);
    setLocalYearHintUsed(yearHintUsed);
    setRemainingHints(hintCoins);
    
    // Set hint values when hints are used and current image is available
    if (currentImage) {
      const updatedHintValues = { ...localHintValues };
      
      if (locationHintUsed && currentImage.locationName) {
        updatedHintValues.country = getCountryOnly(currentImage.locationName);
      }
      
      if (yearHintUsed) {
        updatedHintValues.decade = currentImage.year.toString().slice(0, -1) + "X";
      }
      
      setLocalHintValues(updatedHintValues);
    }
  }, [locationHintUsed, yearHintUsed, currentImage, hintCoins]);

  // Helper to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };
  
  // Handle using location hint
  const onUseLocationHint = () => {
    const success = handleUseLocationHint();
    
    if (success && currentImage && currentImage.locationName) {
      setLocalLocationHintUsed(true);
      setRemainingHints(prev => prev - 1);
      setLocalHintValues(prev => ({
        ...prev,
        country: getCountryOnly(currentImage.locationName)
      }));
    }
  };
  
  // Handle using year hint
  const onUseYearHint = () => {
    const success = handleUseYearHint();
    
    if (success && currentImage) {
      setLocalYearHintUsed(true);
      setRemainingHints(prev => prev - 1);
      setLocalHintValues(prev => ({
        ...prev,
        decade: currentImage.year.toString().slice(0, -1) + "X"
      }));
    }
  };

  return (
    <div className="w-[290px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-lg border border-border shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold">Hints</h3>
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
              onClick={onUseLocationHint}
              disabled={localLocationHintUsed || remainingHints <= 0}
              variant={localLocationHintUsed ? "outline" : "default"}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-xs">Country</span>
            </Button>
            <span className="text-xs text-muted-foreground mt-1">-500 pts</span>
            
            {localLocationHintUsed && localHintValues.country && (
              <span className="text-xs font-medium mt-2">
                {localHintValues.country}
              </span>
            )}
          </div>
          
          <div className="flex flex-col items-center">
            <Button 
              onClick={onUseYearHint}
              disabled={localYearHintUsed || remainingHints <= 0}
              variant={localYearHintUsed ? "outline" : "default"}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-xs">Decade</span>
            </Button>
            <span className="text-xs text-muted-foreground mt-1">-500 pts</span>
            
            {localYearHintUsed && localHintValues.decade && (
              <span className="text-xs font-medium mt-2">
                {localHintValues.decade}
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-2 text-center text-xs font-medium">
          Remaining hints: {remainingHints}
        </div>
      </div>
    </div>
  );
};

export default HintDisplay;
