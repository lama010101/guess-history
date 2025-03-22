
import GameSection from '@/components/GameSection';
import Navbar from '@/components/Navbar';
import { useGameState } from '@/hooks/useGameState';

const Index = () => {
  const {
    currentRound,
    maxRounds,
    totalScore
  } = useGameState();

  const roundInfo = {
    currentRound,
    maxRounds,
    totalScore
  };

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex flex-col">
      <Navbar roundInfo={roundInfo} />
      <main className="flex-1 overflow-hidden">
        <GameSection />
      </main>
    </div>
  );
};

export default Index;
