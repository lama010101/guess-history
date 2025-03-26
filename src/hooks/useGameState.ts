
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { sampleImages } from '@/data/sampleImages';
import { useHints } from './useHints';
import { useGameRounds } from './useGameRounds';
import { useGameScoring } from './useGameScoring';
import { useGameSettings } from './useGameSettings';
import { useGameProgress } from './useGameProgress';
import { useDailyGame } from './useDailyGame';
import { GameStateReturn } from '@/types/gameState';

export const useGameState = (maxRounds = 5): GameStateReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { 
    hintCoins, 
    locationHintUsed, 
    yearHintUsed, 
    resetHints, 
    handleUseLocationHint: useHintsLocationHint, 
    handleUseYearHint: useHintsYearHint,
    addHintCoins 
  } = useHints();
  
  const {
    currentRound,
    currentImage,
    currentImageIndex,
    maxRounds: configuredMaxRounds,
    gameComplete: roundsComplete,
    nextRound,
    resetGame,
  } = useGameRounds({ images: sampleImages, maxRounds });
  
  const {
    totalScore,
    roundScores,
    calculateRoundScore,
    addRoundScore,
    resetScores
  } = useGameScoring();

  const {
    timerEnabled,
    timerDuration,
    timerPaused,
    setTimerEnabled,
    setTimerDuration,
    setTimerPaused
  } = useGameSettings();

  const {
    selectedLocation,
    selectedYear,
    showResults,
    gameComplete,
    setSelectedLocation,
    setSelectedYear,
    setShowResults,
    setGameComplete
  } = useGameProgress(roundsComplete);

  const {
    isDaily,
    dailyCompleted,
    dailyScore,
    dailyDate,
    setDailyGame,
    completeDailyGame
  } = useDailyGame();

  // Sync gameComplete state with rounds completion
  useEffect(() => {
    if (roundsComplete !== gameComplete) {
      setGameComplete(roundsComplete);
    }
  }, [roundsComplete, gameComplete, setGameComplete]);

  // Save detailed game state
  useEffect(() => {
    const gameState = {
      selectedLocation,
      selectedYear,
      timerEnabled,
      timerDuration,
      showResults,
      currentRound,
      currentImageIndex,
      gameComplete,
      totalScore,
      roundScores
    };
    
    localStorage.setItem('currentGameState', JSON.stringify(gameState));
    console.info('Saved game state:', gameState);
  }, [selectedLocation, selectedYear, timerEnabled, timerDuration, showResults, 
      currentRound, currentImageIndex, gameComplete, totalScore, roundScores]);
  
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
    setTimerPaused(true);
    
    const scores = calculateRoundScore(
      selectedLocation,
      selectedYear,
      currentImage.location,
      currentImage.year,
      locationHintUsed,
      yearHintUsed
    );
    
    addRoundScore(
      currentImageIndex,
      scores.locationScore,
      scores.yearScore,
      locationHintUsed,
      yearHintUsed,
      scores.hintPenalty
    );
    
    setShowResults(true);
  };
  
  const handleNextRound = () => {
    setShowResults(false);
    setTimerPaused(false);
    nextRound();
    setSelectedLocation(null);
    setSelectedYear(1960);
    resetHints();
  };

  const handleNewGame = () => {
    setSelectedLocation(null);
    setSelectedYear(1960);
    setShowResults(false);
    setTimerPaused(false);
    resetGame();
    resetScores();
    resetHints();
    localStorage.removeItem('currentGameState');
    
    if (user && !user.isGuest) {
      const earnedCoins = 2;
      addHintCoins(earnedCoins);
      toast({
        title: "Daily coins earned!",
        description: `You've earned ${earnedCoins} hint coins for playing today.`,
      });
    }
  };

  const currentScores = calculateRoundScore(
    selectedLocation,
    selectedYear,
    currentImage.location,
    currentImage.year,
    locationHintUsed,
    yearHintUsed
  );

  const handleUseLocationHint = (): boolean => {
    return Boolean(useHintsLocationHint());
  };
  
  const handleUseYearHint = (): boolean => {
    return Boolean(useHintsYearHint());
  };

  return {
    selectedLocation,
    selectedYear,
    showResults,
    currentImageIndex,
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
    maxRounds: configuredMaxRounds,
    
    setSelectedLocation,
    setSelectedYear,
    handleSubmit,
    handleNextRound,
    handleNewGame,
    handleUseLocationHint,
    handleUseYearHint,
    setTimerEnabled,
    setTimerDuration,
    setTimerPaused
  };
};
