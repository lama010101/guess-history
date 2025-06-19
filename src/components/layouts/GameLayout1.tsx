import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FullscreenZoomableImage from './FullscreenZoomableImage';
import HomeMap from '../HomeMap';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import { useHint, type HintType } from '@/hooks/useHint';
import HintModal from '@/components/HintModal';
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay from '@/components/game/TimerDisplay';

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
  onNavigateHome,
  onConfirmNavigation,
}) => {
  // Get current authenticated or guest user to show avatar on map
  const { user } = useAuth();
  const avatarUrl = user?.avatar_url && user.avatar_url.trim() !== ''
    ? user.avatar_url
    : `https://api.dicebear.com/6.x/adventurer/svg?seed=${user?.id || 'guest'}`;
  const [isImageFullScreen, setIsImageFullScreen] = useState(false);
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);

  const handleImageFullscreen = () => {
    setIsImageFullScreen(true);
  };

  const handleExitImageFullscreen = () => {
    setIsImageFullScreen(false);
  };
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const game = useGame();
  const { totalGameAccuracy, totalGameXP, roundTimerSec } = game;
  
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

  // Use the new hint system
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

  const handleHintClick = () => {
    if (!canSelectHint) {
      console.warn('Cannot select hint: no hints available or already selected');
      return;
    }
    
    if (!image) {
      console.error('Cannot show hint modal: no image data available');
      return;
    }
    
    setIsHintModalOpen(true);
  };

  const handleCoordinatesSelect = (lat: number, lng: number) => {
    setCurrentGuess({ lat, lng });
    onMapGuess(lat, lng);
    console.log("Map coordinates selected:", lat, lng);
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
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-history-dark">
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img
          src={image.url}
          alt={image.title}
          className="w-full h-full object-cover"
        />
        <div className={`hud-element`}>
          <GameOverlayHUD 
            selectedHintType={selectedHintType}
            remainingTime={formatTime(remainingTime)}
            rawRemainingTime={remainingTime}
            onHintClick={handleHintClick}
            hintsUsed={hintsUsedThisRound || 0}
            hintsAllowed={HINTS_PER_ROUND}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={onNavigateHome}
            onConfirmNavigation={onConfirmNavigation}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            imageUrl={image.url}
            onFullscreen={handleImageFullscreen}
            isTimerActive={isTimerActive}
            onTimeout={handleTimeout}
            setRemainingTime={setRemainingTime}
          />
        </div>
      </div>
      
      {isImageFullScreen && image && (
        <FullscreenZoomableImage
          image={{ url: image.url, placeholderUrl: image.url, title: image.title }}
          onExit={handleExitImageFullscreen}
        />
      )}

      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <YearSelector 
            selectedYear={selectedYear}
            onChange={onYearChange}
          />
          
          <LocationSelector 
            selectedLocation={null}
            onLocationSelect={() => {}}
            onCoordinatesSelect={handleCoordinatesSelect}
            avatarUrl={avatarUrl}
          />
        </div>
      </div>

      <HintModal
        isOpen={isHintModalOpen}
        onOpenChange={setIsHintModalOpen}
        onSelectHint={selectHint}
        selectedHintType={selectedHintType}
        hintContent={hintContent || ''}
        hintsUsedThisRound={hintsUsedThisRound}
        hintsUsedTotal={hintsUsedTotal}
        HINTS_PER_ROUND={HINTS_PER_ROUND}
        HINTS_PER_GAME={HINTS_PER_GAME}
      />

      <GlobalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default GameLayout1;
