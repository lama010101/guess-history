
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
import { isPerfectLocation, isPerfectYear, updateUserAchievements } from '@/utils/achievementUtils';

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
    images,
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
    countdown,
    setDailyGame,
    completeDailyGame
  } = useDailyGame();

  // Sync gameComplete with roundsComplete
  useEffect(() => {
    if (roundsComplete !== gameComplete) {
      setGameComplete(roundsComplete);
    }
  }, [roundsComplete, gameComplete, setGameComplete]);

  // Save complete game state to localStorage
  useEffect(() => {
    const gameState = {
      selectedLocation,
      selectedYear,
      timerEnabled,
      timerDuration,
      timerPaused,
      showResults,
      currentRound,
      currentImageIndex,
      gameComplete,
      totalScore,
      roundScores,
      locationHintUsed,
      yearHintUsed,
      hintCoins
    };
    
    localStorage.setItem('currentGameState', JSON.stringify(gameState));
    console.info('Saved game state:', gameState);
  }, [selectedLocation, selectedYear, timerEnabled, timerDuration, timerPaused, 
      showResults, currentRound, currentImageIndex, gameComplete, totalScore, 
      roundScores, locationHintUsed, yearHintUsed, hintCoins]);
  
  // Handle submitting a guess
  const handleSubmit = () => {
    if (!selectedLocation || !currentImage) {
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
    
    // Check if this round contains any perfect guesses and update achievements
    if (selectedLocation && currentImage) {
      const isPerfectLoc = isPerfectLocation(
        selectedLocation,
        currentImage.location
      );
      const isPerfectYr = isPerfectYear(selectedYear, currentImage.year);
      
      if (isPerfectLoc || isPerfectYr) {
        updateUserAchievements(isPerfectLoc, isPerfectYr);
      }
    }
    
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
  
  // Handle moving to the next round
  const handleNextRound = () => {
    setShowResults(false);
    setTimerPaused(false);
    nextRound();
    setSelectedLocation(null);
    setSelectedYear(1960);
    resetHints();
  };

  // Handle starting a new game
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

  // Add default values in case currentImage is undefined
  const defaultImage = sampleImages[0];
  const safeCurrentImage = currentImage || defaultImage;

  // Calculate scores for the current state
  const currentScores = calculateRoundScore(
    selectedLocation,
    selectedYear,
    safeCurrentImage.location,
    safeCurrentImage.year,
    locationHintUsed,
    yearHintUsed
  );

  // Handle hint usage
  const handleUseLocationHint = (): boolean => {
    if (locationHintUsed) return false;
    return Boolean(useHintsLocationHint());
  };
  
  const handleUseYearHint = (): boolean => {
    if (yearHintUsed) return false;
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
    
    currentImage: safeCurrentImage,
    currentScores,
    
    sampleImages,
    maxRounds: configuredMaxRounds,
    images, // Add images to the return object
    
    setSelectedLocation,
    setSelectedYear,
    handleSubmit,
    handleNextRound,
    handleNewGame,
    handleUseLocationHint,
    handleUseYearHint,
    setTimerEnabled,
    setTimerDuration,
    setTimerPaused,
    setGameComplete
  };
};
