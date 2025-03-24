
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
  
  // Local state to track used hints for UI persistence
  const [localLocationHintUsed, setLocalLocationHintUsed] = useState(locationHintUsed);
  const [localYearHintUsed, setLocalYearHintUsed] = useState(yearHintUsed);
  const [localHintValue, setLocalHintValue] = useState<{country?: string, decade?: string}>({});
  const [remainingHints, setRemainingHints] = useState(availableHints);
  
  // Update local state when global state changes or when component mounts
  useEffect(() => {
    setLocalLocationHintUsed(locationHintUsed);
    setLocalYearHintUsed(yearHintUsed);
    setRemainingHints(hintCoins);
    
    // Set hint values when hints are used
    if (locationHintUsed && currentImage) {
      setLocalHintValue(prev => ({
        ...prev,
        country: getCountryOnly(currentImage.locationName)
      }));
    }
    
    if (yearHintUsed && currentImage) {
      setLocalHintValue(prev => ({
        ...prev,
        decade: currentImage.year.toString().slice(0, -1) + "X"
      }));
    }
  }, [locationHintUsed, yearHintUsed, currentImage, hintCoins]);

  // Function to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };
  
  // Handle using location hint
  const onUseLocationHint = () => {
    handleUseLocationHint();
    
    // Only update local state if hint coin is available and hint not already used
    if (remainingHints > 0 && !localLocationHintUsed && currentImage) {
      setLocalLocationHintUsed(true);
      setRemainingHints(prev => prev - 1);
      setLocalHintValue(prev => ({
        ...prev,
        country: getCountryOnly(currentImage.locationName)
      }));
    }
  };
  
  // Handle using year hint
  const onUseYearHint = () => {
    handleUseYearHint();
    
    // Only update local state if hint coin is available and hint not already used
    if (remainingHints > 0 && !localYearHintUsed && currentImage) {
      setLocalYearHintUsed(true);
      setRemainingHints(prev => prev - 1);
      setLocalHintValue(prev => ({
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
            
            {localLocationHintUsed && localHintValue.country && (
              <span className="text-xs font-medium mt-2">
                {localHintValue.country}
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
            
            {localYearHintUsed && localHintValue.decade && (
              <span className="text-xs font-medium mt-2">
                {localHintValue.decade}
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
