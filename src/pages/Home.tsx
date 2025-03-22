
import { useState } from 'react';
import { Globe, Clock, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

const Home = () => {
  const [activeTab, setActiveTab] = useState<'play' | 'compete'>('play');
  const [timerMinutes, setTimerMinutes] = useState<number>(5);
  const [hintsEnabled, setHintsEnabled] = useState<boolean>(true);
  const [selectedMode, setSelectedMode] = useState<'classic' | 'timer' | 'hints'>('classic');
  const navigate = useNavigate();

  const handleStartGame = () => {
    // In a real app, we would set up game configuration here
    // For now, just navigate to the game page
    navigate('/');
  };

  const GameModeCard = ({ 
    id, 
    title, 
    description, 
    icon, 
    isSelected, 
    onClick,
    children
  }: { 
    id: 'classic' | 'timer' | 'hints', 
    title: string, 
    description: string, 
    icon: React.ReactNode, 
    isSelected: boolean, 
    onClick: () => void,
    children?: React.ReactNode
  }) => (
    <Card 
      className={`cursor-pointer transition-all ${isSelected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="p-2 bg-muted rounded-full">{icon}</div>
          {isSelected && <div className="w-3 h-3 rounded-full bg-primary"></div>}
        </div>
        <CardTitle className="text-xl mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      {id === 'classic' && (
        <CardFooter>
          <Button className="w-full" onClick={handleStartGame}>
            Start Game
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">EventGuesser</h1>
        
        <Tabs defaultValue="play" value={activeTab} onValueChange={(v) => setActiveTab(v as 'play' | 'compete')} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="play">Play (Guest Mode)</TabsTrigger>
            <TabsTrigger value="compete">Compete (Login Required)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="play" className="mt-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium">Play as a Guest</h2>
              <p className="text-muted-foreground">No login required. Your scores won't be saved.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="compete" className="mt-6">
            <div className="space-y-8">
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Daily Challenge</h3>
                <p className="text-muted-foreground mb-4">Play today's challenge. Same 5 images as everyone else.</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">One attempt per day</p>
                    <p className="text-sm text-muted-foreground">Timer: 5 minutes</p>
                  </div>
                  <Button>Start Daily Challenge</Button>
                </div>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Friends Mode</h3>
                <p className="text-muted-foreground mb-4">Challenge your friends with a custom game link.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="flex-1">Copy Game Link</Button>
                  <Button className="flex-1">Invite Friends</Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <GameModeCard
            id="classic"
            title="Classic"
            description="Standard game of 5 rounds."
            icon={<Globe className="h-6 w-6" />}
            isSelected={selectedMode === 'classic'}
            onClick={() => setSelectedMode('classic')}
          />
          
          <GameModeCard
            id="timer"
            title="Timer"
            description="Race against the clock."
            icon={<Clock className="h-6 w-6" />}
            isSelected={selectedMode === 'timer'}
            onClick={() => setSelectedMode('timer')}
          >
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Time Limit: {timerMinutes} minutes</Label>
                </div>
                <Slider 
                  value={[timerMinutes]} 
                  min={1} 
                  max={10} 
                  step={1} 
                  onValueChange={(value) => setTimerMinutes(value[0])}
                  disabled={activeTab === 'compete'}
                />
              </div>
              <Button className="w-full" onClick={handleStartGame}>
                Start Timed Game
              </Button>
            </div>
          </GameModeCard>
          
          <GameModeCard
            id="hints"
            title="Hints"
            description="Enable hints to get help during the game."
            icon={<Lightbulb className="h-6 w-6" />}
            isSelected={selectedMode === 'hints'}
            onClick={() => setSelectedMode('hints')}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hints-toggle">Enable Hints</Label>
                <Switch 
                  id="hints-toggle" 
                  checked={hintsEnabled} 
                  onCheckedChange={setHintsEnabled} 
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Using hints will reduce your score but can help you get unstuck.
              </p>
              <Button className="w-full" onClick={handleStartGame}>
                Start with Hints
              </Button>
            </div>
          </GameModeCard>
        </div>
      </main>
    </div>
  );
};

export default Home;
