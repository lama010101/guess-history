
import { useState, useEffect, useCallback } from 'react';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResultsModal from './game/GameResultsModal';
import GameComplete from './game/GameComplete';
import { useGameState } from '@/hooks/useGameState';
import Navbar from './Navbar';
import GameTimer from './game/GameTimer';
import NavigationConfirmation from './NavigationConfirmation';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/services/auth';

const MAX_ROUNDS = 5; // Default to 5 rounds for a game

const GameSection = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [hintsOpen, setHintsOpen] = useState(false);
  const {
    selectedLocation,
    selectedYear,
    showResults,
    currentRound,
    totalScore,
    roundScores,
    gameComplete,
    hintCoins,
    locationHintUsed,
    yearHintUsed,
    timerEnabled,
    timerDuration,
    timerPaused,
    isDaily,
    dailyCompleted,
    dailyDate,
    currentImage,
    currentScores,
    sampleImages,
    setSelectedLocation: updateSelectedLocation,
    setSelectedYear,
    handleSubmit,
    handleNextRound,
    handleNewGame,
    handleUseLocationHint: gameStateUseLocationHint,
    handleUseYearHint: gameStateUseYearHint,
    setTimerEnabled,
    setTimerDuration,
    setTimerPaused,
    maxRounds
  } = useGameState(MAX_ROUNDS);

  useEffect(() => {
    // Load game settings from localStorage
    const savedSettings = localStorage.getItem('gameSettings');
    
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        // Only enable timer if it was specified in settings
        if (settings.timerEnabled !== undefined) {
          setTimerEnabled(settings.timerEnabled);
        }
        
        // Set timer duration from minutes to seconds if available
        if (settings.timerMinutes) {
          setTimerDuration(settings.timerMinutes * 60);
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, [setTimerEnabled, setTimerDuration]);

  const [navbarKey, setNavbarKey] = useState(0);

  const forceNavbarUpdate = useCallback(() => {
    setNavbarKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    forceNavbarUpdate();
  }, [currentRound, totalScore, showResults, forceNavbarUpdate]);

  const handleLocationSelect = (lat: number, lng: number) => {
    updateSelectedLocation({
      lat,
      lng
    });
  };

  const handleNextRoundWithUpdate = () => {
    handleNextRound();
    forceNavbarUpdate();
  };

  const handleUseLocationHint = (): boolean => {
    const result = gameStateUseLocationHint();
    return Boolean(result);
  };

  const handleUseYearHint = (): boolean => {
    const result = gameStateUseYearHint();
    return Boolean(result);
  };

  useEffect(() => {
    if (showResults) {
      setTimerPaused(true);
    }
  }, [showResults, setTimerPaused]);

  const handleNavigateHome = () => {
    navigate('/');
  };

  const renderContent = () => {
    if (gameComplete) {
      return <section id="game" className="h-full flex flex-col">
          <Navbar key={navbarKey} hintCoins={hintCoins} hideTitle={true} />
          <GameComplete totalScore={totalScore} maxRounds={MAX_ROUNDS} roundScores={roundScores} images={sampleImages} onPlayAgain={isDaily ? undefined : handleNewGame} isDaily={isDaily} />
        </section>;
    }

    return <section id="game" className="h-full flex flex-col">
        <Navbar key={navbarKey} roundInfo={{
        currentRound,
        maxRounds,
        totalScore
      }} hintCoins={hintCoins} hintsOpen={hintsOpen} setHintsOpen={setHintsOpen} hideTitle={true} />
        
        {!isAuthenticated && (
          <div className="absolute top-16 right-4 z-10">
            <Button variant="outline" size="sm" onClick={handleNavigateHome} className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Button>
          </div>
        )}
        
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {timerEnabled && (
            <div className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2">
              <GameTimer 
                duration={timerDuration} 
                paused={timerPaused || showResults || hintsOpen} 
                hintsOpen={hintsOpen} 
                onTimeUp={handleSubmit} 
              />
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            <GamePanel 
              currentImage={currentImage} 
              onLocationSelect={handleLocationSelect} 
              selectedLocation={selectedLocation} 
              gameRound={currentRound} 
              maxRounds={MAX_ROUNDS} 
              totalScore={totalScore} 
              hintCoins={hintCoins} 
              onUseLocationHint={handleUseLocationHint} 
              onUseYearHint={handleUseYearHint} 
              locationHintUsed={locationHintUsed} 
              yearHintUsed={yearHintUsed} 
              setHintsOpen={setHintsOpen} 
            />
          </div>
          
          <GameControls 
            selectedLocation={selectedLocation} 
            selectedYear={selectedYear} 
            onYearChange={setSelectedYear} 
            onSubmit={handleSubmit} 
          />
          
          <GameResultsModal 
            showResults={showResults} 
            locationScore={currentScores.locationScore} 
            yearScore={currentScores.yearScore} 
            currentImage={currentImage} 
            selectedLocation={selectedLocation} 
            selectedYear={selectedYear} 
            distanceKm={currentScores.distanceKm} 
            yearDifference={currentScores.yearDifference} 
            onNextRound={handleNextRoundWithUpdate} 
            currentRound={currentRound} 
            maxRounds={MAX_ROUNDS} 
            locationHintUsed={locationHintUsed} 
            yearHintUsed={yearHintUsed} 
            hintPenalty={currentScores.hintPenalty} 
          />
        </div>
        
        <NavigationConfirmation isInGame={true} />
      </section>;
  };
  return renderContent();
};
export default GameSection;
