
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface GameSettings {
  maxLocationScore: number;
  maxYearScore: number;
  locationScalingFactor: number;
  yearScalingFactor: number;
  perfectScoreBonus: number;
  hintPenalty: number;
  initialHintCoins: number;
  maxRoundsPerGame: number;
  timerEnabledByDefault: boolean;
  defaultTimerDuration: number;
}

const AdminGameSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GameSettings>({
    maxLocationScore: 5000,
    maxYearScore: 5000,
    locationScalingFactor: 1,
    yearScalingFactor: 100,
    perfectScoreBonus: 500,
    hintPenalty: 500,
    initialHintCoins: 2,
    maxRoundsPerGame: 5,
    timerEnabledByDefault: false,
    defaultTimerDuration: 60,
  });
  
  // Load settings from localStorage if available
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsedSettings
        }));
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);
  
  const handleChange = (key: keyof GameSettings, value: number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleSaveSettings = () => {
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    toast({
      title: "Settings saved",
      description: "Game settings have been saved successfully."
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Game Settings</h2>
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </div>
      
      <Tabs defaultValue="scoring">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scoring">Scoring</TabsTrigger>
          <TabsTrigger value="game">Game Rules</TabsTrigger>
          <TabsTrigger value="defaults">Default Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="scoring" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Location Scoring</CardTitle>
                <CardDescription>
                  Configure how location accuracy is scored
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxLocationScore">Maximum Location Score</Label>
                  <Input
                    id="maxLocationScore"
                    type="number"
                    value={settings.maxLocationScore}
                    onChange={(e) => handleChange('maxLocationScore', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum points for a perfect location match
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="locationScalingFactor">Location Scaling Factor</Label>
                  <Input
                    id="locationScalingFactor"
                    type="number"
                    value={settings.locationScalingFactor}
                    onChange={(e) => handleChange('locationScalingFactor', parseFloat(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points lost per kilometer away from the correct location
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Year Scoring</CardTitle>
                <CardDescription>
                  Configure how year accuracy is scored
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxYearScore">Maximum Year Score</Label>
                  <Input
                    id="maxYearScore"
                    type="number"
                    value={settings.maxYearScore}
                    onChange={(e) => handleChange('maxYearScore', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum points for a perfect year match
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="yearScalingFactor">Year Scaling Factor</Label>
                  <Input
                    id="yearScalingFactor"
                    type="number"
                    value={settings.yearScalingFactor}
                    onChange={(e) => handleChange('yearScalingFactor', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points lost per year away from the correct year
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Bonuses & Penalties</CardTitle>
                <CardDescription>
                  Configure bonuses and penalties
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="perfectScoreBonus">Perfect Score Bonus</Label>
                  <Input
                    id="perfectScoreBonus"
                    type="number"
                    value={settings.perfectScoreBonus}
                    onChange={(e) => handleChange('perfectScoreBonus', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Bonus points for a perfect match (both location and year)
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="hintPenalty">Hint Penalty</Label>
                  <Input
                    id="hintPenalty"
                    type="number"
                    value={settings.hintPenalty}
                    onChange={(e) => handleChange('hintPenalty', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Points deducted for using a hint
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="game" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Game Structure</CardTitle>
                <CardDescription>
                  Configure general game structure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="maxRoundsPerGame">Rounds Per Game</Label>
                  <Input
                    id="maxRoundsPerGame"
                    type="number"
                    value={settings.maxRoundsPerGame}
                    onChange={(e) => handleChange('maxRoundsPerGame', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of rounds in a standard game
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="initialHintCoins">Initial Hint Coins</Label>
                  <Input
                    id="initialHintCoins"
                    type="number"
                    value={settings.initialHintCoins}
                    onChange={(e) => handleChange('initialHintCoins', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of hint coins players start with
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Timer Settings</CardTitle>
                <CardDescription>
                  Configure timer-related settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="timerEnabledByDefault">Timer Enabled by Default</Label>
                    <p className="text-xs text-muted-foreground">
                      Whether timer is enabled for new games by default
                    </p>
                  </div>
                  <Switch
                    id="timerEnabledByDefault"
                    checked={settings.timerEnabledByDefault}
                    onCheckedChange={(checked) => handleChange('timerEnabledByDefault', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="defaultTimerDuration">Default Timer Duration (seconds)</Label>
                  <Input
                    id="defaultTimerDuration"
                    type="number"
                    value={settings.defaultTimerDuration}
                    onChange={(e) => handleChange('defaultTimerDuration', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default time limit in seconds per round
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="defaults" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reset to Defaults</CardTitle>
              <CardDescription>
                Reset all game settings to default values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive"
                onClick={() => {
                  setSettings({
                    maxLocationScore: 5000,
                    maxYearScore: 5000,
                    locationScalingFactor: 1,
                    yearScalingFactor: 100,
                    perfectScoreBonus: 500,
                    hintPenalty: 500,
                    initialHintCoins: 2,
                    maxRoundsPerGame: 5,
                    timerEnabledByDefault: false,
                    defaultTimerDuration: 60,
                  });
                  
                  toast({
                    title: "Settings reset",
                    description: "Game settings have been reset to defaults."
                  });
                }}
              >
                Reset All Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminGameSettings;
