
import { RoundScore, HistoricalImage } from '@/types/game';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ChevronRight, Lightbulb, Home, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GameCompleteProps {
  totalScore: number;
  maxRounds: number;
  roundScores: RoundScore[];
  images: HistoricalImage[];
  onPlayAgain?: () => void;
  isDaily?: boolean;
}

// Mock friends leaderboard data - in a real app this would come from the backend
const friendsLeaderboard = [
  { username: 'JaneDoe', score: 38250, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
  { username: 'JohnSmith', score: 35600, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
  { username: 'SarahConnor', score: 32400, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
];

// Mock daily leaderboard
const dailyLeaderboard = [
  { username: 'AlexMax', score: 42800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { username: 'JaneDoe', score: 38250, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane' },
  { username: 'JohnSmith', score: 35600, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
];

// Mock global leaderboard
const globalLeaderboard = [
  { username: 'TomWizard', score: 156800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom' },
  { username: 'AlexMax', score: 142800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { username: 'SarahConnor', score: 132400, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
];

const GameComplete = ({ totalScore, maxRounds, roundScores, images, onPlayAgain, isDaily }: GameCompleteProps) => {
  const renderLeaderboard = (data: typeof friendsLeaderboard, title: string) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {data.map((player, index) => (
        <div key={index} className="flex items-center justify-between bg-secondary/30 p-3 rounded-lg">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary mr-2">
              {index + 1}
            </div>
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
              <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
            </div>
            <span className="font-medium">{player.username}</span>
          </div>
          <span className="font-mono font-semibold">{player.score.toLocaleString()} pts</span>
        </div>
      ))}
      
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
  );
  
  return (
    <div className="relative flex-1 flex flex-col items-center justify-center p-4 max-h-full h-full">
      <div className="glass-card p-6 rounded-xl max-w-md w-full h-[80vh] overflow-y-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">Final Score</h2>
          <div className="text-4xl font-bold text-primary">{totalScore.toLocaleString()}</div>
        </div>
        
        <Tabs defaultValue="rounds" className="mt-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="rounds">Round Scores</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="rounds" className="pt-4">
            <div className="space-y-3">
              {roundScores.map((score, index) => {
                const roundTotal = score.locationScore + score.yearScore - score.hintPenalty;
                const currentImage = images[score.image];
                return (
                  <div key={index} className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Round {index + 1}</span>
                      <span className="font-bold">{roundTotal} pts</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {currentImage?.title || currentImage?.description || "Historical Event"}
                    </p>
                    
                    {/* Show event image */}
                    {currentImage?.src && (
                      <div className="w-full h-20 overflow-hidden rounded-md mb-2">
                        <img 
                          src={currentImage.src} 
                          alt={currentImage.title || "Event"} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
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
                            ? "Used country hint" 
                            : "Used decade hint"}
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
          </TabsContent>
          
          <TabsContent value="leaderboard" className="pt-4">
            <Tabs defaultValue={isDaily ? "daily" : "friends"}>
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="friends">Friends</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="global">Global</TabsTrigger>
              </TabsList>
              
              <TabsContent value="friends" className="pt-4">
                {renderLeaderboard(friendsLeaderboard, "Friends Leaderboard")}
              </TabsContent>
              
              <TabsContent value="daily" className="pt-4">
                {renderLeaderboard(dailyLeaderboard, "Daily Leaderboard")}
              </TabsContent>
              
              <TabsContent value="global" className="pt-4">
                {renderLeaderboard(globalLeaderboard, "Global Leaderboard")}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2 mt-6">
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
          
          {onPlayAgain && !isDaily && (
            <Button
              onClick={onPlayAgain}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center"
            >
              Play Again
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameComplete;
