
import { RoundScore, HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';

interface GameCompleteProps {
  totalScore: number;
  maxRounds: number;
  roundScores: RoundScore[];
  images: HistoricalImage[];
  onPlayAgain: () => void;
}

const GameComplete = ({ totalScore, maxRounds, roundScores, images, onPlayAgain }: GameCompleteProps) => {
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4">
      <div className="glass-card p-6 rounded-xl max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-4">Game Complete!</h2>
        <p className="text-center mb-6">
          Your final score: <span className="font-bold text-primary">{totalScore}</span> out of {maxRounds * 10000}
        </p>
        
        <h3 className="text-lg font-semibold mb-2">Round Scores:</h3>
        <div className="space-y-2 mb-6">
          {roundScores.map((score, index) => (
            <div key={index} className="flex justify-between items-center p-2 border-b">
              <div>
                <span className="font-medium">Round {index + 1}: </span>
                <span>{images[score.image].description}</span>
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
          onClick={onPlayAgain}
          className="w-full"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
};

export default GameComplete;
