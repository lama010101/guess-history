
import { useEffect, useState } from 'react';
import GameSection from '@/components/GameSection';
import Navbar from '@/components/Navbar';
import { useGameState } from '@/hooks/useGameState';

const Index = () => {
  const {
    currentRound,
    maxRounds,
    totalScore
  } = useGameState();
  
  // Add a forceUpdateKey to ensure the Navbar updates
  const [forceUpdateKey, setForceUpdateKey] = useState(0);

  // Force the navbar to update when these values change
  useEffect(() => {
    // This is just to force a re-render when important game state changes
    setForceUpdateKey(prevKey => prevKey + 1);
  }, [currentRound, totalScore, maxRounds]);

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar 
        key={forceUpdateKey}
        roundInfo={{
          currentRound,
          maxRounds,
          totalScore
        }} 
      />
      <main className="flex-1 overflow-hidden">
        <GameSection />
      </main>
    </div>
  );
};

export default Index;
