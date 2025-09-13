import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

import { UserSettings, updateUserSettings } from '@/utils/profile/profileService';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useTheme } from 'next-themes';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
// Removed Select imports (language option removed)
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/use-toast';
import { Moon, Sun, Navigation } from "lucide-react";

interface SettingsTabProps {
  userId: string;
  settings: UserSettings;
  isLoading: boolean;
  onSettingsUpdated: () => void;
}

export interface SettingsTabHandle {
  save: () => Promise<void>;
}

const SettingsTab = forwardRef<SettingsTabHandle, SettingsTabProps>(({ 
  userId, 
  settings, 
  isLoading,
  onSettingsUpdated
}, ref) => {
  const { theme, setTheme } = useTheme();
  const [updatedSettings, setUpdatedSettings] = useState<UserSettings>(settings);
  const { soundEnabled, toggleSound, vibrateEnabled, gyroscopeEnabled, toggleVibrate, toggleGyroscope, setDistanceUnit, setMapLabelLanguage, distanceUnit, mapLabelLanguage } = useSettingsStore();
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

  useImperativeHandle(ref, () => ({
    save: handleSaveSettings,
  }));


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
        {/* Theme Setting as inline label + toggle */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-toggle" className="text-history-primary dark:text-history-light mr-4">Theme</Label>
            <div className="flex items-center space-x-3">
              <Switch
                id="theme-toggle"
                checked={(updatedSettings.theme ?? theme) === 'dark'}
                onCheckedChange={(checked) => {
                  const next = checked ? 'dark' : 'light';
                  setUpdatedSettings({ ...updatedSettings, theme: next });
                  setTheme(next);
                }}
              />
              <Label htmlFor="theme-toggle" className="flex items-center">
                {(updatedSettings.theme ?? theme) === 'dark' ? (
                  <><Moon className="h-4 w-4 mr-2" /> Dark</>
                ) : (
                  <><Sun className="h-4 w-4 mr-2" /> Light</>
                )}
              </Label>
            </div>
          </div>
        </div>

        {/* Sound Setting inline */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="sound-toggle" className="text-history-primary dark:text-history-light mr-4">Sound</Label>
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
        </div>

        {/* Vibrate Toggle inline */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="vibrate-toggle" className="text-history-primary dark:text-history-light mr-4">Vibrate</Label>
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
        </div>

        {/* Distance Units */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Distance Units</Label>
          <RadioGroup 
            value={updatedSettings.distance_unit ?? distanceUnit}
            onValueChange={(value) => {
              const v = (value === 'mi' ? 'mi' : 'km') as 'km' | 'mi';
              setUpdatedSettings({...updatedSettings, distance_unit: v});
              setDistanceUnit(v);
            }}
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
                value="mi" 
                id="mi" 
                className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" 
              />
              <Label htmlFor="mi">Miles (mi)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Map Labels Language */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Map Labels</Label>
          <RadioGroup 
            value={(updatedSettings.language ?? (mapLabelLanguage === 'en' ? 'en' : 'local')) as string}
            onValueChange={(value) => {
              const v = value === 'en' ? 'en' : 'local';
              setUpdatedSettings({ ...updatedSettings, language: v });
              setMapLabelLanguage(v as 'en' | 'local');
            }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="local" 
                id="labels-local" 
                className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" 
              />
              <Label htmlFor="labels-local">Local (native script)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem 
                value="en" 
                id="labels-en" 
                className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" 
              />
              <Label htmlFor="labels-en">English only</Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Inertia Enable + Level with inline header */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="inertia-enabled" className="text-history-primary dark:text-history-light mr-4">Panning Inertia</Label>
            <div className="flex items-center gap-3">
              <Switch
                id="inertia-enabled"
                checked={updatedSettings.inertia_enabled !== false}
                onCheckedChange={(checked) => setUpdatedSettings({ ...updatedSettings, inertia_enabled: checked })}
              />
              <Label htmlFor="inertia-enabled">{updatedSettings.inertia_enabled === false ? 'Off' : 'On'}</Label>
            </div>
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

        {/* Gyroscope Toggle inline */}
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="gyroscope-toggle" className="text-history-primary dark:text-history-light mr-4">Gyroscope (Image Panning)</Label>
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
                Panning - From one edge to the other
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipes_recenter" id="inertia-recenter" className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:text-white" />
              <Label htmlFor="inertia-recenter" className="flex items-center">
                <Navigation className="h-4 w-4 mr-2" />
                Panning + recenter - Motion, then auto-center
              </Label>
            </div>
          </RadioGroup>
        </div>
      </div>
    </div>
  );
});

export default SettingsTab;