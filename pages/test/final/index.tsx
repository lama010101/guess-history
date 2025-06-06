
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Award, Trophy, Share2 } from "lucide-react";

const HISTORICAL_IMAGES = [
  "https://images.unsplash.com/photo-1649972904349-6e44c42644a7",
  "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b",
  "https://images.unsplash.com/photo-1518770660439-4636190af475",
  "https://images.unsplash.com/photo-1461749280684-dccba630e2f6",
  "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d",
];

const TestFinalPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with total score */}
        <div className="text-center mb-12">
          <div className="inline-block p-6 rounded-full bg-history-primary text-white mb-4">
            <Trophy className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-history-primary dark:text-history-light">
            Game Complete!
          </h1>
          <div className="text-2xl font-semibold text-history-secondary">
            Total Score: 1250 pts
          </div>
        </div>

        {/* Rounds Summary */}
        <div className="grid gap-6 mb-8">
          {[1, 2, 3, 4, 5].map((round, index) => (
            <div
              key={round}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              <div className="flex flex-col md:flex-row">
                <div className="md:w-1/3">
                  <img
                    src={HISTORICAL_IMAGES[index]}
                    alt={`Round ${round}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
                <div className="p-6 md:w-2/3">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-history-primary dark:text-history-light">
                      Round {round}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-history-secondary" />
                      <span className="font-semibold text-history-secondary">
                        250 pts
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>Location Accuracy: 92%</div>
                    <div>Time Accuracy: 87%</div>
                    <div>Used Hints: 1</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => navigate("/test")}
            className="bg-history-primary hover:bg-history-primary/90 text-white"
          >
            Play Again
          </Button>
          <Button
            variant="outline"
            className="border-history-secondary text-history-secondary"
            onClick={() => navigate("/test/leaderboard")}
          >
            View Leaderboard
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Results
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestFinalPage;
