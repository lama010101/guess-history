
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Calendar, Trophy, Info } from "lucide-react";
import AchievementBadge from './AchievementBadge';
import { isPerfectLocation, isPerfectYear, isPerfectCombo, updateUserAchievements } from '@/utils/achievementUtils';
import { useEffect, useState } from 'react';
import { HistoricalImage, Coordinates } from "@/types/game";
import ResultVisualization from './ResultVisualization';

interface GameResultsModalProps {
  showResults: boolean;
  locationScore: number;
  yearScore: number;
  currentImage: HistoricalImage;
  selectedLocation: Coordinates | null;
  selectedYear: number;
  distanceKm: number;
  yearDifference: number;
  onNextRound: () => void;
  currentRound: number;
  maxRounds: number;
  locationHintUsed: boolean;
  yearHintUsed: boolean;
  hintPenalty: number;
}

const GameResultsModal = ({
  showResults,
  locationScore,
  yearScore,
  currentImage,
  selectedLocation,
  selectedYear,
  distanceKm,
  yearDifference,
  onNextRound,
  currentRound,
  maxRounds,
  locationHintUsed,
  yearHintUsed,
  hintPenalty
}: GameResultsModalProps) => {
  const [showBadges, setShowBadges] = useState(false);
  const [perfectLocation, setPerfectLocation] = useState(false);
  const [perfectYear, setPerfectYear] = useState(false);
  const [perfectCombo, setPerfectCombo] = useState(false);
  const [achievements, setAchievements] = useState({
    perfectLocations: 0,
    perfectYears: 0,
    perfectCombos: 0
  });
  
  // Get threshold from settings
  const [locationThreshold, setLocationThreshold] = useState(200); // Default 200km
  
  useEffect(() => {
    if (showResults && selectedLocation) {
      // Load threshold from settings
      try {
        const settings = localStorage.getItem('gameSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed.locationThreshold) {
            setLocationThreshold(parsed.locationThreshold);
          }
        }
      } catch (e) {
        console.error('Error loading location threshold', e);
      }
      
      // Calculate achievements
      const isPerfectLoc = isPerfectLocation(
        selectedLocation, 
        currentImage.location,
        locationThreshold
      );
      const isPerfectYr = isPerfectYear(selectedYear, currentImage.year);
      const isCombo = isPerfectCombo(isPerfectLoc, isPerfectYr);
      
      setPerfectLocation(isPerfectLoc);
      setPerfectYear(isPerfectYr);
      setPerfectCombo(isCombo);
      
      // Update user achievements in localStorage
      if (isPerfectLoc || isPerfectYr) {
        updateUserAchievements(isPerfectLoc, isPerfectYr);
        
        // Show badges with a slight delay for better UX
        setTimeout(() => {
          setShowBadges(true);
        }, 300);
      }
      
      // Get updated achievement counts
      import('@/utils/achievementUtils').then(({ getUserAchievements }) => {
        const userAchievements = getUserAchievements();
        setAchievements(userAchievements);
      });
    } else {
      setShowBadges(false);
    }
  }, [showResults, currentImage, selectedLocation, selectedYear, locationThreshold]);

  // Get country name from location
  const getLocationName = () => {
    if (currentImage.locationName) return currentImage.locationName;
    if (currentImage.country) return currentImage.country;
    return 'Unknown location';
  };

  return (
    <Dialog open={showResults} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-bold">{currentImage.title || "Round Results"}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {currentImage.description || "Here's how you did in this round"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Image preview - now directly below description */}
        <div className="relative aspect-video rounded-md overflow-hidden bg-black/10 mb-6">
          <img 
            src={currentImage.src} 
            alt={currentImage.description || "Historical image"} 
            className="w-full h-full object-contain"
          />
        </div>
                
        <div className="space-y-6">
          {/* Location Section */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Location: {getLocationName()}</span>
              </div>
              <span className="font-semibold">{locationScore.toLocaleString()} pts</span>
            </div>
            <div className="p-4">
              <p className="text-sm mb-3">
                You were <span className="font-medium">{Math.round(distanceKm)} km</span> away from the actual location.
              </p>
              
              {selectedLocation && (
                <div className="h-48 rounded-md overflow-hidden border mb-4">
                  <ResultVisualization 
                    actualLocation={currentImage.location}
                    guessedLocation={selectedLocation}
                    isVisible={true}
                    circleRadius={300000}
                    showConnectionLine={true}
                  />
                </div>
              )}
              
              {perfectLocation && (
                <div className="flex items-center text-green-600 gap-2 mt-3">
                  <AchievementBadge 
                    type="location" 
                    size="sm" 
                    count={achievements.perfectLocations}
                  />
                  <span className="text-sm font-semibold">Perfect location guess!</span>
                </div>
              )}
              
              {locationHintUsed && (
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 text-xs p-2 rounded mt-3">
                  Location hint used (-{hintPenalty / (locationHintUsed && yearHintUsed ? 2 : 1)} points)
                </div>
              )}
            </div>
          </div>
          
          {/* Year Section */}
          <div className="border rounded-md overflow-hidden">
            <div className="bg-muted p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Year: {currentImage.year}</span>
              </div>
              <span className="font-semibold">{yearScore.toLocaleString()} pts</span>
            </div>
            <div className="p-4">
              <p className="text-sm">
                You guessed <span className="font-medium">{selectedYear}</span>
                {yearDifference !== 0 && (
                  <> ({yearDifference > 0 ? 
                    `${yearDifference} years earlier` : 
                    `${Math.abs(yearDifference)} years later`
                  })</>
                )}
              </p>
              
              {perfectYear && (
                <div className="flex items-center text-green-600 gap-2 mt-3">
                  <AchievementBadge 
                    type="year" 
                    size="sm" 
                    count={achievements.perfectYears}
                  />
                  <span className="text-sm font-semibold">Perfect year guess!</span>
                </div>
              )}
              
              {yearHintUsed && (
                <div className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 text-xs p-2 rounded mt-3">
                  Year hint used (-{hintPenalty / (locationHintUsed && yearHintUsed ? 2 : 1)} points)
                </div>
              )}
            </div>
          </div>
          
          {/* Combo Achievement */}
          {perfectCombo && (
            <div className="border border-green-300 dark:border-green-800 rounded-md p-4 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-800 dark:text-green-300">Perfect Combo!</span>
                </div>
                <AchievementBadge 
                  type="combo" 
                  size="sm" 
                  count={achievements.perfectCombos}
                  animated={true}
                />
              </div>
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                You correctly guessed both the location and year!
              </p>
            </div>
          )}
          
          {/* Total Score */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <div className="text-sm w-full">
                <div className="flex justify-between mb-2">
                  <span>Location + Year:</span>
                  <span className="font-medium">{(locationScore + yearScore).toLocaleString()} pts</span>
                </div>
                
                {hintPenalty > 0 && (
                  <div className="flex justify-between text-amber-600 mb-2">
                    <span>Hint Penalty:</span>
                    <span className="font-medium">-{hintPenalty.toLocaleString()} pts</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="h-px bg-border my-3"></div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Score:</span>
              <span className="text-lg font-bold">{(locationScore + yearScore - hintPenalty).toLocaleString()} pts</span>
            </div>
          </div>
          
          <div className="pt-2">
            <Button onClick={onNextRound} className="w-full">
              {currentRound >= maxRounds ? 'View Final Results' : 'Next Round'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameResultsModal;
