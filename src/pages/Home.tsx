
import { useState } from 'react';
import { Globe, Clock, Lightbulb, Users } from 'lucide-react';
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
  const [hintsCount, setHintsCount] = useState<number>(2);
  const [selectedMode, setSelectedMode] = useState<'timer' | 'hints'>('timer');
  const navigate = useNavigate();

  const handleStartGame = () => {
    // Navigate to the game page
    navigate('/play');
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
    id: 'timer' | 'hints', 
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
          <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full">{icon}</div>
          {isSelected && <div className="w-3 h-3 rounded-full bg-primary"></div>}
        </div>
        <CardTitle className="text-xl mt-2">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleStartGame}>
          Start Game
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-gray-900 text-black dark:text-white flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">EventGuesser</h1>
        
        <Tabs defaultValue="play" value={activeTab} onValueChange={(v) => setActiveTab(v as 'play' | 'compete')} className="mb-8">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="play">Play</TabsTrigger>
            <TabsTrigger value="compete">Compete (Login Required)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="play" className="mt-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium">Play as a Guest</h2>
              <p className="text-neutral-500 dark:text-neutral-400">No login required. Your scores won't be saved.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
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
                  
                  {hintsEnabled && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label>Hints per game: {hintsCount}</Label>
                      </div>
                      <Slider 
                        value={[hintsCount]} 
                        min={1} 
                        max={10} 
                        step={1} 
                        onValueChange={(value) => setHintsCount(value[0])}
                      />
                    </div>
                  )}
                  
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Using hints will reduce your score but can help you get unstuck.
                  </p>
                </div>
              </GameModeCard>
            </div>
          </TabsContent>
          
          <TabsContent value="compete" className="mt-6">
            <div className="space-y-8">
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Daily Challenge</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Play today's challenge. Same 5 images as everyone else.</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">One attempt per day</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Timer: 5 minutes</p>
                  </div>
                  <Button onClick={() => navigate('/play')}>Start Daily Challenge</Button>
                </div>
              </div>
              
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
                <h3 className="text-xl font-medium mb-2">Friends Mode</h3>
                <p className="text-neutral-500 dark:text-neutral-400 mb-4">Challenge your friends with a custom game link.</p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="outline" className="flex-1 flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Copy Game Link
                  </Button>
                  <Button className="flex-1 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Invite Friends
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Home;
