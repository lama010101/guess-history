
import { useState } from 'react';
import { RoundScore } from '@/types/game';
import { calculateScores } from '@/utils/scoreCalculations';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';
import { sampleImages } from '@/data/sampleImages';
import { useHints } from './useHints';
import { GameStateReturn } from '@/types/gameState';

export const useGameState = (maxRounds = 5): GameStateReturn => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    hintCoins, 
    locationHintUsed, 
    yearHintUsed, 
    resetHints, 
    handleUseLocationHint, 
    handleUseYearHint,
    addHintCoins 
  } = useHints();

  // Game state
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  
  // Current image based on the current image index
  const currentImage = sampleImages[currentImageIndex % sampleImages.length];
  
  // Handle submitting a guess
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
    const scores = calculateScores(
      selectedLocation,
      selectedYear,
      currentImage,
      locationHintUsed,
      yearHintUsed
    );
    
    // Add current round scores to total (subtracting hint penalty)
    const roundScore = scores.locationScore + scores.yearScore - scores.hintPenalty;
    setTotalScore(prevScore => prevScore + roundScore);
    
    // Add scores to round history
    setRoundScores(prevScores => [...prevScores, {
      locationScore: scores.locationScore,
      yearScore: scores.yearScore,
      image: currentImageIndex,
      locationHintUsed,
      yearHintUsed,
      hintPenalty: scores.hintPenalty
    }]);
    
    setShowResults(true);
  };
  
  // Handle moving to the next round
  const handleNextRound = () => {
    // Hide the results modal first
    setShowResults(false);
    
    // Check if game is complete
    if (currentRound >= maxRounds) {
      // Game complete
      setGameComplete(true);
      return;
    }
    
    // Move to next round
    setCurrentRound(prevRound => prevRound + 1);
    setCurrentImageIndex(prevIndex => (prevIndex + 1) % sampleImages.length);
    
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
    setCurrentImageIndex(0);
    setCurrentRound(1);
    setTotalScore(0);
    setRoundScores([]);
    setGameComplete(false);
    
    // Reset hint usage for the new game
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
  const currentScores = calculateScores(
    selectedLocation,
    selectedYear,
    currentImage,
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
