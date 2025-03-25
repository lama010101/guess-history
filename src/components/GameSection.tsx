import { useState, useEffect, useCallback } from 'react';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResultsModal from './game/GameResultsModal';
import GameComplete from './game/GameComplete';
import { useGameState } from '@/hooks/useGameState';
import Navbar from './Navbar';
import GameTimer from './game/GameTimer';

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
    dailyScore,
    dailyDate,
    currentImage,
    currentScores,
    sampleImages,
    setSelectedLocation: updateSelectedLocation,
    setSelectedYear,
    handleSubmit,
    handleNextRound,
    handleNewGame,
    handleUseLocationHint,
    handleUseYearHint,
    setTimerEnabled,
    setTimerDuration,
    setTimerPaused,
    maxRounds
  } = useGameState(MAX_ROUNDS);

  // Create a unique key for forcing Navbar to re-render when state changes
  const [navbarKey, setNavbarKey] = useState(0);
  
  // Force update the navbar when relevant game state changes
  const forceNavbarUpdate = useCallback(() => {
    setNavbarKey(prev => prev + 1);
  }, []);
  
  // Save daily score to localStorage when playing in daily mode
  useEffect(() => {
    if (isDaily && gameComplete) {
      localStorage.setItem('lastDailyScore', totalScore.toString());
    }
  }, [isDaily, totalScore, gameComplete]);
  
  useEffect(() => {
    forceNavbarUpdate();
  }, [currentRound, totalScore, showResults, forceNavbarUpdate]);
  
  // Create an adapter function to handle the different parameter types
  const handleLocationSelect = (lat: number, lng: number) => {
    updateSelectedLocation({ lat, lng });
  };

  // Handler for next round that also forces a navbar update
  const handleNextRoundWithUpdate = () => {
    handleNextRound();
    forceNavbarUpdate();
  };

  // Prepare content based on game state
  const renderContent = () => {
    // Show game over screen if all rounds are completed
    if (gameComplete) {
      return (
        <section id="game" className="h-full flex flex-col">
          <Navbar key={navbarKey} hintCoins={hintCoins} />
          <GameComplete 
            totalScore={totalScore}
            maxRounds={MAX_ROUNDS}
            roundScores={roundScores}
            images={sampleImages}
            onPlayAgain={isDaily ? undefined : handleNewGame}
            isDaily={isDaily}
          />
        </section>
      );
    }

    // Otherwise show the game interface
    return (
      <section id="game" className="h-full flex flex-col">
        <Navbar 
          key={navbarKey}
          roundInfo={{
            currentRound,
            maxRounds,
            totalScore
          }}
          showTimer={timerEnabled}
          timerDuration={timerDuration}
          hintCoins={hintCoins}
          hintsOpen={hintsOpen}
          setHintsOpen={setHintsOpen}
        />
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {timerEnabled && (
            <GameTimer 
              duration={timerDuration} 
              paused={timerPaused || showResults} 
              hintsOpen={hintsOpen}
            />
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
      </section>
    );
  };

  return renderContent();
};

export default GameSection;
