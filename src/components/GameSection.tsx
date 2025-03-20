
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import GamePanel from './game/GamePanel';
import GameControls from './game/GameControls';
import GameResult from './game/GameResult';
import { useAuth } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';

// Sample historical images
const sampleImages = [
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

// Helper function to calculate distance between two coordinates in kilometers
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

const GameSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1960);
  const [showResults, setShowResults] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScores, setRoundScores] = useState<{
    locationScore: number, 
    yearScore: number, 
    image: number,
    locationHintUsed: boolean,
    yearHintUsed: boolean,
    hintPenalty: number
  }[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  
  // Hint system state
  const [hintCoins, setHintCoins] = useState(10); // Start with 10 hint coins
  const [locationHintUsed, setLocationHintUsed] = useState(false);
  const [yearHintUsed, setYearHintUsed] = useState(false);
  
  const MAX_ROUNDS = 3; // Reduced to 3 for testing purposes
  const currentImage = sampleImages[currentImageIndex % sampleImages.length];
  
  // Reset hints when moving to a new round
  useEffect(() => {
    setLocationHintUsed(false);
    setYearHintUsed(false);
  }, [currentRound]);
  
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
  
  // Calculate scores based on guesses
  const calculateScores = () => {
    if (!selectedLocation || !currentImage) return { locationScore: 0, yearScore: 0 };
    
    // Calculate distance in kilometers using Haversine formula
    const distance = getDistanceFromLatLonInKm(
      selectedLocation.lat,
      selectedLocation.lng,
      currentImage.location.lat,
      currentImage.location.lng
    );
    
    // Calculate location score (max 5000 points, decreasing by distance)
    const locationScore = Math.max(0, 5000 - Math.round(distance));
    
    // Calculate year difference
    const yearDiff = Math.abs(selectedYear - currentImage.year);
    
    // Calculate year score (max 5000 points, losing 100 per year off)
    const yearScore = Math.max(0, 5000 - yearDiff * 100);
    
    // Calculate hint penalty (500 points per hint used)
    const hintPenalty = (locationHintUsed ? 500 : 0) + (yearHintUsed ? 500 : 0);
    
    return { 
      locationScore, 
      yearScore, 
      distanceKm: distance, 
      yearDifference: yearDiff,
      hintPenalty
    };
  };
  
  const handleSubmit = () => {
    if (!selectedLocation) {
      return;
    }
    
    const scores = calculateScores();
    
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
  
  const handleNextRound = () => {
    // Hide the results modal first
    setShowResults(false);
    
    // Check if game is complete
    if (currentRound >= MAX_ROUNDS) {
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
  };
  
  const handleLocationSelect = (lat: number, lng: number) => {
    if (lat === 0 && lng === 0) {
      setSelectedLocation(null);
    } else {
      setSelectedLocation({ lat, lng });
    }
  };
  
  const { locationScore, yearScore, distanceKm, yearDifference, hintPenalty } = calculateScores();

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
    setLocationHintUsed(false);
    setYearHintUsed(false);
    
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

  // Show game over screen if all rounds are completed
  if (gameComplete) {
    return (
      <section id="game" className="h-full flex flex-col">
        <div className="relative flex-1 flex flex-col items-center justify-center p-4">
          <div className="glass-card p-6 rounded-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-center mb-4">Game Complete!</h2>
            <p className="text-center mb-6">
              Your final score: <span className="font-bold text-primary">{totalScore}</span> out of {MAX_ROUNDS * 10000}
            </p>
            
            <h3 className="text-lg font-semibold mb-2">Round Scores:</h3>
            <div className="space-y-2 mb-6">
              {roundScores.map((score, index) => (
                <div key={index} className="flex justify-between items-center p-2 border-b">
                  <div>
                    <span className="font-medium">Round {index + 1}: </span>
                    <span>{sampleImages[score.image].description}</span>
                    {(score.locationHintUsed || score.yearHintUsed) && (
                      <span className="text-xs text-amber-500 ml-2">
                        {score.locationHintUsed && score.yearHintUsed ? "Used both hints" :
                         score.locationHintUsed ? "Used location hint" : "Used year hint"}
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{score.locationScore + score.yearScore - score.hintPenalty} pts</span>
                </div>
              ))}
            </div>
            
            <Button
              onClick={handleNewGame}
              className="w-full"
            >
              Play Again
            </Button>
          </div>
        </div>
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
        
        {showResults && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <GameResult 
              isVisible={showResults}
              locationScore={locationScore}
              yearScore={yearScore}
              actualLocation={currentImage.location}
              guessedLocation={selectedLocation ?? undefined}
              actualYear={currentImage.year}
              guessedYear={selectedYear}
              distanceKm={distanceKm}
              yearDifference={yearDifference}
              onNextRound={handleNextRound}
              currentRound={currentRound}
              maxRounds={MAX_ROUNDS}
              locationHintUsed={locationHintUsed}
              yearHintUsed={yearHintUsed}
              hintPenalty={hintPenalty}
            />
          </div>
        )}
      </div>
    </section>
  );
};

export default GameSection;
