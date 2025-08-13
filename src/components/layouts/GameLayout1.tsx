import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import FullscreenZoomableImage from './FullscreenZoomableImage';
import ImmersiveCylViewer from '@/components/ImmersiveCylViewer';
import HomeMap from '../HomeMap';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import HintModalV2New from '@/components/HintModalV2New';

import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay from '@/components/game/TimerDisplay';
import LazyImage from '@/components/ui/LazyImage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
import { GameImage, useGame } from '@/contexts/GameContext';
import { GuessCoordinates } from '@/types';
import { Hint } from '@/hooks/useHintV2';

export interface GameLayout1Props {
  onComplete?: () => void;
  gameMode?: string;
  currentRound?: number;
  image: GameImage | null;
  onMapGuess: (lat: number, lng: number) => void;
  initialGuess?: GuessCoordinates | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  remainingTime: number;
  setRemainingTime: React.Dispatch<React.SetStateAction<number>>;
  isTimerActive: boolean;
  onNavigateHome: () => void;
  onConfirmNavigation: (navigateTo: () => void) => void;
  avatarUrl?: string;
  onTimeout?: () => void;
  availableHints: Hint[];
  purchasedHints: Hint[];
  purchasedHintIds: string[];
  xpDebt: number;
  accDebt: number;
  onPurchaseHint: (hintId: string) => Promise<void>;
  isHintLoading: boolean;
}

const GameLayout1: React.FC<GameLayout1Props> = ({
  onComplete,
  gameMode = 'solo',
  currentRound = 1,
  image,
  onMapGuess,
  initialGuess,
  selectedYear,
  onYearChange,
  remainingTime,
  setRemainingTime,
  isTimerActive,
  avatarUrl,
  onNavigateHome,
  onConfirmNavigation,
  onTimeout,
  availableHints,
  purchasedHints,
  purchasedHintIds,
  xpDebt,
  accDebt,
  onPurchaseHint,
  isHintLoading,
}) => {
  const [isImageFullScreen, setIsImageFullScreen] = useState(true);
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);

  // Admin-configurable flags via env (fallbacks match spec defaults)
  const immersiveEnabled = ((import.meta as any).env?.VITE_IMMERSIVE_ENABLED ?? 'true') === 'true';
  const immersiveLockFov = Number((import.meta as any).env?.VITE_IMMERSIVE_LOCKFOV ?? 70);
  const immersiveCurvature = Number((import.meta as any).env?.VITE_IMMERSIVE_CURVATURE_DEG ?? 150);
  const immersiveEnableGyro = ((import.meta as any).env?.VITE_IMMERSIVE_ENABLE_GYRO ?? 'true') === 'true';

  const handleImageFullscreen = () => {
    setIsImageFullScreen(true);
  };

  const handleExitImageFullscreen = () => {
    setIsImageFullScreen(false);
  };

  const [isHintModalV2Open, setIsHintModalV2Open] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const game = useGame();
  const { totalGameAccuracy, totalGameXP, roundTimerSec, timerEnabled } = game;

  // V2 hint system
  
  
  // Handle timer timeout
  const handleTimeout = useCallback(() => {
    console.log(`[GameLayout1] Timer expired for round ${currentRound}`);
    
    // Call the handleTimeUp function from the GameContext
    if (game.handleTimeUp) {
      // Convert 1-based currentRound to 0-based index for the context
      game.handleTimeUp(currentRound - 1);
      
      // Note: We don't call onComplete here because handleTimeUp handles navigation
      // This prevents double navigation that could cause issues
    } else {
      console.error('[GameLayout1] game.handleTimeUp is not available on context');
      
      // Fallback behavior if handleTimeUp is not available
      // If no guess was made, submit a default guess at 0,0 (but don't show toast)
      if (!currentGuess) {
        onMapGuess(0, 0);
      }
      
      // Only call onComplete in the fallback case
      if (onComplete) {
        onComplete();
      }
    }
  }, [game, currentRound, currentGuess, onMapGuess, onComplete]);
  


  const handleHintClick = () => {
    if (!image) {
      console.error('Cannot show hint modal: no image data available');
      return;
    }
    
    // Open the V2 hint modal instead of the old one
    setIsHintModalV2Open(true);
  };

  const handleCoordinatesSelect = (lat: number, lng: number) => {
    setCurrentGuess({ lat, lng });
    onMapGuess(lat, lng);
    console.log("Map coordinates selected:", lat, lng);
  };

  const handleSubmitGuess = () => {
    if (!currentGuess) {
      console.error('No location selected');
      return;
    }
    
    // Call the parent's onComplete if it exists
    if (onComplete) {
      onComplete();
    }
  };

  if (!image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-history-light dark:bg-history-dark">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500 mb-4">Failed to load round data</h2>
          <p className="mb-4">Image data for round {currentRound} is missing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background dark:bg-history-dark">
      {/* Image Section - Full width on mobile, half on desktop */}
      <div className="w-full h-[40vh] lg:w-1/2 lg:h-screen relative">
        <LazyImage
          src={image.firebase_url || image.url}
          alt={image.title}
          className="w-full h-full object-cover"
          skeletonClassName="w-full h-full"
        />
        {immersiveEnabled && (
          <button
            type="button"
            className="absolute top-3 right-16 z-20 rounded-full bg-white/90 text-black text-sm px-3 py-1 shadow hover:bg-white"
            onClick={() => setIsImmersiveOpen(true)}
            aria-label="Open Immersive Viewer"
          >
            Immersive
          </button>
        )}
        <div className={`hud-element`}>
          <GameOverlayHUD 
            remainingTime={formatTime(remainingTime)}
            rawRemainingTime={remainingTime}
            onHintV2Click={handleHintClick} // Wire up the new button to the same V2 handler
            hintsUsed={purchasedHints.length}
            hintsAllowed={14}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={onNavigateHome}
            onConfirmNavigation={onConfirmNavigation}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            imageUrl={image.firebase_url || image.url}
            onFullscreen={handleImageFullscreen}
            isTimerActive={isTimerActive}
            onTimeout={onTimeout}
            setRemainingTime={setRemainingTime}
            timerEnabled={timerEnabled}
            xpDebt={xpDebt}
            accDebt={accDebt}
          />
        </div>
      </div>
      
      {isImageFullScreen && image && (
        <FullscreenZoomableImage
          image={{ 
            url: image.firebase_url || image.url, 
            title: image.title,
            placeholderUrl: image.firebase_url || image.url
          }}
          onExit={handleExitImageFullscreen}
        />
      )}

      {isImmersiveOpen && image && immersiveEnabled && (
        <ImmersiveCylViewer
          imageUrl={image.firebase_url || image.url}
          lockFov={immersiveLockFov}
          curvatureDeg={immersiveCurvature}
          enableGyro={immersiveEnableGyro}
          caption={image.title}
          onClose={() => setIsImmersiveOpen(false)}
        />
      )}

      {/* Input Sections - Full width on mobile, half on desktop */}
      <div className="flex-grow px-2 py-4 md:px-4 lg:px-6 flex flex-col">
        <div className="max-w-5xl mx-auto w-full space-y-4">
          <Card className="overflow-hidden dark:bg-[#202020]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center font-semibold text-history-primary dark:text-history-light">
                  <Calendar className="w-5 h-5 mr-2" />
                  <label>WHEN</label>
                </div>
                <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">{selectedYear}</div>
              </div>
              <YearSelector 
                selectedYear={selectedYear}
                onChange={onYearChange}
              />
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden dark:bg-[#202020]">
            <CardContent className="p-4 lg:min-h-[520px] flex flex-col justify-between">
     
              <LocationSelector 
                selectedLocation={null} 
                onLocationSelect={() => {}} 
                onCoordinatesSelect={handleCoordinatesSelect}
                onSubmit={handleSubmitGuess}
                hasSelectedLocation={!!currentGuess}
                avatarUrl={avatarUrl}
              />
            </CardContent>
          </Card>

          {/* Desktop-only submit button placed outside and below the card */}
          <div className="hidden lg:block">
            <Button
              onClick={handleSubmitGuess}
              disabled={!currentGuess}
              className={`${currentGuess ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-700'} w-full max-w-md mx-auto flex items-center justify-center text-lg font-semibold px-8 py-6 !text-white shadow-lg rounded-xl`}
            >
              Submit Guess
            </Button>
          </div>
        </div>

        
      </div>

      {/* V2 Hint Modal */}
      <HintModalV2New
        isOpen={isHintModalV2Open}
        onOpenChange={setIsHintModalV2Open}
        availableHints={availableHints}
        purchasedHintIds={purchasedHintIds}
        xpDebt={xpDebt}
        accDebt={accDebt}
        onPurchaseHint={onPurchaseHint}
        isLoading={isHintLoading}
      />

      <GlobalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default GameLayout1;
