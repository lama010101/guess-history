
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Maximize, 
  Clock, 
  HelpCircle,
  Calendar,
  MapPin,
  Check
} from "lucide-react";
import HintModal from '@/components/HintModal';
import { useHint } from '@/hooks/useHint';

export interface GameLayout2Props {
  onComplete?: () => void;
  gameMode?: string;
}

const GameLayout2: React.FC<GameLayout2Props> = ({ onComplete, gameMode = 'solo' }) => {
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const { selectedHintType, hintContent, selectHint } = useHint();

  const handleHintClick = () => {
    setIsHintModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Historical Image Side */}
      <div className="w-full md:w-1/2 h-[40vh] md:h-screen relative">
        <img
          src="https://source.unsplash.com/random/1600x900/?historical,vintage"
          alt="Historical scene"
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button 
            size="sm" 
            className={`bg-black/50 hover:bg-black/70 text-white border-none ${selectedHintType ? 'bg-history-secondary/50' : ''}`}
            onClick={handleHintClick}
          >
            <HelpCircle className="h-4 w-4 mr-1" /> 
            Hint
            {selectedHintType && <span className="ml-1 text-xs">({selectedHintType})</span>}
          </Button>
          <Button size="sm" className="bg-black/50 hover:bg-black/70 text-white border-none">
            <Clock className="h-4 w-4 mr-1" /> 4:32
          </Button>
        </div>
      </div>
      
      {/* Game Controls Side */}
      <div className="w-full md:w-1/2 p-6 md:overflow-auto">
        <div className="h-full flex flex-col">
          {/* Game mode indicator */}
          <div className="mb-4 px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium self-center">
            {gameMode.toUpperCase()}
          </div>

          {/* When - Date Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-history-primary dark:text-history-light" />
              <h2 className="text-xl font-bold text-history-primary dark:text-history-light">WHEN</h2>
              <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">1932</div>
            </div>
            
            <div className="glass p-4 rounded-xl">
              <div className="time-slider-container relative pb-8">
                <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full mb-1">
                  <div className="h-full w-[48%] bg-history-secondary rounded-full"></div>
                </div>
                
                <input type="range" min="1850" max="2023" defaultValue="1932" className="time-slider w-full" />
                
                <div className="absolute left-0 -bottom-1 text-xs text-muted-foreground">1850</div>
                <div className="absolute left-1/4 -bottom-1 text-xs text-muted-foreground">1900</div>
                <div className="absolute left-1/2 -bottom-1 text-xs text-muted-foreground">1950</div>
                <div className="absolute left-3/4 -bottom-1 text-xs text-muted-foreground">2000</div>
                <div className="absolute right-0 -bottom-1 text-xs text-muted-foreground">Today</div>
              </div>
            </div>
          </div>
          
          {/* Where - Map Section */}
          <div className="flex-grow mb-8">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-5 w-5 text-history-primary dark:text-history-light" />
              <h2 className="text-xl font-bold text-history-primary dark:text-history-light">WHERE</h2>
              <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">Central Europe</div>
            </div>
            
            <div className="glass p-4 rounded-xl h-[calc(100%-2rem)]">
              <div className="relative h-full map-placeholder rounded-lg overflow-hidden">
                {/* Map placeholder */}
                <Button size="icon" className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white text-history-primary">
                  <Maximize className="h-4 w-4" />
                </Button>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="h-10 w-10 rounded-full bg-history-accent border-4 border-white flex items-center justify-center text-white">
                    GH
                  </div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-full border-2 border-history-accent opacity-50"></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <Button 
            className="mt-auto py-6 text-lg font-semibold rounded-xl bg-history-accent hover:bg-history-accent/90 text-white"
            onClick={onComplete}
          >
            <Check className="mr-2 h-5 w-5" />
            Submit Guess
          </Button>
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

export default GameLayout2;
