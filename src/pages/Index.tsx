
import { useEffect } from 'react';
import GameSection from '@/components/GameSection';
import { useGameState } from '@/hooks/useGameState';

const Index = () => {
  const {
    currentRound,
    maxRounds,
    totalScore,
    timerEnabled,
    timerDuration,
  } = useGameState();
  
  // Note: The Navbar is now rendered inside GameSection for better state management
  
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background text-foreground flex flex-col">
      <main className="flex-1 overflow-hidden">
        <GameSection />
      </main>
    </div>
  );
};

export default Index;
