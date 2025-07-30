
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  HelpCircle,
  ChevronRight
} from "lucide-react";
import HintModal from '@/components/HintModal';
import { useHint } from '@/hooks/useHint';
import MapSelector from '@/components/MapSelector';

export interface GameLayout1Props {
  onComplete?: () => void;
  gameMode?: string;
  gameId?: string;
}

const GameLayout1: React.FC<GameLayout1Props> = ({ onComplete, gameMode = 'solo', gameId }) => {
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const { selectedHintType, hintContent, selectHint } = useHint();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(1932);

  const handleHintClick = () => {
    setIsHintModalOpen(true);
  };

  const yearMarkers = [1850, 1900, 1950, 2000];

  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-history-dark">
      {/* Historical Image */}
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img
          src="https://source.unsplash.com/random/1600x900/?historical,vintage"
          alt="Historical scene"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            className={`bg-white/70 hover:bg-white ${selectedHintType ? 'text-history-secondary' : 'text-history-primary'}`}
            onClick={handleHintClick}
          >
            <HelpCircle className="h-5 w-5" />
            <span className="ml-1">Hint</span>
            {selectedHintType && <span className="ml-1 text-xs">({selectedHintType})</span>}
          </Button>
          <Button size="sm" variant="outline" className="bg-white/70 text-history-primary hover:bg-white">
            <Clock className="h-5 w-5" />
            <span className="ml-1">4:32</span>
          </Button>
        </div>
      </div>
      
      {/* Game mode indicator */}
      <div className="px-4 py-2 bg-history-secondary/10 text-center">
        <span className="text-sm font-medium text-history-secondary">Game Mode: {gameMode.toUpperCase()}</span>
        {gameId && <span className="text-xs text-muted-foreground ml-2">ID: {gameId.substring(0, 8)}...</span>}
      </div>
      
      {/* Game Controls */}
      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          {/* When - Date Selector */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <h2 className="text-xl font-bold text-history-primary dark:text-history-light">WHEN</h2>
              <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">{selectedYear}</div>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="1850" 
                max="2023" 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="time-slider w-full" 
              />
              <div className="flex justify-between mt-2">
                {yearMarkers.map((year) => (
                  <div 
                    key={year} 
                    className="text-xs text-muted-foreground"
                  >
                    {year}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Where - Map Selector */}
          {/* Where - Map Selector */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-history-primary dark:text-history-light">WHERE</h2>
              {selectedLocation && (
                <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">
                  {selectedLocation}
                </div>
              )}
            </div>
            <div className="relative">
              <div className="map-container h-64 md:h-80 w-full">
                <MapSelector onLocationSelect={setSelectedLocation} />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-auto w-full px-4 pb-4 md:px-0 md:pb-0">
            <Button 
              className="w-full max-w-md mx-auto flex items-center justify-center game-button"
              onClick={onComplete}
            >
              <span>Submit Guess</span>
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hint Modal */}
      <HintModal
        isOpen={isHintModalOpen}
        onOpenChange={setIsHintModalOpen}
        selectedHintType={selectedHintType}
        hintContent={hintContent}
        onSelectHint={selectHint}
      />
    </div>
  );
};

export default GameLayout1;
