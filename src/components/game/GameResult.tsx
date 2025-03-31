
import { MapPin, Calendar, Lightbulb, Award } from 'lucide-react';
import ResultVisualization from './ResultVisualization';
import { useState, useEffect } from 'react';
import AchievementBadge from './AchievementBadge';

interface GameResultProps {
  isVisible: boolean;
  locationScore: number;
  yearScore: number;
  actualLocation: { lat: number; lng: number };
  guessedLocation?: { lat: number; lng: number };
  actualYear: number;
  guessedYear: number;
  distanceKm: number;
  yearDifference: number;
  onNextRound: () => void;
  currentRound: number;
  maxRounds: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  hintPenalty: number;
  eventTitle?: string;
  eventDescription?: string;
  locationName?: string;
}

const GameResult = ({
  isVisible,
  locationScore,
  yearScore,
  actualLocation,
  guessedLocation,
  actualYear,
  guessedYear,
  distanceKm,
  yearDifference,
  locationHintUsed,
  yearHintUsed,
  hintPenalty,
  eventTitle,
  eventDescription,
  locationName
}: GameResultProps) => {
  const [showBadges, setShowBadges] = useState(false);
  const [perfectLocation, setPerfectLocation] = useState(false);
  const [perfectYear, setPerfectYear] = useState(false);
  const [perfectCombo, setPerfectCombo] = useState(false);
  const [locationCount, setLocationCount] = useState(0);
  const [yearCount, setYearCount] = useState(0);
  const [comboCount, setComboCount] = useState(0);
  
  // Define the threshold for "perfect" location guess
  const PERFECT_LOCATION_THRESHOLD = 200; // km
  
  useEffect(() => {
    if (isVisible) {
      // Check if location is "perfect" (within threshold)
      const isLocationPerfect = distanceKm < PERFECT_LOCATION_THRESHOLD;
      const isYearPerfect = yearDifference === 0;
      const isCombo = isLocationPerfect && isYearPerfect;
      
      setPerfectLocation(isLocationPerfect);
      setPerfectYear(isYearPerfect);
      setPerfectCombo(isCombo);
      
      // Get current scores from localStorage
      const userAchievements = localStorage.getItem('userAchievements');
      let currentLocationCount = 0;
      let currentYearCount = 0;
      let currentComboCount = 0;
      
      if (userAchievements) {
        try {
          const achievements = JSON.parse(userAchievements);
          currentLocationCount = achievements.locationCount || 0;
          currentYearCount = achievements.yearCount || 0;
          currentComboCount = achievements.comboCount || 0;
        } catch (error) {
          console.error('Error parsing user achievements:', error);
        }
      }
      
      // Update counts if perfect guesses were made
      if (isLocationPerfect) {
        currentLocationCount++;
      }
      if (isYearPerfect) {
        currentYearCount++;
      }
      if (isCombo) {
        currentComboCount++;
      }
      
      // Set the updated counts
      setLocationCount(currentLocationCount);
      setYearCount(currentYearCount);
      setComboCount(currentComboCount);
      
      // Save updated counts to localStorage
      localStorage.setItem('userAchievements', JSON.stringify({
        locationCount: currentLocationCount,
        yearCount: currentYearCount,
        comboCount: currentComboCount
      }));
      
      // Show badges with animation after a delay
      if (isLocationPerfect || isYearPerfect) {
        setTimeout(() => {
          setShowBadges(true);
        }, 300);
      }
    } else {
      setShowBadges(false);
    }
  }, [isVisible, distanceKm, yearDifference]);
  
  if (!isVisible) return null;
  
  const totalScore = locationScore + yearScore - hintPenalty;
  
  // Helper to extract just the country name
  const getCountryOnly = (locationName?: string): string => {
    if (!locationName) return "Unknown";
    
    // Split by comma and get the last part which is usually the country
    const parts = locationName.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : parts[0].trim();
  };
  
  return (
    <div className="glass-card p-4 rounded-lg max-w-md w-full bg-white/90 dark:bg-gray-900/90">
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold mb-1">Round Results</h3>
      </div>
      
      {/* Event Title and Description */}
      <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-lg mb-4">
        <h4 className="font-semibold text-base">{eventTitle || "Historical Event"}</h4>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {eventDescription || 
            `This historical photo shows a scene from ${actualYear} in ${getCountryOnly(locationName)}.`
          }
        </p>
      </div>
      
      {/* Location Section */}
      <div className="border border-border rounded-lg mb-4 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm font-medium">Location: {locationName || getCountryOnly(locationName)}</span>
          </div>
          <span className="font-semibold">{locationScore.toLocaleString()} pts</span>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium">
            You were {Math.round(distanceKm)} km away
          </p>
          
          {perfectLocation && showBadges && (
            <div className="mt-2 flex items-center text-green-500 animate-bounce">
              <Award className="h-4 w-4 mr-1" />
              <span className="font-semibold">Perfect location! ({locationCount})</span>
            </div>
          )}
          
          {/* Map visualization */}
          {guessedLocation && (
            <ResultVisualization 
              actualLocation={actualLocation} 
              guessedLocation={guessedLocation} 
              isVisible={true} 
              circleRadius={300000} 
              showConnectionLine={true} 
            />
          )}
        </div>
        {locationHintUsed && (
          <div className="bg-amber-500/10 px-3 py-2 flex items-center text-xs text-amber-600">
            <Lightbulb className="h-3 w-3 mr-1.5" />
            Location hint used (-500 pts)
          </div>
        )}
      </div>
      
      {/* Year Section */}
      <div className="border border-border rounded-lg mb-4 overflow-hidden">
        <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm font-medium">Year: {actualYear}</span>
          </div>
          <span className="font-semibold">{yearScore.toLocaleString()} pts</span>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium">
            You guessed {guessedYear} ({yearDifference} years {guessedYear > actualYear ? 'later' : 'earlier'})
          </p>
          
          {perfectYear && showBadges && (
            <div className="mt-2 flex items-center text-green-500 animate-bounce">
              <Award className="h-4 w-4 mr-1" />
              <span className="font-semibold">Perfect year! ({yearCount})</span>
            </div>
          )}
        </div>
        {yearHintUsed && (
          <div className="bg-amber-500/10 px-3 py-2 flex items-center text-xs text-amber-600">
            <Lightbulb className="h-3 w-3 mr-1.5" />
            Year hint used (-500 pts)
          </div>
        )}
      </div>
      
      {/* Combo Badge Section */}
      {perfectCombo && showBadges && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg text-center animate-pulse">
          <div className="flex justify-center mb-2">
            <AchievementBadge type="combo" />
          </div>
          <p className="font-semibold text-green-600 dark:text-green-400">
            Perfect combo! ({comboCount})
          </p>
        </div>
      )}
      
      {/* Total Score */}
      <div className="bg-primary/5 p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Location + Year</span>
          <span className="font-semibold">{(locationScore + yearScore).toLocaleString()} pts</span>
        </div>
        
        {hintPenalty > 0 && (
          <div className="flex justify-between items-center mt-1 text-amber-600">
            <span className="text-sm font-medium">Hint Penalty</span>
            <span className="font-semibold">-{hintPenalty.toLocaleString()} pts</span>
          </div>
        )}
        
        <div className="h-px bg-border my-2"></div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Score</span>
          <span className="text-lg font-bold">{totalScore.toLocaleString()} pts</span>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
