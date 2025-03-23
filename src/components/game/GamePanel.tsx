
import { useState } from 'react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import ViewToggle from './ViewToggle';
import { Lightbulb } from 'lucide-react';

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
        
        {/* Display both hints at the top center if used */}
        {(locationHintUsed || yearHintUsed) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-4 py-2 rounded-md text-sm border border-amber-300 flex gap-4">
            {locationHintUsed && (
              <div className="flex items-center">
                <Lightbulb className="h-3 w-3 mr-1.5 text-yellow-500" />
                <span className="font-medium">Country:</span> {getCountryOnly(currentImage.locationName)}
              </div>
            )}
            
            {yearHintUsed && (
              <div className="flex items-center">
                <Lightbulb className="h-3 w-3 mr-1.5 text-yellow-500" />
                <span className="font-medium">Decade:</span> {currentImage.year.toString().slice(0, -1) + "X"}
              </div>
            )}
          </div>
        )}
        
        {/* Toggle button for image/map view */}
        <ViewToggle 
          activeView={activeView} 
          onToggle={() => setActiveView(activeView === 'image' ? 'map' : 'image')}
          imageSrc={currentImage.src}
        />
      </div>
    </div>
  );
};

export default GamePanel;
