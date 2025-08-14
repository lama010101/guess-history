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
import { Calendar, MapPin, Home, Send } from 'lucide-react';
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
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);
  const [highlightInputs, setHighlightInputs] = useState(false);
  // Inline editable year input state for header
  const [yearInput, setYearInput] = useState<string>(String(selectedYear));
  // Track if the slider has been interacted with; controls showing the year
  const [yearInteracted, setYearInteracted] = useState(false);
  // Submit guidance message shown only when clicking a disabled Submit button
  const [submitPrompt, setSubmitPrompt] = useState<string | null>(null);
  useEffect(() => {
    // Only sync input from selectedYear after interaction; keep empty initially
    if (yearInteracted) {
      setYearInput(String(selectedYear));
    }
  }, [selectedYear, yearInteracted]);

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
    // Animate When/Where cards for 1 second to draw attention
    setHighlightInputs(true);
    window.setTimeout(() => setHighlightInputs(false), 1000);
  };

  const [isHintModalV2Open, setIsHintModalV2Open] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const game = useGame();
  const { totalGameAccuracy, totalGameXP, roundTimerSec, timerEnabled } = game;
  const parsedYear = parseInt(yearInput, 10);
  const isYearValid = !isNaN(parsedYear) && parsedYear >= 1850 && parsedYear <= 2025;
  const isYearSelected = isYearValid; // only valid numeric year counts as selected
  const isSubmitEnabled = !!currentGuess && isYearSelected;

  // Clear the submit guidance when inputs become valid
  useEffect(() => {
    if (isSubmitEnabled) setSubmitPrompt(null);
  }, [isSubmitEnabled]);

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
    // With disabled overlay, this should only run when enabled
    // Call the parent's onComplete if it exists
    if (onComplete) {
      onComplete();
    }
  };

  // When clicking on disabled Submit area, show a contextual prompt above the button
  const handleDisabledSubmitClick = () => {
    if (isSubmitEnabled) return;
    if (!currentGuess) {
      setSubmitPrompt('Select a location first');
      return;
    }
    if (!isYearSelected) {
      setSubmitPrompt('Select a year first');
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
        {immersiveEnabled && false && (
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
            hintsUsed={purchasedHints.length}
            hintsAllowed={14}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
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
          currentRound={currentRound}
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
        <div className="max-w-5xl mx-auto w-full space-y-4 flex flex-col h-full">
          <Card className={cn("overflow-hidden dark:bg-[#333333]", highlightInputs && "ring-2 ring-orange-500")}> 
            <CardContent className="px-4 pt-3 pb-1 flex flex-col min-h-[7.5rem] md:min-h-[9rem]">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-normal text-base text-gray-900 dark:text-gray-100 flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                  When?
                </h2>
                {/* Inline year input: always visible with underline; empty until selected */}
                <input
                  type="number"
                  value={yearInteracted ? yearInput : ''}
                  onChange={(e) => setYearInput(e.target.value)}
                  onBlur={() => {
                    const parsed = parseInt(yearInput, 10);
                    if (!isNaN(parsed)) {
                      const clamped = Math.max(1850, Math.min(2025, parsed));
                      if (clamped !== selectedYear) onYearChange(clamped);
                      setYearInput(String(clamped));
                    } else {
                      // keep empty, not selected
                      setYearInput('');
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.currentTarget as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                      setYearInput('');
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  placeholder=""
                  className="ml-auto w-[6ch] px-1 bg-transparent border-b border-gray-500 focus:outline-none focus:border-orange-500 text-center text-orange-400 font-semibold"
                  min={1850}
                  max={2025}
                  aria-label="Edit year"
                />
              </div>
              <div className="flex-1 flex items-center justify-center">
                <YearSelector 
                  selectedYear={yearInteracted ? selectedYear : null}
                  onChange={(y) => { onYearChange(y); setYearInteracted(true); setYearInput(String(y)); }}
                  onFirstInteract={() => setYearInteracted(true)}
                />
              </div>
              
            </CardContent>
          </Card>

          <Card className={cn("overflow-hidden dark:bg-[#333333] flex-1", highlightInputs && "ring-2 ring-orange-500")}> 
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-normal text-base text-gray-900 dark:text-gray-100 flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                  Where?
                </h2>
                {selectedLocationName && (
                  <span className="ml-auto text-orange-400 font-semibold truncate max-w-[60%] text-right">
                    {selectedLocationName}
                  </span>
                )}
              </div>
     
              <div className="flex-1 min-h-[300px] flex flex-col">
                <LocationSelector 
                  selectedLocation={selectedLocationName}
                  onLocationSelect={(loc) => setSelectedLocationName(loc)} 
                  onCoordinatesSelect={handleCoordinatesSelect}
                  onSubmit={handleSubmitGuess}
                  hasSelectedLocation={!!currentGuess}
                  avatarUrl={avatarUrl}
                  onHome={() => onConfirmNavigation(() => onNavigateHome())}
                />
              </div>
            </CardContent>
          </Card>

          {/* Desktop-only bottom actions: Home, Hints, Submit */}
          <div className="hidden lg:flex items-center justify-center gap-3 mt-auto">
            <Button
              onClick={() => onConfirmNavigation(() => onNavigateHome())}
              variant="outline"
              className="bg-[#999999] text-black hover:bg-[#8a8a8a] dark:bg-[#999999] dark:text-black dark:hover:bg-[#8a8a8a] rounded-xl px-6 py-6 text-lg font-semibold"
            >
              <Home className="h-5 w-5 mr-2" /> Home
            </Button>
            <Button
              onClick={handleHintClick}
              className="bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 rounded-xl px-6 py-6 text-lg font-semibold"
              variant="outline"
            >
              <span>Hints</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-black text-white text-xs px-2 py-0.5">{purchasedHintIds.length}/14</span>
            </Button>
            <div className="relative">
              {submitPrompt && !isSubmitEnabled && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm text-gray-600 dark:text-gray-300">
                  {submitPrompt}
                </div>
              )}
              <Button
                onClick={handleSubmitGuess}
                disabled={!isSubmitEnabled}
                className={`${isSubmitEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed opacity-70'} w-full max-w-md flex items-center justify-center text-lg font-semibold px-8 py-6 !text-white shadow-lg rounded-xl`}
              >
                <Send className="h-5 w-5 mr-2" /> Submit Guess
              </Button>
              {!isSubmitEnabled && (
                <div className="absolute inset-0" onClick={handleDisabledSubmitClick} aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        
      </div>

      {/* Mobile bottom navbar: Home + Hints + Submit */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
        <Button
          onClick={() => onConfirmNavigation(() => onNavigateHome())}
          variant="outline"
          className="h-12 w-12 rounded-full bg-[#999999] text-black hover:bg-[#8a8a8a] dark:bg-[#999999] dark:text-black dark:hover:bg-[#8a8a8a]"
          aria-label="Go Home"
          title="Return to Home"
        >
          <Home className="h-5 w-5" />
        </Button>
        <Button
          onClick={handleHintClick}
          className="flex-1 h-12 rounded-xl bg-white text-black hover:bg-gray-100 dark:bg-white dark:text-black dark:hover:bg-gray-100 text-lg font-semibold"
        >
          <span>Hints</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-black text-white text-xs px-2 py-0.5">{purchasedHintIds.length}/14</span>
        </Button>
        <div className="relative flex-[2]">
          {submitPrompt && !isSubmitEnabled && (
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-sm text-gray-600 dark:text-gray-300">
              {submitPrompt}
            </div>
          )}
          <Button
            onClick={handleSubmitGuess}
            disabled={!isSubmitEnabled}
            className={`${isSubmitEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-400 cursor-not-allowed opacity-70'} h-12 w-full rounded-xl text-white text-lg font-semibold flex items-center justify-center`}
          >
            <Send className="h-5 w-5 mr-2" /> Submit Guess
          </Button>
          {!isSubmitEnabled && (
            <div className="absolute inset-0" onClick={handleDisabledSubmitClick} aria-hidden="true" />
          )}
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
