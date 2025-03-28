
import { useState, useEffect } from 'react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import ViewToggle from './ViewToggle';
import HintPopup from './HintPopup';
import { Lightbulb } from 'lucide-react';
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
    country?: string;
  };
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  gameRound: number;
  maxRounds: number;
  totalScore: number;
  hintCoins: number;
  onUseLocationHint: () => boolean;
  onUseYearHint: () => boolean;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  setHintsOpen?: (open: boolean) => void;
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
  // Always default to 'image' view
  const [activeView, setActiveView] = useState<'image' | 'map'>('image');
  const [showHintPopup, setShowHintPopup] = useState(false);
  const [countryHint, setCountryHint] = useState<string | null>(null);
  const [decadeHint, setDecadeHint] = useState<string | null>(null);

  // Reset to image view when round changes (detected by currentImage.id changing)
  useEffect(() => {
    setActiveView('image');
  }, [currentImage.id]);

  // Persist hints between hint dialog opens/closes
  useEffect(() => {
    if (locationHintUsed && currentImage.locationName) {
      setCountryHint(getCountryOnly(currentImage.locationName));
    }
    
    if (yearHintUsed && currentImage.year) {
      setDecadeHint(`${currentImage.year.toString().slice(0, -1)}X`);
    }
  }, [locationHintUsed, yearHintUsed, currentImage]);

  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };

  const handleUseLocationHint = () => {
    const hintUsed = onUseLocationHint();
    if (hintUsed && currentImage.locationName) {
      setCountryHint(getCountryOnly(currentImage.locationName));
    }
    return hintUsed;
  };

  const handleUseYearHint = () => {
    const hintUsed = onUseYearHint();
    if (hintUsed && currentImage.year) {
      setDecadeHint(`${currentImage.year.toString().slice(0, -1)}X`);
    }
    return hintUsed;
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden h-full relative">
      <div className="h-[500px] relative">
        {activeView === 'image' && (
          <div className="absolute inset-0">
            <HistoricalImage src={currentImage.src} alt={currentImage.description} />
          </div>
        )}
        
        {activeView === 'map' && (
          <div className="absolute inset-0">
            <MapComponent 
              onLocationSelect={onLocationSelect} 
              selectedLocation={selectedLocation}
              hideInstructions={true}
              initialLocation={{ lat: 40, lng: -20 }} // Center between Europe and USA
              initialZoom={1} // Set zoom level to 1
            />
          </div>
        )}
        
        {/* Show hints persistently if they've been used/purchased */}
        {locationHintUsed && countryHint && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Country:</span> {countryHint}
          </div>
        )}
        
        {yearHintUsed && decadeHint && (
          <div className="absolute bottom-16 left-4 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Decade:</span> {decadeHint}
          </div>
        )}
        
        {/* Display hint popup when triggered */}
        {showHintPopup && (
          <HintPopup 
            onClose={() => setShowHintPopup(false)}
            hintCoins={hintCoins}
            onUseLocationHint={handleUseLocationHint}
            onUseYearHint={handleUseYearHint}
            locationHintUsed={locationHintUsed}
            yearHintUsed={yearHintUsed}
            currentImage={currentImage}
          />
        )}
        
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
