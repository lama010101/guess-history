import React from "react";
import { useTheme } from "next-themes";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SunIcon, MoonIcon, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSettingsStore } from "@/lib/useSettingsStore";
import { useAuth } from "@/contexts/AuthContext";

const TestSettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { soundEnabled, enableSound, disableSound } = useSettingsStore();
  const { user } = useAuth();

  // Sync settings to database when user saves preferences
  const handleSoundToggle = (checked: boolean) => {
    if (checked) {
      enableSound();
    } else {
      disableSound();
    }
    
    if (user && !user.isGuest) {
      useSettingsStore.getState().syncToSupabase(user.id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pt-8">
      <h1 className="text-2xl font-bold mb-8 text-history-primary">Settings</h1>
      
      <div className="space-y-8">
        <div className="glass-card rounded-xl p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-history-primary">Theme</h2>
              <RadioGroup
                defaultValue={theme}
                onValueChange={(value) => setTheme(value)}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="light"
                    id="theme-light"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <SunIcon className="h-8 w-8 mb-2 text-history-primary" />
                    Light
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="dark"
                    id="theme-dark"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="theme-dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-background p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <MoonIcon className="h-8 w-8 mb-2 text-history-primary" />
                    Dark
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-xl p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4 text-history-primary">Sound</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {soundEnabled ? (
                    <Volume2 className="h-6 w-6 text-history-primary" />
                  ) : (
                    <VolumeX className="h-6 w-6 text-history-primary" />
                  )}
                  <Label htmlFor="sound-toggle" className="text-sm font-medium">
                    Enable Sounds
                  </Label>
                </div>
                <Switch
                  id="sound-toggle"
                  checked={soundEnabled}
                  onCheckedChange={handleSoundToggle}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestSettingsPage;
