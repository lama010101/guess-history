import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import FullscreenZoomableImage from './FullscreenZoomableImage';
import ImmersiveCylViewer from '@/components/ImmersiveCylViewer';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import HintModalV2New from '@/components/HintModalV2New';

import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import LazyImage from '@/components/ui/LazyImage';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Settings as SettingsIcon, Send, HelpCircle } from 'lucide-react';
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
  selectedYear: number | null;
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
  // Optional overrides for Level Up mode only
  minYear?: number;
  maxYear?: number;
  // Level Up HUD button
  levelLabel?: string;
  onOpenLevelIntro?: () => void;
  peerMarkers?: Array<{
    id: string;
    lat: number;
    lng: number;
    avatarUrl?: string | null;
    displayName?: string | null;
  }>;
  peerRoster?: Array<{
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isSelf?: boolean;
    submitted?: boolean;
    recentlySubmitted?: boolean;
  }>;
  onOpenChat?: () => void;
  isChatOpen?: boolean;
  chatMessageCount?: number;
  avatarClusterRef?: React.RefObject<HTMLDivElement>;
  waitingForPeers?: boolean;
  submittedCount?: number;
  totalParticipants?: number;
  submissionNotice?: string | null;
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
  minYear,
  maxYear,
  levelLabel,
  onOpenLevelIntro,
  peerMarkers = [],
  peerRoster = [],
  onOpenChat,
  isChatOpen = false,
  chatMessageCount = 0,
  avatarClusterRef,
  waitingForPeers = false,
  submittedCount,
  totalParticipants,
  submissionNotice = null,
}) => {
  const [isImageFullScreen, setIsImageFullScreen] = useState(true);
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string | null>(null);
  const [isImmersiveOpen, setIsImmersiveOpen] = useState(false);
  const [highlightInputs, setHighlightInputs] = useState(false);
  // Targeted highlight states for When/Where
  const [highlightWhen, setHighlightWhen] = useState(false);
  const [highlightWhere, setHighlightWhere] = useState(false);
  // Loading state after submitting guess
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Inline editable year input state for header
  const [yearInput, setYearInput] = useState<string>('');
  // Track if the slider has been interacted with; controls showing the year
  const [yearInteracted, setYearInteracted] = useState(false);
  // Submit guidance message shown only when clicking a disabled Submit button
  const [submitPrompt, setSubmitPrompt] = useState<string | null>(null);
  // Show red alert messages inline on the relevant cards
  const [showYearAlert, setShowYearAlert] = useState(false);
  const [showLocationAlert, setShowLocationAlert] = useState(false);
  // One-time typewriter animation for When?/Where? labels
  const whenFull = 'When?';
  const whereFull = 'Where?';
  const [whenAnimIndex, setWhenAnimIndex] = useState(0);
  const [whereAnimIndex, setWhereAnimIndex] = useState(0);
  const [titlesAnimating, setTitlesAnimating] = useState(false);
  const [hasAnimatedTitles, setHasAnimatedTitles] = useState(false);
  // Ref to focus the year input programmatically
  const yearInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // Only sync input from selectedYear after interaction; keep empty initially
    if (yearInteracted) {
      if (typeof selectedYear === 'number') {
        setYearInput(String(selectedYear));
      } else {
        setYearInput('');
      }
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
    // No card ring/pulse on initial reveal. Title typewriter animation handles attention.
  };

  // Trigger the one-time title typewriter animation when inputs first become visible
  useEffect(() => {
    if (!isImageFullScreen && !hasAnimatedTitles) {
      setTitlesAnimating(true);
      setWhenAnimIndex(0);
      setWhereAnimIndex(0);
      const whenLen = whenFull.length;
      const whereLen = whereFull.length;
      const whenStep = Math.max(1, Math.floor(1000 / whenLen));
      const whereStep = Math.max(1, Math.floor(1000 / whereLen));
      let wi = 0;
      let wri = 0;
      const whenTimer = window.setInterval(() => {
        wi += 1;
        setWhenAnimIndex(wi);
        if (wi >= whenLen) window.clearInterval(whenTimer);
      }, whenStep);
      const whereTimer = window.setInterval(() => {
        wri += 1;
        setWhereAnimIndex(wri);
        if (wri >= whereLen) window.clearInterval(whereTimer);
      }, whereStep);
      const totalTimer = window.setTimeout(() => {
        setTitlesAnimating(false);
        setHasAnimatedTitles(true);
      }, 1000);
      return () => {
        window.clearInterval(whenTimer);
        window.clearInterval(whereTimer);
      };
    }
    return;
  }, [isImageFullScreen, hasAnimatedTitles]);

  const [isHintModalV2Open, setIsHintModalV2Open] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const game = useGame();

  const { totalGameAccuracy, totalGameXP, roundTimerSec, timerEnabled } = game;
  const parsedYear = parseInt(yearInput, 10);
  // Dynamic year bounds based on prepared images for this game session
  const dynamicMinYear = useMemo(() => {
    const ys = (game?.images || []).map((img) => img.year).filter((y) => typeof y === 'number' && !isNaN(y));
    if (ys.length === 0) return 1850;
    return Math.min(...ys);
  }, [game?.images]);
  const dynamicMaxYear = useMemo(() => {
    const ys = (game?.images || []).map(img => img.year).filter(y => typeof y === 'number' && !isNaN(y));
    if (ys.length === 0) return 2026;
    return Math.max(...ys);
  }, [game?.images]);
  // Effective bounds: use Level Up overrides when provided, otherwise fall back to dynamic dataset bounds
  const effectiveMinYear = typeof minYear === 'number' ? minYear : dynamicMinYear;
  const effectiveMaxYear = typeof maxYear === 'number' ? maxYear : dynamicMaxYear;

  // Log the year range constraints for debugging
  
  // Log when Level Up overrides affect the bounds
  const prevBoundsRef = useRef<{ min: number; max: number } | null>(null);
  useEffect(() => {
    const prev = prevBoundsRef.current;
    const curr = { min: effectiveMinYear, max: effectiveMaxYear };
    const isOverrideActive = gameMode === 'levelup' && typeof minYear === 'number' && typeof maxYear === 'number';
    if (isOverrideActive) {
      if (!prev || prev.min !== curr.min || prev.max !== curr.max) {
        if (import.meta.env.DEV) {
          try {
            console.log('[LevelUp][Slider] Applying Level Up bounds override', {
              from: { min: dynamicMinYear, max: dynamicMaxYear },
              to: curr,
            });
          } catch {}
        }
      }
    }
    prevBoundsRef.current = curr;
  }, [effectiveMinYear, effectiveMaxYear, gameMode, minYear, maxYear, dynamicMinYear, dynamicMaxYear]);
  const isYearValid = !isNaN(parsedYear) && parsedYear >= effectiveMinYear && parsedYear <= effectiveMaxYear;
  const isYearSelected = isYearValid; // only valid numeric year counts as selected
  const isSubmitEnabled = !!currentGuess && isYearSelected;

  // Clear the submit guidance when inputs become valid
  useEffect(() => {
    if (isSubmitEnabled) setSubmitPrompt(null);
  }, [isSubmitEnabled]);

  // Clear specific alerts when corresponding inputs become valid
  useEffect(() => {
    if (isYearSelected) setShowYearAlert(false);
  }, [isYearSelected]);
  useEffect(() => {
    if (currentGuess) setShowLocationAlert(false);
  }, [currentGuess]);

  // V2 hint system
  
  
  // Timer timeout is handled upstream (server-authoritative) via props.onTimeout
  


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
      setIsSubmitting(true);
      onComplete();
    }
  };

  // When clicking on disabled Submit area, show a toast with guidance
  const handleDisabledSubmitClick = () => {
    if (isSubmitEnabled) return;
    const missingLocation = !currentGuess;
    const missingYear = !isYearSelected;

    // Trigger targeted highlights and inline red alerts
    if (missingYear) {
      setShowYearAlert(true);
      setHighlightWhen(true);
      window.setTimeout(() => setHighlightWhen(false), 1000);
    }
    if (missingLocation) {
      setShowLocationAlert(true);
      setHighlightWhere(true);
      window.setTimeout(() => setHighlightWhere(false), 1000);
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
            className="absolute top-3 right-16 z-20 rounded-md bg-white/90 text-black text-sm px-3 py-1 shadow hover:bg-white"
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
            imageUrl={image.firebase_url || image.url}
            onFullscreen={handleImageFullscreen}
            isTimerActive={isTimerActive}
            onTimeout={onTimeout}
            setRemainingTime={setRemainingTime}
            timerEnabled={timerEnabled}
            roundTimerSec={roundTimerSec}
            xpDebt={xpDebt}
            accDebt={accDebt}
            levelLabel={levelLabel}
            onOpenLevelIntro={onOpenLevelIntro}
            peerRoster={peerRoster}
            onOpenChat={onOpenChat}
            isChatOpen={isChatOpen}
            chatMessageCount={chatMessageCount}
            avatarClusterRef={avatarClusterRef}
            waitingForPeers={waitingForPeers}
            submittedCount={submittedCount}
            totalParticipants={totalParticipants}
            submissionNotice={submissionNotice}
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
      <div className="flex-grow px-2 py-2 md:px-4 lg:px-6 flex flex-col">
        <div className="max-w-5xl mx-auto w-full space-y-2 flex flex-col h-full">
          <Card className={cn("overflow-hidden dark:bg-[#333333] transition-all", (highlightInputs || highlightWhen) && "ring-2 ring-orange-500 animate-pulse")}> 
            <CardContent className="px-4 pt-3 pb-1 flex flex-col min-h-[7.5rem] md:min-h-[9rem]">
              <div className="flex flex-wrap items-center justify-between mb-1 gap-x-2 gap-y-1">
                <h2 className={cn("font-normal text-base flex items-center min-w-0 h-6 leading-6 md:h-auto md:leading-normal", titlesAnimating ? "text-orange-400" : "text-gray-900 dark:text-white") }>
                  <Calendar className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{titlesAnimating ? whenFull.slice(0, whenAnimIndex) : whenFull}</span>
                </h2>
                {/* Inline year input wrapper ensures right-edge alignment across breakpoints */}
                <div
                  className={cn(
                    "flex items-center justify-end ml-auto w-auto pr-1 basis-auto"
                  )}
                >
                  <input
                    type="text"
                    value={yearInteracted ? yearInput : ''}
                    onChange={(e) => setYearInput(e.target.value)}
                    ref={yearInputRef}
                    onFocus={() => {
                      // Ensure yearInteracted is set when input is focused
                      setYearInteracted(true);
                    }}
                    onBlur={() => {
                      const parsed = parseInt(yearInput, 10);
                      if (!isNaN(parsed)) {
                        const clamped = Math.max(effectiveMinYear, Math.min(effectiveMaxYear, parsed));
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
                    placeholder={showYearAlert ? 'You must guess the year' : 'Choose a year (click here to type)'}
                    className={
                      cn(
                        "appearance-none pl-2 pr-1 py-0 h-6 leading-6 md:h-auto md:leading-normal bg-transparent focus:outline-none focus:ring-1 focus:ring-orange-400 rounded text-right md:shrink-0 text-base relative top-[2px] md:top-0",
                        showYearAlert
                          ? "w-full md:w-[26ch]"
                          : (yearInteracted ? "w-[10ch] sm:w-[12ch] md:w-[14ch]" : "w-full md:w-[14ch]"),
                        yearInteracted && yearInput !== ''
                          ? "text-orange-400 font-semibold"
                          : "text-gray-400 italic font-normal",
                        showYearAlert && "placeholder-red-500 placeholder:italic"
                      )
                    }
                    inputMode="numeric"
                    pattern="[0-9]*"
                    aria-label="Edit year"
                  />
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full">
                  <YearSelector 
                    selectedYear={yearInteracted ? selectedYear : null}
                    onChange={(y) => { 
                      // Clamp the year within the allowed range
                      const clampedYear = Math.min(Math.max(y, effectiveMinYear), effectiveMaxYear);
                      onYearChange(clampedYear); 
                      setYearInteracted(true); 
                      setYearInput(String(clampedYear));
                    }}
                    onFirstInteract={() => setYearInteracted(true)}
                    minYear={effectiveMinYear}
                    maxYear={effectiveMaxYear}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn("overflow-hidden dark:bg-[#333333] flex-1 transition-all", (highlightInputs || highlightWhere) && "ring-2 ring-orange-500 animate-pulse")}> 
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <h2 className={cn("font-normal text-base flex items-center", titlesAnimating ? "text-orange-400" : "text-gray-900 dark:text-white") }>
                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                  <span>{titlesAnimating ? whereFull.slice(0, whereAnimIndex) : whereFull}</span>
                </h2>
                {selectedLocationName ? (
                  <span className="ml-auto text-orange-400 font-semibold truncate max-w-[60%] text-right pr-1">
                    {selectedLocationName}
                  </span>
                ) : (
                  showLocationAlert ? (
                    <span className="ml-auto text-red-500 truncate max-w-[60%] text-right pr-1">
                      You must guess the location
                    </span>
                  ) : (
                    <span
                      className="ml-auto text-gray-400 italic text-right pr-1 max-w-[60%] break-normal cursor-pointer"
                      role="button"
                      tabIndex={0}
                      title="Click to type a year"
                      onClick={() => {
                        setYearInteracted(true);
                        // Force focus with multiple attempts to ensure it works
                        const focusYear = () => {
                          if (yearInputRef.current) {
                            yearInputRef.current.focus();
                            // Double-check focus after a short delay
                            setTimeout(() => {
                              if (document.activeElement !== yearInputRef.current) {
                                yearInputRef.current?.focus();
                              }
                            }, 50);
                          }
                        };
                        focusYear();
                        // Backup attempt after a delay
                        setTimeout(focusYear, 100);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setYearInteracted(true);
                          // Use the same robust focus method
                          const focusYear = () => {
                            if (yearInputRef.current) {
                              yearInputRef.current.focus();
                              setTimeout(() => {
                                if (document.activeElement !== yearInputRef.current) {
                                  yearInputRef.current?.focus();
                                }
                              }, 50);
                            }
                          };
                          focusYear();
                          setTimeout(focusYear, 100);
                        }
                      }}
                    >
                      Choose a location
                    </span>
                  )
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
                  peerMarkers={peerMarkers}
                />
              </div>
            </CardContent>
          </Card>

          {/* Spacer below Where card to add empty space */}
          <div className="h-6" aria-hidden="true" />

          {/* Desktop-only bottom actions: Settings, Hints, Submit (unified styles) */}
          <div className="hidden lg:flex items-center justify-center gap-3 mt-auto">
            <Button
              onClick={() => setIsSettingsModalOpen(true)}
              className="rounded-md h-12 px-6 text-base font-semibold bg-white text-black hover:bg-gray-100 border-none"
              variant="outline"
              aria-label="Open Settings"
              title="Open Settings"
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleHintClick}
              className="rounded-md h-12 px-6 text-base font-semibold bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] text-black hover:opacity-90"
              variant="outline"
            >
              <HelpCircle className="h-5 w-5 mr-2" />
              <span>Hints</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-black text-white text-[11px] px-2 py-0.5">{purchasedHintIds.length}/14</span>
            </Button>
            <div className="relative">
              <Button
                onClick={handleSubmitGuess}
                disabled={!isSubmitEnabled}
                className={`${isSubmitEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#444444] cursor-not-allowed'} w-full max-w-md flex items-center justify-center text-base font-semibold h-12 px-6 !text-white shadow-lg rounded-md disabled:opacity-100 disabled:!text-white`}
              >
                <Send className="h-5 w-5 mr-2" /> Make Guess
              </Button>
              {!isSubmitEnabled && (
                <div className="absolute inset-0" onClick={handleDisabledSubmitClick} aria-hidden="true" />
              )}
            </div>
          </div>
          {/* Mobile bottom navbar: Settings + Hints + Submit (unified styles) */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
            <Button
              onClick={() => setIsSettingsModalOpen(true)}
              className="h-12 rounded-md px-4 bg-white text-black hover:bg-gray-100 border-none text-base font-semibold"
              aria-label="Open Settings"
              title="Open Settings"
              variant="outline"
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
            <Button
              onClick={handleHintClick}
              className="flex-1 h-12 rounded-md bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] text-black hover:opacity-90 text-base font-semibold"
            >
              <span>Hints</span>
              <span className="ml-2 inline-flex items-center rounded-full bg-black text-white text-xs px-2 py-0.5">{purchasedHintIds.length}/14</span>
            </Button>
            <div className="relative flex-[2]">
              <Button
                onClick={handleSubmitGuess}
                disabled={!isSubmitEnabled}
                className={`${isSubmitEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#444444] cursor-not-allowed'} h-12 w-full rounded-md !text-white text-base font-semibold flex items-center justify-center disabled:opacity-100 disabled:!text-white`}
              >
                <Send className="h-5 w-5 mr-2" /> Make Guess
              </Button>
              {!isSubmitEnabled && (
                <div className="absolute inset-0" onClick={handleDisabledSubmitClick} aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        
      </div>

      {/* Mobile bottom navbar (duplicate section): Settings + Hints + Submit (unified styles) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#1f1f1f]/95 backdrop-blur border-t border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2">
        <Button
          onClick={() => setIsSettingsModalOpen(true)}
          variant="outline"
          className="h-12 rounded-md px-4 bg-white text-black hover:bg-gray-100 border-none text-base font-semibold"
          aria-label="Open Settings"
          title="Open Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
        <Button
          onClick={handleHintClick}
          className="flex-1 h-12 rounded-md bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] text-black hover:opacity-90 text-base font-semibold"
        >
          <span>Hints</span>
          <span className="ml-2 inline-flex items-center rounded-full bg-black text-white text-xs px-2 py-0.5">{purchasedHintIds.length}/14</span>
        </Button>
        <div className="relative flex-[2]">
          <Button
            onClick={handleSubmitGuess}
            disabled={!isSubmitEnabled}
            className={`${isSubmitEnabled ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#444444] cursor-not-allowed'} h-12 w-full rounded-md !text-white text-base font-semibold flex items-center justify-center disabled:opacity-100 disabled:!text-white`}
          >
            <Send className="h-5 w-5 mr-2" /> Make Guess
          </Button>
          {!isSubmitEnabled && (
            <div className="absolute inset-0" onClick={handleDisabledSubmitClick} aria-hidden="true" />
          )}
        </div>
      </div>
      {/* Submitting overlay */}
      {(isSubmitting || waitingForPeers) && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center">
          <div className="flex flex-col items-center">
            <div className="h-10 w-10 rounded-full border-4 border-white/30 border-t-white animate-spin mb-3" />
            <div className="text-white text-sm">
              {waitingForPeers ? 'Waiting for other players…' : 'Preparing results...'}
            </div>
          </div>
        </div>
      )}
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
        onNavigateHome={() => onConfirmNavigation(() => onNavigateHome())}
      />

    </div>
  );
};

export default GameLayout1;
