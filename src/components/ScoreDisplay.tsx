
import { AlertCircle, Award, Check, MapPin, Calendar, Lightbulb } from 'lucide-react';

interface ScoreDisplayProps {
  locationScore?: number;
  yearScore?: number;
  actualLocation?: { lat: number; lng: number };
  guessedLocation?: { lat: number; lng: number };
  actualYear?: number;
  guessedYear?: number;
  distanceKm?: number;
  yearDifference?: number;
  isVisible?: boolean;
  locationHintUsed?: boolean;
  yearHintUsed?: boolean;
  hintPenalty?: number;
}

const ScoreDisplay = ({
  locationScore = 0,
  yearScore = 0,
  actualLocation,
  guessedLocation,
  actualYear,
  guessedYear,
  distanceKm = 0,
  yearDifference = 0,
  isVisible = false,
  locationHintUsed = false,
  yearHintUsed = false,
  hintPenalty = 0
}: ScoreDisplayProps) => {
  const baseScore = locationScore + yearScore;
  const totalScore = baseScore - hintPenalty;
  const maxScore = 10000;
  const scorePercentage = (totalScore / maxScore) * 100;
  
  // Display accuracy level based on score
  const getAccuracyLevel = () => {
    if (scorePercentage >= 90) return { text: 'Excellent!', color: 'text-green-500' };
    if (scorePercentage >= 70) return { text: 'Great!', color: 'text-blue-500' };
    if (scorePercentage >= 50) return { text: 'Good', color: 'text-yellow-500' };
    if (scorePercentage >= 30) return { text: 'Fair', color: 'text-orange-500' };
    return { text: 'Try Again', color: 'text-red-500' };
  };
  
  const accuracy = getAccuracyLevel();

  if (!isVisible) return null;

  return (
    <div className="glass-card p-6 animate-scale-in rounded-lg">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-1">Your Score</h3>
        <p className={`font-medium ${accuracy.color}`}>{accuracy.text}</p>
      </div>
      
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-primary" />
            <span className="text-sm font-medium">Location</span>
          </div>
          <span className="font-semibold">{locationScore.toLocaleString()} pts</span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-primary" />
            <span className="text-sm font-medium">Year</span>
          </div>
          <span className="font-semibold">{yearScore.toLocaleString()} pts</span>
        </div>
        
        {(locationHintUsed || yearHintUsed) && (
          <div className="flex justify-between items-center text-amber-500">
            <div className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Hint Penalty</span>
            </div>
            <span className="font-semibold">-{hintPenalty.toLocaleString()} pts</span>
          </div>
        )}
        
        <div className="h-px bg-border my-2"></div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Score</span>
          <span className="text-lg font-bold">{totalScore.toLocaleString()} pts</span>
        </div>
      </div>
      
      <div className="bg-secondary p-4 rounded-lg space-y-3 border border-border/50">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Location Accuracy</p>
            <p className="text-xs text-muted-foreground">
              {distanceKm < 1
                ? 'Perfect! You were spot on!'
                : `You were ${Math.round(distanceKm)} km away from the actual location.`}
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Year Accuracy</p>
            <p className="text-xs text-muted-foreground">
              {yearDifference === 0
                ? 'Perfect! You guessed the exact year!'
                : `Correct year: ${actualYear}. You guessed ${guessedYear}, so ${yearDifference} year${yearDifference !== 1 ? 's' : ''} ${
                    guessedYear && actualYear && guessedYear > actualYear ? 'later' : 'earlier'
                  }.`}
            </p>
          </div>
        </div>
        
        {(locationHintUsed || yearHintUsed) && (
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Hints Used</p>
              <p className="text-xs text-muted-foreground">
                {locationHintUsed && yearHintUsed
                  ? 'You used both location and year hints (-1000 points).'
                  : locationHintUsed
                  ? 'You used a location hint (-500 points).'
                  : 'You used a year hint (-500 points).'}
              </p>
            </div>
          </div>
        )}
        
        {actualYear && actualLocation && (
          <div className="flex items-start gap-2">
            <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Correct Answer</p>
              <p className="text-xs text-muted-foreground">
                This photo was taken in {actualYear} at coordinates {actualLocation.lat.toFixed(4)}, {actualLocation.lng.toFixed(4)}.
              </p>
            </div>
          </div>
        )}
      </div>
      
      <button className="w-full mt-4 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium btn-transition hover:shadow-md hover:brightness-110">
        Next Round
      </button>
    </div>
  );
};

export default ScoreDisplay;
