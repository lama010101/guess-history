
import { RoundScore, HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Calendar, ChevronRight, Lightbulb, Home, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';

interface GameCompleteProps {
  totalScore: number;
  maxRounds: number;
  roundScores: RoundScore[];
  images: HistoricalImage[];
  onPlayAgain: () => void;
}

// Mock friends leaderboard data - in a real app this would come from the backend
const friendsLeaderboard = [
  { username: 'JaneDoe', score: 38250, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
  { username: 'JohnSmith', score: 35600, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
  { username: 'SarahConnor', score: 32400, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
];

const GameComplete = ({ totalScore, maxRounds, roundScores, images, onPlayAgain }: GameCompleteProps) => {
  const maxPossibleScore = maxRounds * 10000;
  
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4 max-h-screen">
      <Card className="glass-card p-6 rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-1">Final Score</h2>
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
        
        {/* Friends Leaderboard */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <Users className="h-5 w-5 mr-2 text-primary" />
            <h3 className="text-lg font-semibold">Friends Leaderboard</h3>
          </div>
          
          <div className="space-y-2">
            {friendsLeaderboard.map((friend, index) => (
              <div key={index} className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg">
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
                    {index + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                    <img src={friend.avatar} alt={friend.username} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-medium">{friend.username}</span>
                </div>
                <span className="font-mono font-semibold">{friend.score.toLocaleString()} pts</span>
              </div>
            ))}
            
            {/* Current user in the leaderboard */}
            <div className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground mr-2">
                  <Trophy className="h-3 w-3" />
                </div>
                <div className="w-8 h-8 rounded-full overflow-hidden mr-2 border-2 border-primary">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=You" alt="You" className="w-full h-full object-cover" />
                </div>
                <span className="font-medium">You</span>
              </div>
              <span className="font-mono font-semibold">{totalScore.toLocaleString()} pts</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
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
          <Button
            onClick={onPlayAgain}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
          >
            Play Again
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default GameComplete;
