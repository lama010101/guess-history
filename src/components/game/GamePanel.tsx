
import { useState } from 'react';
import { Image, Map } from 'lucide-react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';

interface GamePanelProps {
  currentImage: {
    id: number;
    src: string;
    year: number;
    location: { lat: number; lng: number };
    description: string;
    title?: string;
    locationName?: string;
  };
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  gameRound: number;
  maxRounds: number;
  totalScore: number;
  hintCoins: number;
  onUseLocationHint: () => void;
  onUseYearHint: () => void;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
}

const GamePanel = ({ 
  currentImage, 
  onLocationSelect, 
  selectedLocation,
  gameRound,
  maxRounds,
  totalScore,
  hintCoins,
  onUseLocationHint,
  onUseYearHint,
  locationHintUsed,
  yearHintUsed
}: GamePanelProps) => {
  const [activeView, setActiveView] = useState<'image' | 'map'>('image');
  
  // For location hint, we'll show the country name or location name if available
  const getLocationHint = () => {
    if (currentImage.locationName) {
      return currentImage.locationName;
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
    <div className="glass-card rounded-2xl overflow-hidden h-full relative">
      <div className="h-[500px] relative">
        {/* Image view */}
        {activeView === 'image' && (
          <div className="absolute inset-0">
            <HistoricalImage src={currentImage.src} alt={currentImage.description} />
          </div>
        )}
        
        {/* Map view */}
        {activeView === 'map' && (
          <div className="absolute inset-0">
            <MapComponent 
              onLocationSelect={onLocationSelect} 
              selectedLocation={selectedLocation}
            />
          </div>
        )}
        
        {/* Display location hint if used */}
        {locationHintUsed && (
          <div className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Location:</span> {getLocationHint()}
          </div>
        )}
        
        {/* Display year hint if used */}
        {yearHintUsed && (
          <div className="absolute top-16 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Year:</span> {getYearHint()}
          </div>
        )}
        
        {/* Toggle button for image/map view */}
        <div className="absolute bottom-4 right-4 z-10">
          <Toggle 
            pressed={activeView === 'map'} 
            onPressedChange={(pressed) => setActiveView(pressed ? 'map' : 'image')}
            className="bg-background/80 backdrop-blur-sm shadow-lg border"
          >
            {activeView === 'image' ? (
              <Map className="h-5 w-5" />
            ) : (
              <Image className="h-5 w-5" />
            )}
          </Toggle>
        </div>
      </div>
    </div>
  );
};

export default GamePanel;
