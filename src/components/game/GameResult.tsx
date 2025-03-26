
import { MapPin, Calendar, Lightbulb } from 'lucide-react';

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
  removeShadow?: boolean; // Added removeShadow prop
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
  locationName,
  removeShadow = false // Default to false
}: GameResultProps) => {
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
    <div className={`glass-card p-4 rounded-lg max-w-md w-full bg-white/90 dark:bg-gray-900/90 ${removeShadow ? '' : 'shadow-md'}`}>
      <div className="text-center mb-4">
        <h3 className="text-2xl font-bold mb-1">Image Score</h3>
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
            <span className="text-sm font-medium">Location: {getCountryOnly(locationName)}</span>
          </div>
          <span className="font-semibold">{locationScore.toLocaleString()} pts</span>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium">
            You were {Math.round(distanceKm)} km away
          </p>
        </div>
        {locationHintUsed && (
          <div className="bg-amber-500/10 px-3 py-2 flex items-center text-xs text-amber-600">
            <Lightbulb className="h-3 w-3 mr-1.5" />
            Location hint used (-500 pts)
          </div>
        )}
      </div>
      
      {/* Year Section - Updated to show "You guessed X so Y years earlier/later" */}
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
        </div>
        {yearHintUsed && (
          <div className="bg-amber-500/10 px-3 py-2 flex items-center text-xs text-amber-600">
            <Lightbulb className="h-3 w-3 mr-1.5" />
            Year hint used (-500 pts)
          </div>
        )}
      </div>
      
      {/* Total Score */}
      <div className="bg-primary/5 p-3 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Score</span>
          <span className="text-lg font-bold">{totalScore.toLocaleString()} pts</span>
        </div>
      </div>
    </div>
  );
};

export default GameResult;
