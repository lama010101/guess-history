
import { useState } from 'react';
import { Map, Clock } from 'lucide-react';
import MapComponent from '../MapComponent';
import HistoricalImage from '../HistoricalImage';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    <div className="glass-card rounded-2xl overflow-hidden h-full">
      <div className="h-[500px] relative">
        {/* Game score and round info in the top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-black/40 backdrop-blur-sm py-2 px-4 flex justify-between items-center">
          <div className="text-white text-sm font-medium">
            Round {gameRound} of {maxRounds}
          </div>
          <div className="text-white text-sm font-medium">
            Score: {totalScore}
          </div>
        </div>

        <Tabs defaultValue="image" className="w-full h-full">
          {/* Tab buttons */}
          <div className="absolute top-16 left-0 right-0 z-10 flex justify-center">
            <TabsList className="bg-black/30 backdrop-blur-md rounded-full">
              <TabsTrigger value="image" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black text-white/90">
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1.5" />
                  Image
                </span>
              </TabsTrigger>
              
              <TabsTrigger value="map" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black text-white/90">
                <span className="flex items-center">
                  <Map className="h-4 w-4 mr-1.5" />
                  Map
                </span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Image view */}
          <TabsContent value="image" className="m-0 h-full">
            <div className="absolute inset-0">
              <HistoricalImage src={currentImage.src} alt={currentImage.description} />
            </div>
          </TabsContent>
          
          {/* Map view */}
          <TabsContent value="map" className="m-0 h-full">
            <div className="absolute inset-0">
              <MapComponent 
                onLocationSelect={onLocationSelect} 
                selectedLocation={selectedLocation}
              />
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Display location hint if used */}
        {locationHintUsed && (
          <div className="absolute top-20 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Location:</span> {getLocationHint()}
          </div>
        )}
        
        {/* Display year hint if used */}
        {yearHintUsed && (
          <div className="absolute top-32 right-4 z-10 bg-background/80 backdrop-blur-sm px-3 py-2 rounded-md text-sm border border-amber-300">
            <span className="font-medium">Year:</span> {getYearHint()}
          </div>
        )}
        
        {/* Hints controls */}
        <div className="absolute right-4 top-20 z-10">
          <HintDisplay 
            availableHints={hintCoins} 
            onUseLocationHint={onUseLocationHint}
            onUseYearHint={onUseYearHint}
            locationHintUsed={locationHintUsed}
            yearHintUsed={yearHintUsed}
          />
        </div>
      </div>
    </div>
  );
};

export default GamePanel;
