
import GameSection from '@/components/GameSection';
import Navbar from '@/components/Navbar';

const Index = () => {
  const roundInfo = {
    currentRound: 1,
    maxRounds: 5,
    totalScore: 0
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
