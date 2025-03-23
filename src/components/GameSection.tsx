
import { useState, useEffect } from 'react';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResultsModal from './game/GameResultsModal';
import GameComplete from './game/GameComplete';
import { useGameState } from '@/hooks/useGameState';
import { useGameTimer } from '@/hooks/useGameTimer';

const MAX_ROUNDS = 5; // Default to 5 rounds for a game

const GameSection = () => {
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
    maxRounds,
    gameMode
  } = useGameState(MAX_ROUNDS);
  
  const { 
    resetTimer, 
    startTimer, 
    pauseTimer, 
    isActive: timerActive 
  } = useGameTimer();

  // Create an adapter function to handle the different parameter types
  const handleLocationSelect = (lat: number, lng: number) => {
    updateSelectedLocation({ lat, lng });
  };
  
  // Start timer for each round and pause when showing results
  useEffect(() => {
    if (timerActive) {
      if (showResults) {
        pauseTimer();
      } else if (!gameComplete) {
        resetTimer();
        startTimer();
      }
    }
  }, [currentRound, showResults, gameComplete, timerActive, resetTimer, startTimer, pauseTimer]);
  
  // Show game over screen if all rounds are completed
  if (gameComplete) {
    return (
      <section id="game" className="h-full flex flex-col">
        <GameComplete 
          totalScore={totalScore}
          maxRounds={MAX_ROUNDS}
          roundScores={roundScores}
          images={sampleImages}
          onPlayAgain={handleNewGame}
          gameMode={gameMode}
        />
      </section>
    );
  }

  return (
    <section id="game" className="h-full flex flex-col">
      <div className="relative flex-1 flex flex-col overflow-hidden">
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
          />
        </div>
        
        <div className="bg-background border-t border-border shadow-lg">
          <GameControls 
            selectedLocation={selectedLocation}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            onSubmit={handleSubmit}
          />
        </div>
        
        <GameResultsModal 
          showResults={showResults}
          locationScore={currentScores.locationScore}
          yearScore={currentScores.yearScore}
          currentImage={currentImage}
          selectedLocation={selectedLocation}
          selectedYear={selectedYear}
          distanceKm={currentScores.distanceKm}
          yearDifference={currentScores.yearDifference}
          onNextRound={handleNextRound}
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

export default GameSection;
