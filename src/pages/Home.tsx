
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/services/auth';
import PlayWithFriendsDialog from '@/components/PlayWithFriendsDialog';
import { useDailyGame } from '@/hooks/useDailyGame';
import DailyCountdown from '@/components/DailyCountdown';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const [showFriendsDialog, setShowFriendsDialog] = useState(false);
  const { dailyCompleted, dailyScore, countdown, dailyDate, setDailyGame } = useDailyGame();

  useEffect(() => {
    if (dailyCompleted) {
      setDailyGame(false);
    }
  }, [dailyCompleted, setDailyGame]);

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold mb-4">Welcome to GeoGuess!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Explore the world, one location at a time.
        </p>
        
        {isAuthenticated ? (
          <>
            <p className="mb-4">
              Hello, {user?.username}! Ready for a new adventure?
            </p>
            
            <div className="space-x-4">
              <Link to="/play">
                <Button variant="default" size="lg">
                  Start New Game
                </Button>
              </Link>
              <Button variant="secondary" size="lg" onClick={() => setShowFriendsDialog(true)}>
                Play with Friends
              </Button>
            </div>
          </>
        ) : (
          <p className="mb-4">
            <Link to="/profile">
              <Button variant="default" size="lg">
                Sign Up to Play
              </Button>
            </Link>
          </p>
        )}
      </section>
      
      {dailyCompleted && (
        <DailyCountdown 
          score={dailyScore}
          countdown={countdown}
        />
      )}
      
      {/* Friends Dialog */}
      {showFriendsDialog && (
        <PlayWithFriendsDialog 
          open={showFriendsDialog}
          onOpenChange={setShowFriendsDialog}
        />
      )}
    </div>
  );
};

export default Home;
