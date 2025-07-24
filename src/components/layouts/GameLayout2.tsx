
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
import HintModalV2New from '@/components/HintModalV2New';
import { useHintV2 } from '@/hooks/useHintV2';
import LazyImage from '@/components/ui/LazyImage';
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import { useGame } from '@/contexts/GameContext';

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};


export interface GameLayout2Props {
  onComplete?: () => void;
  gameMode?: string;
}

const GameLayout2: React.FC<GameLayout2Props> = ({ onComplete, gameMode = 'solo' }) => {
  const [isHintModalV2Open, setIsHintModalV2Open] = useState(false);
  const game = useGame();
  const { totalGameAccuracy, totalGameXP, roundTimerSec, timerEnabled } = game;
  
  const { 
    availableHints,
    purchasedHintIds,
    xpDebt,
    accDebt,
    isLoading,
    purchaseHint
  } = useHintV2();

  const handleHintClick = () => {
    setIsHintModalV2Open(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col md:flex-row">
      {/* Historical Image Side */}
      <div className="w-full md:w-1/2 h-[60vh] md:h-screen relative">
        <LazyImage
          src="https://source.unsplash.com/random/1600x900/?historical,vintage"
          alt="Historical scene"
          className="w-full h-full object-cover"
          skeletonClassName="w-full h-full"
        />
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <Button 
            size="sm" 
            className={`bg-blue-500 hover:bg-blue-600 text-white border-none`}
            onClick={handleHintClick}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Hints V2
          </Button>
          <Button 
            size="sm" 
            className={`bg-black/50 hover:bg-black/70 text-white border-none`}
          >
            <Maximize className="h-4 w-4" />
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
          
          {/* GameOverlayHUD */}
          <GameOverlayHUD 
            remainingTime={formatTime(roundTimerSec)}
            rawRemainingTime={roundTimerSec}
            onHintV2Click={handleHintClick}
            hintsUsed={purchasedHintIds.length}
            hintsAllowed={14}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={() => {}}
            onConfirmNavigation={() => {}}
            onOpenSettingsModal={() => {}}
            imageUrl=""
            onFullscreen={() => {}}
            isTimerActive={true}
            onTimeout={() => {}}
            setRemainingTime={() => {}}
            timerEnabled={timerEnabled}
          />
        </div>
      </div>

      {isHintModalV2Open && (
        <HintModalV2New
          isOpen={isHintModalV2Open}
          onOpenChange={setIsHintModalV2Open}
          availableHints={availableHints}
          purchasedHintIds={purchasedHintIds}
          xpDebt={xpDebt}
          accDebt={accDebt}
          onPurchaseHint={purchaseHint}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default GameLayout2;
