
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { sampleImages } from '@/data/sampleImages';
import { useHints } from './useHints';
import { useGameRounds } from './useGameRounds';
import { useGameScoring } from './useGameScoring';
import { GameStateReturn } from '@/types/gameState';

export type GameMode = 'regular' | 'daily' | 'friends';

export const useGameState = (maxRounds = 5): GameStateReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gameMode, setGameMode] = useState<GameMode>('regular');
  
  // Use our new hooks
  const { 
    hintCoins, 
    locationHintUsed, 
    yearHintUsed, 
    resetHints, 
    handleUseLocationHint, 
    handleUseYearHint,
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
  
  // Check if daily game was already played today
  useEffect(() => {
    // Check if we're in daily mode
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'daily') {
      setGameMode('daily');
      
      // Check if daily game was already played today
      const dailyGameScore = localStorage.getItem('dailyGameScore');
      if (dailyGameScore) {
        try {
          const { date } = JSON.parse(dailyGameScore);
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          
          if (date === today) {
            // Daily game already played today, show alert
            toast({
              title: "Daily challenge already completed",
              description: "You've already played today's daily challenge. Come back tomorrow!",
            });
          }
        } catch (error) {
          console.error('Error checking daily game status:', error);
        }
      }
    } else if (mode === 'friends') {
      setGameMode('friends');
    }
  }, [toast]);
  
  // Handle submitting a guess
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
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
    resetGame();
    resetScores();
    resetHints();
    
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
    
    // Current data
    currentImage,
    currentScores,
    
    // Images data
    sampleImages,
    
    // Game mode
    gameMode,
    
    // Handlers
    setSelectedLocation,
    setSelectedYear,
    handleSubmit,
    handleNextRound,
    handleNewGame,
    handleUseLocationHint,
    handleUseYearHint,
    
    // Game constants
    maxRounds
  };
};
