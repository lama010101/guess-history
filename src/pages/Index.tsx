
import GameSection from '@/components/GameSection';

const Index = () => {
  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-background flex flex-col">
      <main className="flex-1 overflow-hidden">
        <GameSection />
      </main>
    </div>
  );
};

export default Index;
