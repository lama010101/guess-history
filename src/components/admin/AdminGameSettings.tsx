
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameSettings {
  maxLocationScore: number;
  locationScalingFactor: number;
  maxYearScore: number;
  yearScalingFactor: number;
  maxRoundsPerGame: number;
  initialHintCoins: number;
  hintPenalty: number;
  perfectScoreBonus: number;
}

const AdminGameSettings = () => {
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<GameSettings>({
    maxLocationScore: 5000,
    locationScalingFactor: 1,
    maxYearScore: 5000,
    yearScalingFactor: 100,
    maxRoundsPerGame: 5,
    initialHintCoins: 10,
    hintPenalty: 500,
    perfectScoreBonus: 500
  });
  
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);

  const handleInputChange = (key: keyof GameSettings, value: string) => {
    setSettings({
      ...settings,
      [key]: Number(value)
    });
    // Reset saved state when changes are made
    setSaved(false);
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    
    // Show saved confirmation
    setSaved(true);
    
    toast({
      title: "Settings Saved",
      description: "Game settings have been updated successfully. Refresh to apply changes.",
    });
    
    // Reset saved state after a delay
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Game Parameters</CardTitle>
          <CardDescription>
            Configure scoring and game mechanics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location Scoring */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Location Scoring</h3>
              
              <div className="space-y-2">
                <Label htmlFor="max-location-score">Maximum Location Score</Label>
                <Input 
                  id="max-location-score"
                  type="number"
                  value={settings.maxLocationScore}
                  onChange={(e) => handleInputChange("maxLocationScore", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum points for a perfect location guess
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="location-scaling">Location Scaling Factor</Label>
                <Input 
                  id="location-scaling"
                  type="number"
                  step="0.1"
                  value={settings.locationScalingFactor}
                  onChange={(e) => handleInputChange("locationScalingFactor", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Points deducted per kilometer of distance error
                </p>
              </div>
            </div>
            
            {/* Year Scoring */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Year Scoring</h3>
              
              <div className="space-y-2">
                <Label htmlFor="max-year-score">Maximum Year Score</Label>
                <Input 
                  id="max-year-score"
                  type="number"
                  value={settings.maxYearScore}
                  onChange={(e) => handleInputChange("maxYearScore", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Maximum points for guessing the exact year
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year-scaling">Year Scaling Factor</Label>
                <Input 
                  id="year-scaling"
                  type="number"
                  value={settings.yearScalingFactor}
                  onChange={(e) => handleInputChange("yearScalingFactor", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Points deducted per year of difference
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t my-6"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Game Structure */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Game Structure</h3>
              
              <div className="space-y-2">
                <Label htmlFor="max-rounds">Maximum Rounds Per Game</Label>
                <Input 
                  id="max-rounds"
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxRoundsPerGame}
                  onChange={(e) => handleInputChange("maxRoundsPerGame", e.target.value)}
                />
              </div>
            </div>
            
            {/* Bonuses & Penalties */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Bonuses & Penalties</h3>
              
              <div className="space-y-2">
                <Label htmlFor="initial-coins">Initial Hint Coins</Label>
                <Input 
                  id="initial-coins"
                  type="number"
                  value={settings.initialHintCoins}
                  onChange={(e) => handleInputChange("initialHintCoins", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="hint-penalty">Hint Usage Penalty</Label>
                <Input 
                  id="hint-penalty"
                  type="number"
                  value={settings.hintPenalty}
                  onChange={(e) => handleInputChange("hintPenalty", e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="perfect-bonus">Perfect Score Bonus</Label>
                <Input 
                  id="perfect-bonus"
                  type="number"
                  value={settings.perfectScoreBonus}
                  onChange={(e) => handleInputChange("perfectScoreBonus", e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Bonus points for a perfect location & year guess
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="ml-auto" onClick={handleSaveSettings}>
            {saved ? (
              <>
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminGameSettings;
