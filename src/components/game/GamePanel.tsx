
import { useState } from 'react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import ViewToggle from './ViewToggle';
import HintSystem from './HintSystem';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  // Start with image view by default
  const [activeView, setActiveView] = useState<'image' | 'map'>('image');
  const [showHintSystem, setShowHintSystem] = useState(false);

  // Helper to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
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
              hideInstructions={true}
              initialLocation={{ lat: 50, lng: 10 }} // Center on Europe
            />
          </div>
        )}
        
        {/* Display location hint if used - country only */}
        {locationHintUsed && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Country:</span> {getCountryOnly(currentImage.locationName)}
          </div>
        )}
        
        {/* Display year hint if used */}
        {yearHintUsed && (
          <div className="absolute bottom-16 left-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Decade:</span> {currentImage.year.toString().slice(0, -1) + "X"}
          </div>
        )}
        
        {/* Toggle button for image/map view */}
        <ViewToggle 
          activeView={activeView} 
          onToggle={() => setActiveView(activeView === 'image' ? 'map' : 'image')}
          imageSrc={currentImage.src}
        />
        
        {/* Hint Button */}
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="ghost" 
            size="sm" 
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm"
            onClick={() => setShowHintSystem(!showHintSystem)}
          >
            <Lightbulb className="h-4 w-4 text-yellow-500 mr-1.5" />
            Hints
          </Button>
        </div>
        
        {/* Hint System Modal */}
        {showHintSystem && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/20 backdrop-blur-sm">
            <div className="relative w-[350px]">
              <Button
                variant="ghost"
                size="icon"
                className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-white dark:bg-gray-800 z-10"
                onClick={() => setShowHintSystem(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <HintSystem
                hintCoins={hintCoins}
                onUseLocationHint={() => {
                  onUseLocationHint();
                  setShowHintSystem(false);
                }}
                onUseYearHint={() => {
                  onUseYearHint();
                  setShowHintSystem(false);
                }}
                locationHintUsed={locationHintUsed}
                yearHintUsed={yearHintUsed}
                currentImage={currentImage}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePanel;
