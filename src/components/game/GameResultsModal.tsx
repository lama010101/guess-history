
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Calendar } from "lucide-react";
import AchievementBadge from './AchievementBadge';
import { isPerfectLocation, isPerfectYear, isPerfectCombo, updateUserAchievements } from '@/utils/achievementUtils';
import { useEffect, useState } from 'react';
import { HistoricalImage, Coordinates } from "@/types/game";

interface GameResultsModalProps {
  showResults: boolean;
  locationScore: number;
  yearScore: number;
  currentImage: HistoricalImage;
  selectedLocation: Coordinates;
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
  
  // Get threshold from settings
  const [locationThreshold, setLocationThreshold] = useState(5); // Default 5km
  
  useEffect(() => {
    if (showResults) {
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
    } else {
      setShowBadges(false);
    }
  }, [showResults, currentImage, selectedLocation, selectedYear, locationThreshold]);

  return (
    <Dialog open={showResults} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Round Results</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Location Score
              </div>
              <div className="text-2xl font-bold">{locationScore}</div>
              {locationHintUsed && (
                <div className="text-xs text-red-500">Hint Penalty: -{hintPenalty}</div>
              )}
              {perfectLocation && (
                <div className="text-xs text-green-600 font-semibold mt-1 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Perfect!
                </div>
              )}
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Year Score
              </div>
              <div className="text-2xl font-bold">{yearScore}</div>
              {yearHintUsed && (
                <div className="text-xs text-red-500">Hint Penalty: -{hintPenalty}</div>
              )}
              {perfectYear && (
                <div className="text-xs text-green-600 font-semibold mt-1 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Perfect!
                </div>
              )}
            </div>
          </div>
          
          {/* Achievement badges section - improved visibility */}
          {showBadges && (perfectLocation || perfectYear) && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-center mb-2 font-medium">
                {perfectCombo ? 'Perfect Score!' : 'Achievements'}
              </div>
              <div className="flex justify-center gap-4">
                {perfectLocation && (
                  <AchievementBadge type="location" />
                )}
                {perfectYear && (
                  <AchievementBadge type="year" />
                )}
                {perfectCombo && (
                  <AchievementBadge type="combo" />
                )}
              </div>
            </div>
          )}
          
          <DialogDescription>
            You were {distanceKm.toFixed(2)}km away and {yearDifference} years off.
          </DialogDescription>
          
          <div className="pt-4 flex justify-center">
            <Button onClick={onNextRound}>
              {currentRound >= maxRounds ? 'View Results' : 'Next Round'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameResultsModal;
