
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
  
  // Force the navbar to update when game state changes
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar 
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
