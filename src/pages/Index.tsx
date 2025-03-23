
import { useEffect, useState } from 'react';
import GameSection from '@/components/GameSection';
import Navbar from '@/components/Navbar';
import { useGameState } from '@/hooks/useGameState';

const Index = () => {
  const {
    currentRound,
    maxRounds,
    totalScore,
    gameComplete,
    showResults
  } = useGameState();
  
  // Use state to force navbar updates
  const [navbarKey, setNavbarKey] = useState(0);
  
  // Update navbar when round changes or results are shown/hidden
  useEffect(() => {
    setNavbarKey(prev => prev + 1);
  }, [currentRound, totalScore, gameComplete, showResults]);
  
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar 
        key={navbarKey}
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
