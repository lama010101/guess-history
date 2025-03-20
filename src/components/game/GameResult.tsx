
import { Button } from '@/components/ui/button';
import ScoreDisplay from '../ScoreDisplay';
import ResultVisualization from './ResultVisualization';
import { Card } from '@/components/ui/card';
import { AlertCircle, Award, MapPin, Calendar, Lightbulb } from 'lucide-react';

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
  onNextRound,
  currentRound,
  maxRounds,
  locationHintUsed,
  yearHintUsed,
  hintPenalty
}: GameResultProps) => {
  if (!isVisible) return null;
  
  const isLastRound = currentRound >= maxRounds;
  const totalScore = locationScore + yearScore - hintPenalty;
  const scorePercentage = (totalScore / 10000) * 100;
  
  const getAccuracyLevel = () => {
    if (scorePercentage >= 90) return { text: 'Excellent!', color: 'text-green-500' };
    if (scorePercentage >= 70) return { text: 'Great!', color: 'text-blue-500' };
    if (scorePercentage >= 50) return { text: 'Good', color: 'text-yellow-500' };
    if (scorePercentage >= 30) return { text: 'Fair', color: 'text-orange-500' };
    return { text: 'Try Again', color: 'text-red-500' };
  };
  
  const accuracy = getAccuracyLevel();
  
  return (
    <Card className="glass-card p-4 rounded-lg max-w-md w-full">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-1">Your Score</h3>
        <p className={`font-medium ${accuracy.color}`}>{accuracy.text}</p>
      </div>
      
      <div className="space-y-4 mb-4">
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
      
      <div className="bg-secondary p-4 rounded-lg space-y-3 mb-4">
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
                : `You were ${yearDifference} year${yearDifference !== 1 ? 's' : ''} ${
                    guessedYear > actualYear ? 'later' : 'earlier'
                  } than the actual year.`}
            </p>
          </div>
        </div>
      </div>
      
      {guessedLocation && (
        <ResultVisualization
          actualLocation={actualLocation}
          guessedLocation={guessedLocation}
          isVisible={isVisible}
        />
      )}
      
      <div className="mt-4">
        <Button 
          onClick={onNextRound} 
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLastRound ? "See Final Results" : "Next Round"}
        </Button>
      </div>
    </Card>
  );
};

export default GameResult;
