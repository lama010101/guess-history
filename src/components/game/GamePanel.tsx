
import { useState } from 'react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import ViewToggle from './ViewToggle';
import { Lightbulb } from 'lucide-react';
import HintDisplay from '../HintDisplay';

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
  setHintsOpen?: (open: boolean) => void; // Added prop to handle hints popup state
}

const GamePanel = ({ 
  currentImage, 
  onLocationSelect, 
  selectedLocation,
  locationHintUsed,
  yearHintUsed,
  hintCoins,
  onUseLocationHint,
  onUseYearHint,
  setHintsOpen
}: GamePanelProps) => {
  // Start with image view by default
  const [activeView, setActiveView] = useState<'image' | 'map'>('image');
  const [showHints, setShowHints] = useState(false);

  // Helper to extract just the country from location name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };

  const toggleHints = () => {
    const newState = !showHints;
    setShowHints(newState);
    if (setHintsOpen) {
      setHintsOpen(newState);
    }
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
        
        {/* Hints Button */}
        <button
          onClick={toggleHints}
          className="absolute top-4 left-4 z-10 p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full shadow-md"
        >
          <Lightbulb className="h-5 w-5 text-amber-500" />
        </button>

        {/* Hints Popup */}
        {showHints && (
          <div className="absolute top-16 left-4 z-20">
            <HintDisplay 
              availableHints={hintCoins} 
              onClose={toggleHints} 
            />
          </div>
        )}
        
        {/* Toggle button for image/map view */}
        <ViewToggle 
          activeView={activeView} 
          onToggle={() => setActiveView(activeView === 'image' ? 'map' : 'image')}
          imageSrc={currentImage.src}
          showClose={false}
        />
      </div>
    </div>
  );
};

export default GamePanel;
