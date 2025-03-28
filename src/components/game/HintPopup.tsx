
import { useState, useEffect } from 'react';
import { X, Lightbulb, MapPin, Calendar, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    country?: string;
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
  const [isClosing, setIsClosing] = useState(false);
  const [countryHint, setCountryHint] = useState<string | null>(null);
  const [yearHint, setYearHint] = useState<string | null>(null);
  
  // Setup escape key listener
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);
  
  // Persist hints even after closing/reopening
  useEffect(() => {
    if (locationHintUsed) {
      setCountryHint(getCountryHint());
    }
    
    if (yearHintUsed) {
      setYearHint(getYearHint());
    }
  }, [locationHintUsed, yearHintUsed, currentImage]);
  
  const getCountryHint = () => {
    if (currentImage.country) {
      return currentImage.country;
    }
    
    if (currentImage.locationName) {
      // Split by comma and get the last part which is usually the country
      const parts = currentImage.locationName.split(',');
      return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
    }
    return "Unknown Country";
  };
  
  // For year hint, show the year with the last digit hidden
  const getYearHint = () => {
    const yearString = currentImage.year.toString();
    return yearString.slice(0, -1) + "X";
  };
  
  const handleLocationHintClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (locationHintUsed || hintCoins <= 0) return;
    
    const success = onUseLocationHint();
    if (success) {
      setCountryHint(getCountryHint());
    }
  };
  
  const handleYearHintClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (yearHintUsed || hintCoins <= 0) return;
    
    const success = onUseYearHint();
    if (success) {
      setYearHint(getYearHint());
    }
  };
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 150);
  };
  
  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-150 ${isClosing ? 'opacity-0' : 'opacity-100'}`} 
      onClick={handleClose}
    >
      <Card 
        className="w-[90%] max-w-md shadow-xl transition-all duration-150 transform"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <CardTitle>Hints</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center text-sm font-medium text-muted-foreground">
            <Coins className="h-4 w-4 mr-1.5 text-yellow-500" />
            {hintCoins} hint coins available
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-1.5" />
                  Country Hint
                </div>
                <Badge variant="outline" className="text-xs">-500 pts</Badge>
              </div>
              
              <Button 
                className="w-full"
                variant={locationHintUsed ? "outline" : "default"}
                onClick={handleLocationHintClick}
                disabled={locationHintUsed || hintCoins <= 0}
              >
                {locationHintUsed ? "Revealed" : "Reveal Country"}
              </Button>
              
              {locationHintUsed && countryHint && (
                <div className="bg-primary/10 p-2 rounded text-center font-medium">
                  {countryHint}
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5" />
                  Year Hint
                </div>
                <Badge variant="outline" className="text-xs">-500 pts</Badge>
              </div>
              
              <Button 
                className="w-full"
                variant={yearHintUsed ? "outline" : "default"}
                onClick={handleYearHintClick}
                disabled={yearHintUsed || hintCoins <= 0}
              >
                {yearHintUsed ? "Revealed" : "Reveal Decade"}
              </Button>
              
              {yearHintUsed && yearHint && (
                <div className="bg-primary/10 p-2 rounded text-center font-medium">
                  {yearHint}
                </div>
              )}
            </div>
          </div>
          
          {hintCoins <= 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-md text-sm">
              <p className="font-medium">No hint coins left!</p>
              <p className="text-muted-foreground">Complete more rounds to earn hint coins.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HintPopup;
