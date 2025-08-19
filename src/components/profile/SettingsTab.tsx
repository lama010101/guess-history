import React, { useState, useEffect } from 'react';
import { UserSettings, updateUserSettings } from '@/utils/profile/profileService';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// Removed Select imports (language option removed)
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/use-toast';
import { Settings as SettingsIcon, Moon, Sun, Navigation } from "lucide-react";

interface SettingsTabProps {
  userId: string;
  settings: UserSettings;
  isLoading: boolean;
  onSettingsUpdated: () => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
  userId, 
  settings, 
  isLoading,
  onSettingsUpdated
}) => {
  const { theme, setTheme } = useTheme();
  const [updatedSettings, setUpdatedSettings] = useState<UserSettings>(settings);
  const { soundEnabled, toggleSound, vibrateEnabled, gyroscopeEnabled, toggleVibrate, toggleGyroscope } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const { setTimerSeconds } = useSettingsStore();
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async () => {
    if (saving) return;
    
    try {
      setSaving(true);
      const ok = await updateUserSettings(userId, updatedSettings);
      if (!ok) {
        console.error('Error saving settings via updateUserSettings');
        toast({
          title: "Save failed",
          description: "There was a problem saving your settings. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      
      onSettingsUpdated();
    } catch (error) {
      console.error('Error in handleSaveSettings:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-history-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="glass-card rounded-xl p-6">

      
      <div className="space-y-6">
        {saveSuccess && (
          <div className="border border-green-200 bg-green-50 text-green-800 rounded-md p-3 text-sm">
            Settings saved successfully.
          </div>
        )}
        {/* Theme Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Theme</Label>
          <RadioGroup 
            value={updatedSettings.theme} 
            onValueChange={(value) => {
              setUpdatedSettings({...updatedSettings, theme: value as 'light' | 'dark'});
              setTheme(value as 'light' | 'dark');
            }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="light" className="flex items-center">
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="dark" className="flex items-center">
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Sound Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Sound</Label>
          <div className="flex items-center space-x-3">
            <Switch
              id="sound-toggle"
              checked={updatedSettings.sound_enabled ?? soundEnabled}
              onCheckedChange={(checked) => {
                setUpdatedSettings({ ...updatedSettings, sound_enabled: checked });
                toggleSound(); // Update the global sound state
              }}
            />
            <Label htmlFor="sound-toggle">
              {(updatedSettings.sound_enabled ?? soundEnabled) ? 'On' : 'Off'}
            </Label>
          </div>
        </div>

        {/* Distance Units Setting - Coming Soon */}
        <div className="relative">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <span className="text-sm font-medium text-white">Coming soon...</span>
          </div>
          <div className="opacity-50 pointer-events-none">
            <Label className="mb-3 block text-history-primary dark:text-history-light">Distance Units</Label>
            <RadioGroup 
              defaultValue={updatedSettings.distance_unit} 
              onValueChange={(value) => 
                setUpdatedSettings({...updatedSettings, distance_unit: value as 'km' | 'mi'})
              }
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                    value="km" 
                    id="km" 
                    className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" 
                  />
                <Label htmlFor="km">Kilometers (km)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                    value="miles" 
                    id="miles" 
                    className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" 
                  />
                <Label htmlFor="miles">Miles (mi)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* Inertia Enable + Level */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Panning Inertia</Label>
          <div className="flex items-center gap-3 mb-3">
            <Switch
              id="inertia-enabled"
              checked={updatedSettings.inertia_enabled !== false}
              onCheckedChange={(checked) => setUpdatedSettings({ ...updatedSettings, inertia_enabled: checked })}
            />
            <Label htmlFor="inertia-enabled">{updatedSettings.inertia_enabled === false ? 'Off' : 'On'}</Label>
          </div>
          {updatedSettings.inertia_enabled !== false && (
            <div className="mt-2">
              <Label htmlFor="inertia-level" className="block mb-2">Level: {updatedSettings.inertia_level ?? 3}</Label>
              <input
                id="inertia-level"
                type="range"
                min={1}
                max={5}
                step={1}
                value={updatedSettings.inertia_level ?? 3}
                onChange={(e) => setUpdatedSettings({ ...updatedSettings, inertia_level: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Short</span>
                <span>Long</span>
              </div>
            </div>
          )}
        </div>

        {/* Vibrate Toggle */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Vibrate</Label>
          <div className="flex items-center space-x-3">
            <Switch
              id="vibrate-toggle"
              checked={updatedSettings.vibrate_enabled ?? vibrateEnabled}
              onCheckedChange={(checked) => {
                setUpdatedSettings({ ...updatedSettings, vibrate_enabled: checked });
                if ((vibrateEnabled ?? false) !== checked) toggleVibrate();
              }}
            />
            <Label htmlFor="vibrate-toggle">{(updatedSettings.vibrate_enabled ?? vibrateEnabled) ? 'On' : 'Off'}</Label>
          </div>
        </div>

        {/* Gyroscope Toggle */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Gyroscope (Image Panning)</Label>
          <div className="flex items-center space-x-3">
            <Switch
              id="gyroscope-toggle"
              checked={updatedSettings.gyroscope_enabled ?? gyroscopeEnabled}
              onCheckedChange={(checked) => {
                setUpdatedSettings({ ...updatedSettings, gyroscope_enabled: checked });
                if ((gyroscopeEnabled ?? false) !== checked) toggleGyroscope();
              }}
            />
            <Label htmlFor="gyroscope-toggle">{(updatedSettings.gyroscope_enabled ?? gyroscopeEnabled) ? 'On' : 'Off'}</Label>
          </div>
        </div>

        {/* Inertia Panning Mode */}
        <div className={updatedSettings.inertia_enabled === false ? 'opacity-50 pointer-events-none' : ''}>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Automatic Panning When Round Starts</Label>
          <RadioGroup 
            value={updatedSettings.inertia_mode} 
            onValueChange={(value) => {
              setUpdatedSettings({...updatedSettings, inertia_mode: value as 'none' | 'swipes' | 'swipes_recenter'});
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="inertia-none" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="inertia-none" className="flex items-center">
                <Navigation className="h-4 w-4 mr-2 opacity-50" />
                None - No automatic panning
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipes" id="inertia-swipes" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="inertia-swipes" className="flex items-center">
                <Navigation className="h-4 w-4 mr-2" />
                Swipe - Continued motion after drag
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipes_recenter" id="inertia-recenter" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="inertia-recenter" className="flex items-center">
                <Navigation className="h-4 w-4 mr-2" />
                Swipe + recenter - Motion, then auto-center
              </Label>
            </div>
          </RadioGroup>
        </div>


        
        <div className="pt-4">
          <Button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full sm:w-auto bg-white text-black hover:bg-gray-100 border border-gray-300"
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab; 