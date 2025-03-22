
import { Lightbulb, MapPin, Calendar, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // For location hint, we'll show the country only if available
  const getCountryHint = () => {
    if (currentImage.locationName) {
      // Split by comma and get the last part which is usually the country
      const parts = currentImage.locationName.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    }
    
    // Simplified implementation - in a real app, you would use a geocoding service
    const locations: Record<string, string> = {
      "48.8584,2.2945": "France",
      "40.7484,-73.9857": "United States",
      "37.8199,-122.4783": "United States",
    };
    
    const coordKey = `${currentImage.location.lat},${currentImage.location.lng}`;
    return locations[coordKey] || "Unknown Country";
  };
  
  // For year hint, we'll show the year with the last digit hidden
  const getYearHint = () => {
    const yearString = currentImage.year.toString();
    return yearString.slice(0, -1) + "X";
  };
  
  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center">
          <Lightbulb className="h-4 w-4 mr-1.5 text-yellow-500" />
          Available Hints
        </h3>
        <div className="flex items-center text-sm font-medium">
          <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
          {hintCoins} coins
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  variant={locationHintUsed ? "outline" : "secondary"} 
                  size="sm" 
                  className="w-full flex items-center justify-center"
                  onClick={onUseLocationHint}
                  disabled={locationHintUsed || hintCoins <= 0}
                >
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Location
                </Button>
                {locationHintUsed && (
                  <div className="text-xs mt-1 text-center text-muted-foreground">
                    {getCountryHint()}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reveals the country where this photo was taken</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button 
                  variant={yearHintUsed ? "outline" : "secondary"} 
                  size="sm" 
                  className="w-full flex items-center justify-center"
                  onClick={onUseYearHint}
                  disabled={yearHintUsed || hintCoins <= 0}
                >
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Year
                </Button>
                {yearHintUsed && (
                  <div className="text-xs mt-1 text-center text-muted-foreground">
                    {getYearHint()}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Shows the year with last digit hidden</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default HintSystem;
