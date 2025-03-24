
import { Lightbulb, MapPin, Calendar, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HintSystemProps {
  hintCoins: number;
  onUseLocationHint: () => void;
  onUseYearHint: () => void;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  currentImage: {
    year: number;
    location: { lat: number; lng: number };
    description: string;
    locationName?: string;
  };
}

const HintSystem = ({
  hintCoins,
  onUseLocationHint,
  onUseYearHint,
  locationHintUsed,
  yearHintUsed,
  currentImage
}: HintSystemProps) => {
  // For location hint, we'll show the country only
  const getCountryHint = () => {
    if (currentImage.locationName) {
      // Split by comma and get the last part which is usually the country
      const parts = currentImage.locationName.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    }
    return "Unknown Country";
  };
  
  // For year hint, we'll show the year with the last digit hidden
  const getYearHint = () => {
    const yearString = currentImage.year.toString();
    return yearString.slice(0, -1) + "X";
  };
  
  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg p-3 shadow-md w-[110%]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center">
          <Lightbulb className="h-4 w-4 mr-1.5 text-yellow-500" />
          Hints
        </h3>
        <div className="flex items-center text-sm font-medium">
          <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
          {hintCoins} coins
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Button 
            variant={locationHintUsed ? "outline" : "default"} 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={onUseLocationHint}
            disabled={locationHintUsed || hintCoins <= 0}
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            Country
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            Cost: -500 points
          </div>
          {locationHintUsed && (
            <div className="text-xs mt-1 text-center font-medium">
              {getCountryHint()}
            </div>
          )}
        </div>
          
        <div>
          <Button 
            variant={yearHintUsed ? "outline" : "default"} 
            size="sm" 
            className="w-full flex items-center justify-center"
            onClick={onUseYearHint}
            disabled={yearHintUsed || hintCoins <= 0}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Decade
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            Cost: -500 points
          </div>
          {yearHintUsed && (
            <div className="text-xs mt-1 text-center font-medium">
              {getYearHint()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HintSystem;
