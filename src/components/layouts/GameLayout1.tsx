import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import FullscreenZoomableImage from './FullscreenZoomableImage';
import HomeMap from '../HomeMap';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import { useHint, type HintType } from '@/hooks/useHint';
import HintModal from '@/components/HintModal';
import HintModalV2 from '@/components/HintModalV2';
import { useHintV2 } from '@/hooks/useHintV2';
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay from '@/components/game/TimerDisplay';
import LazyImage from '@/components/ui/LazyImage';

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
import { GameImage, GuessCoordinates, useGame } from '@/contexts/GameContext';

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
}) => {
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);

  const handleImageFullscreen = () => {
    setIsImageFullScreen(true);
  };

  const handleExitImageFullscreen = () => {
    setIsImageFullScreen(false);
  };
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isHintModalV2Open, setIsHintModalV2Open] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const game = useGame();
  const { totalGameAccuracy, totalGameXP, roundTimerSec, timerEnabled } = game;
  
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
  
  // Memoize the imageData object passed to useHint
  const memoizedImageData = useMemo(() => {
    if (!image) {
      console.warn('No image data available for hints');
      return undefined;
    }
    
    try {
      return {
        ...image,
        // Ensure all required GameImage properties are included
        gps: { 
          lat: image.latitude || 0, 
          lng: image.longitude || 0 
        },
        // These properties are already in the GameImage type
        latitude: image.latitude || 0,
        longitude: image.longitude || 0,
        image_url: image.image_url || image.url || '', // Fallback to url if image_url is not available
        url: image.url || image.image_url || '', // Ensure url is always set
        description: image.description || '',
        title: image.title || 'Untitled',
        location_name: image.location_name || 'Unknown location',
        year: image.year || new Date().getFullYear()
      };
    } catch (error) {
      console.error('Error preparing image data for hints:', error);
      return undefined;
    }
  }, [image]);

  // Use the legacy hint system for backward compatibility
  const {
    selectedHintType,
    hintContent,
    hintsUsedThisRound,
    hintsUsedTotal,
    canSelectHint,
    selectHint,
    resetHint,
    HINTS_PER_ROUND,
    HINTS_PER_GAME
  } = useHint(memoizedImageData);
  
  // Use the new V2 hint system
  const {
    availableHints,
    purchasedHintIds,
    purchasedHints,
    xpDebt,
    accDebt,
    isLoading: isHintLoading, // for initial hint fetch
    isHintLoading: isPurchasing, // for when a hint is being purchased
    purchaseHint,
    hintsByLevel
  } = useHintV2(memoizedImageData);

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
    <div className="min-h-screen flex flex-col lg:flex-row bg-history-light dark:bg-history-dark">
      {/* Image Section - Full width on mobile, half on desktop */}
      <div className="w-full h-[60vh] lg:w-1/2 lg:h-screen relative">
        <LazyImage
          src={image.url}
          alt={image.title}
          className="w-full h-full object-cover"
          skeletonClassName="w-full h-full"
        />
        <div className={`hud-element`}>
          <GameOverlayHUD 
            remainingTime={formatTime(remainingTime)}
            rawRemainingTime={remainingTime}
            onHintClick={handleHintClick}
            hintsUsed={purchasedHints.length}
            hintsAllowed={availableHints.length}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={onNavigateHome}
            onConfirmNavigation={onConfirmNavigation}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            imageUrl={image.url}
            onFullscreen={handleImageFullscreen}
            isTimerActive={isTimerActive}
            onTimeout={onTimeout}
            setRemainingTime={setRemainingTime}
            timerEnabled={timerEnabled}
          />
        </div>
      </div>
      
      {isImageFullScreen && image && (
        <FullscreenZoomableImage
          image={{ 
            url: image.url, 
            title: image.title,
            placeholderUrl: image.url
          }}
          onExit={handleExitImageFullscreen}
        />
      )}

      {/* Input Sections - Full width on mobile, half on desktop */}
      <div className="flex-grow p-4 lg:p-8 lg:overflow-y-auto lg:h-screen">
        <div className="max-w-5xl mx-auto">
          <div className="space-y-6">
            <div className="pb-0.5 sm:pb-4">
              <YearSelector 
                selectedYear={selectedYear}
                onChange={onYearChange}
              />
            </div>
            
            <div className="pt-0.5 sm:pt-4">
              <LocationSelector 
                selectedLocation={null} 
                onLocationSelect={() => {}} 
                onCoordinatesSelect={handleCoordinatesSelect}
                onSubmit={handleSubmitGuess}
                hasSelectedLocation={!!currentGuess}
                avatarUrl={avatarUrl}
              />
            </div>
          </div>
        </div>
      </div>

      {/* V2 Hint Modal */}
      <HintModalV2
        isOpen={isHintModalV2Open}
        onOpenChange={setIsHintModalV2Open}
        availableHints={availableHints}
        purchasedHintIds={purchasedHintIds}
        xpDebt={0} // TODO: Get actual xpDebt from useHintV2 hook
        accDebt={0} // TODO: Get actual accDebt from useHintV2 hook
        onPurchaseHint={purchaseHint}
        isLoading={isHintLoading || isPurchasing}
        hintsByLevel={hintsByLevel}
      />

      <GlobalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default GameLayout1;
