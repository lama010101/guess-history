
import { Lightbulb, MapPin, Calendar, Coins, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HintSystemProps {
  hintCoins: number;
  onUseLocationHint: () => void;
  onUseYearHint: () => void;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  onClose: () => void;
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
  onClose,
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
    <div className="bg-white dark:bg-gray-900 rounded-lg p-5 shadow-md w-[350px]">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
          Available Hints
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center mb-3">
        <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
        <span className="text-sm font-medium">{hintCoins} hint coins available</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 py-2">
        <div className="flex flex-col">
          <Button 
            variant={locationHintUsed ? "outline" : "default"} 
            className="w-full flex items-center justify-center"
            onClick={onUseLocationHint}
            disabled={locationHintUsed || hintCoins <= 0}
          >
            <MapPin className="h-4 w-4 mr-1.5" />
            Country
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            -500 points
          </div>
        </div>
          
        <div className="flex flex-col">
          <Button 
            variant={yearHintUsed ? "outline" : "default"}
            className="w-full flex items-center justify-center"
            onClick={onUseYearHint}
            disabled={yearHintUsed || hintCoins <= 0}
          >
            <Calendar className="h-4 w-4 mr-1.5" />
            Decade
          </Button>
          <div className="text-xs mt-1 text-center text-neutral-500 dark:text-neutral-400">
            -500 points
          </div>
        </div>
      </div>
    </div>
  );
};

export default HintSystem;
