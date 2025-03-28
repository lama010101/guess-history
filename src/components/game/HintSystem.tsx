
import { useState } from 'react';
import { Lightbulb, MapPin, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface HintSystemProps {
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

const HintSystem = ({
  hintCoins,
  onUseLocationHint,
  onUseYearHint,
  locationHintUsed,
  yearHintUsed,
  currentImage
}: HintSystemProps) => {
  const { toast } = useToast();
  const [showSection, setShowSection] = useState(true);

  // Helper to extract just the country name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };

  const handleUseLocationHint = () => {
    if (locationHintUsed) {
      return;
    }
    
    if (hintCoins < 500) {
      toast({
        title: "Not enough hint coins",
        description: "You need 500 coins to use a location hint",
        variant: "destructive"
      });
      return;
    }
    
    const success = onUseLocationHint();
    if (success) {
      toast({
        title: "Location hint used",
        description: "500 coins deducted from your balance",
      });
    }
  };

  const handleUseYearHint = () => {
    if (yearHintUsed) {
      return;
    }
    
    if (hintCoins < 500) {
      toast({
        title: "Not enough hint coins",
        description: "You need 500 coins to use a year hint",
        variant: "destructive"
      });
      return;
    }
    
    const success = onUseYearHint();
    if (success) {
      toast({
        title: "Year hint used",
        description: "500 coins deducted from your balance",
      });
    }
  };

  if (!showSection) return null;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 max-w-sm w-full border border-border z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold flex items-center">
          <Lightbulb className="h-4 w-4 mr-1.5 text-amber-500" />
          Hints
        </h3>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 w-7 p-0" 
          onClick={() => setShowSection(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-sm mb-4">
        <p>Spend your hint coins to reveal information about this image.</p>
        <p className="mt-1 font-semibold">Available coins: {hintCoins}</p>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center p-2 border border-border rounded-md bg-secondary/20">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span>Country hint</span>
          </div>
          {locationHintUsed ? (
            <div className="bg-primary/10 text-primary text-xs py-1 px-2 rounded-full">
              {getCountryOnly(currentImage.locationName)}
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUseLocationHint}
              disabled={hintCoins < 500}
            >
              Use (500)
            </Button>
          )}
        </div>
        
        <div className="flex justify-between items-center p-2 border border-border rounded-md bg-secondary/20">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span>Decade hint</span>
          </div>
          {yearHintUsed ? (
            <div className="bg-primary/10 text-primary text-xs py-1 px-2 rounded-full">
              {`${currentImage.year.toString().slice(0, -1)}0s`}
            </div>
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleUseYearHint}
              disabled={hintCoins < 500}
            >
              Use (500)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HintSystem;
