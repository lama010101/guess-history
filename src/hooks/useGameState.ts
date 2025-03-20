
import { useState } from 'react';
import { HistoricalImage, RoundScore } from '@/types/game';
import { calculateScores } from '@/utils/scoreCalculations';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/services/auth';

// Sample historical images
const sampleImages: HistoricalImage[] = [
  {
    id: 1,
    src: 'https://images.unsplash.com/photo-1565711561500-49678a10a63f?q=80&w=2940&auto=format&fit=crop',
    year: 1950,
    location: { lat: 48.8584, lng: 2.2945 },
    description: 'Eiffel Tower, Paris'
  },
  {
    id: 2,
    src: 'https://images.unsplash.com/photo-1568797629192-789acf8e4df3?q=80&w=3174&auto=format&fit=crop',
    year: 1932,
    location: { lat: 40.7484, lng: -73.9857 },
    description: 'Empire State Building, New York'
  },
  {
    id: 3,
    src: 'https://images.unsplash.com/photo-1526711657229-e7e080961425?q=80&w=2832&auto=format&fit=crop',
    year: 1969,
    location: { lat: 37.8199, lng: -122.4783 },
    description: 'Golden Gate Bridge, San Francisco'
  }
];

export const useGameState = (maxRounds = 5) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Game state
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState<RoundScore[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  
  // Hint system state
  const [hintCoins, setHintCoins] = useState(10);
  const [locationHintUsed, setLocationHintUsed] = useState(false);
  const [yearHintUsed, setYearHintUsed] = useState(false);

  // Current image based on the current image index
  const currentImage = sampleImages[currentImageIndex % sampleImages.length];
  
  // Reset hints when moving to a new round
  const resetHints = () => {
    setLocationHintUsed(false);
    setYearHintUsed(false);
  };
  
  // Hint handlers
  const handleUseLocationHint = () => {
    if (hintCoins > 0) {
      setLocationHintUsed(true);
      setHintCoins(prev => prev - 1);
    }
  };
  
  const handleUseYearHint = () => {
    if (hintCoins > 0) {
      setYearHintUsed(true);
      setHintCoins(prev => prev - 1);
    }
  };
  
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
      setHintCoins(prev => prev + earnedCoins);
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
