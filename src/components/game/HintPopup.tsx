
import { useState } from 'react';
import { Lightbulb, MapPin, Calendar, X, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HintPopupProps {
  onClose: () => void;
  hintCoins: number;
  onUseLocationHint: () => boolean;
  onUseYearHint: () => boolean;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  currentImage: {
    year: number;
    location: { lat: number; lng: number };
    description: string;
    locationName?: string;
  };
}

const HintPopup = ({
  onClose,
  hintCoins,
  onUseLocationHint,
  onUseYearHint,
  locationHintUsed,
  yearHintUsed,
  currentImage
}: HintPopupProps) => {
  const [countryHint, setCountryHint] = useState<string | null>(null);
  const [yearHint, setYearHint] = useState<string | null>(null);
  
  // Function to extract country from location name
  const getCountryHint = () => {
    if (currentImage.locationName) {
      // Split by comma and get the last part which is usually the country
      const parts = currentImage.locationName.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    }
    return "Unknown Country";
  };
  
  // Function to get decade hint from year
  const getYearHint = () => {
    const yearString = currentImage.year.toString();
    return yearString.slice(0, -1) + "X";
  };
  
  // Handle location hint click
  const handleLocationHintClick = () => {
    if (locationHintUsed || hintCoins <= 0) return;
    
    const success = onUseLocationHint();
    if (success) {
      setCountryHint(getCountryHint());
    }
  };
  
  // Handle year hint click
  const handleYearHintClick = () => {
    if (yearHintUsed || hintCoins <= 0) return;
    
    const success = onUseYearHint();
    if (success) {
      setYearHint(getYearHint());
    }
  };
  
  return (
    <div className="absolute top-12 right-4 z-50 bg-white dark:bg-gray-900 shadow-lg rounded-lg w-64 p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold flex items-center">
          <Lightbulb className="h-4 w-4 mr-1.5 text-yellow-500" />
          Hints
        </h3>
        <div className="flex gap-2">
          <div className="flex items-center text-sm font-medium">
            <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
            {hintCoins} coins
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <Button 
            variant={locationHintUsed ? "outline" : "default"} 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={handleLocationHintClick}
            disabled={locationHintUsed || hintCoins <= 0}
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            Country Hint
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            Cost: -500 points
          </div>
          {locationHintUsed && countryHint && (
            <div className="text-xs mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-center font-medium border border-amber-200 dark:border-amber-800">
              {countryHint}
            </div>
          )}
        </div>
          
        <div>
          <Button 
            variant={yearHintUsed ? "outline" : "default"} 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={handleYearHintClick}
            disabled={yearHintUsed || hintCoins <= 0}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Decade Hint
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            Cost: -500 points
          </div>
          {yearHintUsed && yearHint && (
            <div className="text-xs mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-center font-medium border border-amber-200 dark:border-amber-800">
              {yearHint}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HintPopup;
