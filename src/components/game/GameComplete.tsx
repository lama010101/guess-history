
import { RoundScore, HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Award, MapPin, Calendar, ChevronRight, Lightbulb } from 'lucide-react';

interface GameCompleteProps {
  totalScore: number;
  maxRounds: number;
  roundScores: RoundScore[];
  images: HistoricalImage[];
  onPlayAgain: () => void;
}

const GameComplete = ({ totalScore, maxRounds, roundScores, images, onPlayAgain }: GameCompleteProps) => {
  const maxPossibleScore = maxRounds * 10000;
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  
  // Display level based on final score percentage
  const getScoreLevel = () => {
    if (scorePercentage >= 90) return { text: 'Master Historian!', color: 'text-green-500' };
    if (scorePercentage >= 75) return { text: 'History Expert', color: 'text-blue-500' };
    if (scorePercentage >= 60) return { text: 'History Buff', color: 'text-blue-400' };
    if (scorePercentage >= 45) return { text: 'History Enthusiast', color: 'text-yellow-500' };
    if (scorePercentage >= 30) return { text: 'History Novice', color: 'text-orange-500' };
    return { text: 'History Beginner', color: 'text-red-500' };
  };
  
  const scoreLevel = getScoreLevel();
  
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4">
      <Card className="glass-card p-6 rounded-xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Award className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-1">Game Complete!</h2>
          <p className={`text-lg font-medium ${scoreLevel.color}`}>
            {scoreLevel.text}
          </p>
          <p className="text-center mt-2">
            Your final score: <span className="font-bold text-primary">{totalScore}</span> out of {maxPossibleScore}
          </p>
        </div>
        
        <h3 className="text-lg font-semibold mb-3">Round Scores:</h3>
        <div className="space-y-3 mb-6">
          {roundScores.map((score, index) => {
            const roundTotal = score.locationScore + score.yearScore - score.hintPenalty;
            return (
              <div key={index} className="bg-secondary/50 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Round {index + 1}</span>
                  <span className="font-bold">{roundTotal} pts</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                  {images[score.image]?.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1 text-primary" />
                    <span>{score.locationScore} pts</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1 text-primary" />
                    <span>{score.yearScore} pts</span>
                  </div>
                </div>
                {(score.locationHintUsed || score.yearHintUsed) && (
                  <div className="flex items-center mt-1 text-xs text-amber-500">
                    <Lightbulb className="h-3 w-3 mr-1" />
                    <span>
                      {score.locationHintUsed && score.yearHintUsed 
                        ? "Used both hints" 
                        : score.locationHintUsed 
                        ? "Used location hint" 
                        : "Used year hint"}
                      {" (-"}
                      {score.hintPenalty}
                      {" pts)"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <Button
          onClick={onPlayAgain}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
        >
          Play Again
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </Card>
    </div>
  );
};

export default GameComplete;
