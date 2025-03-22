
import { useState } from 'react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import ViewToggle from './ViewToggle';
import HintSystem from './HintSystem';

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
        
        {/* Display location hint if used */}
        {locationHintUsed && (
          <div className="absolute top-4 left-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Location:</span> {currentImage.locationName?.split(',')[0] || "Unknown Location"}
          </div>
        )}
        
        {/* Display year hint if used */}
        {yearHintUsed && (
          <div className="absolute top-16 left-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Year:</span> {currentImage.year.toString().slice(0, -1) + "X"}
          </div>
        )}
        
        {/* Toggle button for image/map view */}
        <ViewToggle 
          activeView={activeView} 
          onToggle={() => setActiveView(activeView === 'image' ? 'map' : 'image')}
          imageSrc={currentImage.src}
        />
        
        {/* Hint System */}
        <div className="absolute bottom-4 right-4 z-10 w-64">
          <HintSystem
            hintCoins={hintCoins}
            onUseLocationHint={onUseLocationHint}
            onUseYearHint={onUseYearHint}
            locationHintUsed={locationHintUsed}
            yearHintUsed={yearHintUsed}
            currentImage={currentImage}
          />
        </div>
      </div>
    </div>
  );
};

export default GamePanel;
