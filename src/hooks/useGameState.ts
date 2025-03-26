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
  
  // Use our new hooks
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
    resetGame
  } = useGameRounds({ images: sampleImages, maxRounds });
  
  const {
    totalScore,
    roundScores,
    calculateRoundScore,
    addRoundScore,
    resetScores
  } = useGameScoring();

  // Game state
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  
  // Timer settings
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60); // 60 seconds default
  const [timerPaused, setTimerPaused] = useState(false);

  // Daily challenge settings
  const [isDaily, setIsDaily] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");
  
  // Load saved game state on initial render
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
    
    // Load timer settings from game settings
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.timerEnabled !== undefined) {
          setTimerEnabled(settings.timerEnabled);
        }
        if (settings.timerMinutes) {
          // Convert minutes to seconds
          setTimerDuration(settings.timerMinutes * 60);
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
  // Save current game state when it changes
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
  
  // Handle submitting a guess
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
    // Pause timer when submitting guess
    setTimerPaused(true);
    
    const scores = calculateRoundScore(
      selectedLocation,
      selectedYear,
      currentImage.location,
      currentImage.year,
      locationHintUsed,
      yearHintUsed
    );
    
    // Add current round to scores history
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
    // Hide the results modal first
    setShowResults(false);
    
    // Unpause timer for next round
    setTimerPaused(false);
    
    // Move to next round
    nextRound();
    
    // Reset guesses for the next round
    setSelectedLocation(null);
    setSelectedYear(1960);
    
    // Reset hints for the next round
    resetHints();
  };

  // Handle starting a new game
  const handleNewGame = () => {
    // Reset the entire game
    setSelectedLocation(null);
    setSelectedYear(1960);
    setShowResults(false);
    setTimerPaused(false);
    resetGame();
    resetScores();
    resetHints();
    
    // Clear saved game state
    localStorage.removeItem('currentGameState');
    
    // Give some hint coins if the player is logged in
    if (user && !user.isGuest) {
      const earnedCoins = 2; // Earn 2 coins for playing a game when logged in
      addHintCoins(earnedCoins);
      toast({
        title: "Daily coins earned!",
        description: `You've earned ${earnedCoins} hint coins for playing today.`,
      });
    }
  };

  // Calculate current scores
  const currentScores = calculateRoundScore(
    selectedLocation,
    selectedYear,
    currentImage.location,
    currentImage.year,
    locationHintUsed,
    yearHintUsed
  );

  // Make sure these handlers explicitly return boolean values
  const handleUseLocationHint = (): boolean => {
    return useHintsLocationHint();
  };
  
  const handleUseYearHint = (): boolean => {
    return useHintsYearHint();
  };

  return {
    // Game state
    selectedLocation,
    selectedYear,
    showResults,
    currentImageIndex,
    currentRound,
    totalScore,
    roundScores,
    gameComplete,
    
    // Hint system state
    hintCoins,
    locationHintUsed,
    yearHintUsed,
    
    // Timer state
    timerEnabled,
    timerDuration,
    timerPaused,
    
    // Daily challenge state
    isDaily,
    dailyCompleted,
    dailyScore,
    dailyDate,
    
    // Current data
    currentImage,
    currentScores,
    
    // Images data
    sampleImages,
    
    // Handlers
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
    
    // Game constants
    maxRounds
  };
};
