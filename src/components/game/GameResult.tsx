
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Award, MapPin, Calendar, Lightbulb, Home, ChevronRight } from 'lucide-react';
import ResultVisualization from './ResultVisualization';
import YearTimeline from './YearTimeline';
import { Link } from 'react-router-dom';

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
    <Card className="glass-card p-4 rounded-lg max-w-md w-full overflow-y-auto max-h-[90vh]">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3">
          <Award className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-2xl font-bold mb-1">Your Score</h3>
        <p className={`font-medium ${accuracy.color}`}>{accuracy.text}</p>
      </div>
      
      {/* Event Title and Description */}
      <div className="bg-secondary/50 p-3 rounded-lg mb-4">
        <h4 className="font-semibold text-base">Historical Event</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {/* This would come from the image data in a real app */}
          This historical photo shows {guessedLocation ? 
            `a scene from ${actualYear} in a location at coordinates ${actualLocation.lat.toFixed(2)}, ${actualLocation.lng.toFixed(2)}.` :
            'a significant historical moment.'
          }
        </p>
      </div>
      
      {/* Location Section */}
      <div className="border border-border rounded-lg mb-4 overflow-hidden">
        <div className="bg-muted px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm font-medium">Location</span>
          </div>
          <span className="font-semibold">{locationScore.toLocaleString()} pts</span>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">
            {distanceKm < 1
              ? 'Perfect! You were spot on!'
              : `You were ${Math.round(distanceKm)} km away from the actual location.`}
          </p>
          {guessedLocation && (
            <ResultVisualization
              actualLocation={actualLocation}
              guessedLocation={guessedLocation}
              isVisible={isVisible}
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
        <div className="bg-muted px-4 py-2 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-primary" />
            <span className="text-sm font-medium">Year</span>
          </div>
          <span className="font-semibold">{yearScore.toLocaleString()} pts</span>
        </div>
        <div className="p-3">
          <p className="text-xs text-muted-foreground mb-2">
            {yearDifference === 0
              ? 'Perfect! You guessed the exact year!'
              : `You were ${yearDifference} year${yearDifference !== 1 ? 's' : ''} ${
                  guessedYear > actualYear ? 'later' : 'earlier'
                } than the actual year.`}
          </p>
          <YearTimeline 
            guessedYear={guessedYear}
            actualYear={actualYear}
            minYear={1900}
            maxYear={2025}
          />
        </div>
        {yearHintUsed && (
          <div className="bg-amber-500/10 px-3 py-2 flex items-center text-xs text-amber-600">
            <Lightbulb className="h-3 w-3 mr-1.5" />
            Year hint used (-500 pts)
          </div>
        )}
      </div>
      
      {/* Total Score */}
      <div className="bg-primary/5 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Total Score</span>
          <span className="text-lg font-bold">{totalScore.toLocaleString()} pts</span>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2">
        {isLastRound && (
          <Button 
            variant="outline" 
            className="flex-1 flex items-center justify-center"
            asChild
          >
            <Link to="/">
              <Home className="mr-1.5 h-4 w-4" />
              Home
            </Link>
          </Button>
        )}
        <Button 
          onClick={onNextRound} 
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
        >
          {isLastRound ? "See Final Results" : "Next Round"}
          <ChevronRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default GameResult;
