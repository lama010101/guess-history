import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { sampleImages } from '@/data/sampleImages';
import { useHints } from './useHints';
import { useGameRounds } from './useGameRounds';
import { useGameScoring } from './useGameScoring';
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
    gameComplete,
    nextRound,
    resetGame,
    maxRounds: configuredMaxRounds
  } = useGameRounds({ images: sampleImages, maxRounds });
  
  const {
    totalScore,
    roundScores,
    calculateRoundScore,
    addRoundScore,
    resetScores
  } = useGameScoring();

  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60);
  const [timerPaused, setTimerPaused] = useState(false);

  const [isDaily, setIsDaily] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");

  useEffect(() => {
    const savedState = localStorage.getItem('currentGameState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.selectedLocation) {
          setSelectedLocation(state.selectedLocation);
        }
        if (state.selectedYear) {
          setSelectedYear(state.selectedYear);
        }
        if (state.timerEnabled !== undefined) {
          setTimerEnabled(state.timerEnabled);
        }
        if (state.timerDuration) {
          setTimerDuration(state.timerDuration);
        }
        if (state.showResults !== undefined) {
          setShowResults(state.showResults);
        }
        
        console.info('Loaded saved game state:', state);
      } catch (error) {
        console.error('Error loading saved game state:', error);
      }
    }
    
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.timerEnabled !== undefined) {
          setTimerEnabled(settings.timerEnabled);
        }
        if (settings.timerMinutes) {
          setTimerDuration(settings.timerMinutes * 60);
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
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
