
import { useState, useEffect, useCallback } from 'react';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResultsModal from './game/GameResultsModal';
import GameComplete from './game/GameComplete';
import { useGameState } from '@/hooks/useGameState';
import Navbar from './Navbar';
import GameTimer from './game/GameTimer';
import NavigationConfirmation from './NavigationConfirmation';

const MAX_ROUNDS = 5; // Default to 5 rounds for a game

const GameSection = () => {
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
    setGameComplete,
    maxRounds
  } = useGameState(MAX_ROUNDS);

  // Load timer settings from localStorage on mount
  useEffect(() => {
    const gameSettings = localStorage.getItem('gameSettings');
    if (gameSettings) {
      try {
        const settings = JSON.parse(gameSettings);
        if (settings.timerEnabled !== undefined) {
          setTimerEnabled(settings.timerEnabled);
        }
        if (settings.timerDuration !== undefined) {
          setTimerDuration(settings.timerDuration); // This should be in seconds
        } else if (settings.timerMinutes !== undefined) {
          setTimerDuration(settings.timerMinutes * 60); // Convert minutes to seconds
        }
      } catch (error) {
        console.error("Error parsing game settings:", error);
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

  // Fixed: Ensure these functions return a boolean value
  const handleUseLocationHint = () => {
    gameStateUseLocationHint();
    return !locationHintUsed; // Return true if the hint was not previously used
  };

  const handleUseYearHint = () => {
    gameStateUseYearHint();
    return !yearHintUsed; // Return true if the hint was not previously used
  };

  // Handle timer completion - now ends the game instead of just the round
  const handleTimerComplete = () => {
    // End the entire game when timer runs out
    setTimerPaused(true);
    handleSubmit(); // Submit the current round first
    
    // After a short delay, end the game
    setTimeout(() => {
      setGameComplete(true);
    }, 2000);
  };

  useEffect(() => {
    if (showResults) {
      setTimerPaused(true);
    }
  }, [showResults, setTimerPaused]);

  // Fix for timer pausing when hint button is clicked
  useEffect(() => {
    // We don't pause the timer when hints are opened
    // Only pause when results are shown
    setTimerPaused(showResults);
  }, [showResults, hintsOpen, setTimerPaused]);

  // For Daily Challenge, set timer to 5 minutes (300 seconds)
  useEffect(() => {
    if (isDaily) {
      setTimerEnabled(true);
      setTimerDuration(300); // 5 minutes in seconds
    }
  }, [isDaily, setTimerEnabled, setTimerDuration]);

  const renderContent = () => {
    if (gameComplete) {
      return <section id="game" className="h-full flex flex-col">
          <Navbar key={navbarKey} hintCoins={hintCoins} hideTitle={true} />
          <GameComplete 
            totalScore={totalScore} 
            maxRounds={MAX_ROUNDS} 
            roundScores={roundScores} 
            images={sampleImages} 
            onPlayAgain={isDaily ? undefined : handleNewGame} 
            isDaily={isDaily} 
          />
        </section>;
    }

    return <section id="game" className="h-full flex flex-col">
        <Navbar 
          key={navbarKey} 
          roundInfo={{
            currentRound,
            maxRounds,
            totalScore
          }} 
          hintCoins={hintCoins} 
          hintsOpen={hintsOpen} 
          setHintsOpen={setHintsOpen} 
          hideTitle={true}
          onUseLocationHint={handleUseLocationHint}
          onUseYearHint={handleUseYearHint}
          locationHintUsed={locationHintUsed}
          yearHintUsed={yearHintUsed}
          currentImage={currentImage}
        />
        
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {timerEnabled && <div className="w-full bg-gray-100 dark:bg-gray-800 px-4 py-2 z-10 game-timer-container">
              <GameTimer 
                duration={timerDuration} 
                paused={timerPaused} 
                hintsOpen={hintsOpen} 
                onTimeUp={handleTimerComplete} 
              />
            </div>}
          
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
