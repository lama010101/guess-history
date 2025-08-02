import React, { useState, useEffect } from 'react';
import { UserSettings } from '@/utils/profile/profileService';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useTheme } from 'next-themes';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Moon, Sun, Monitor } from "lucide-react";

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
  const { soundEnabled, toggleSound } = useSettingsStore();
  const [saving, setSaving] = useState(false);
  const { setTimerSeconds } = useSettingsStore();

  const handleSaveSettings = async () => {
    if (saving) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          id: `user_settings_${userId}`,
          value: updatedSettings as any, // Type assertion to handle the JSON type
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving settings:', error);
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
        {/* Theme Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Theme</Label>
          <RadioGroup 
            value={updatedSettings.theme} 
            onValueChange={(value) => {
              setUpdatedSettings({...updatedSettings, theme: value as 'light' | 'dark' | 'system'});
              setTheme(value as 'light' | 'dark' | 'system');
            }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light" className="flex items-center">
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark" className="flex items-center">
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system" className="flex items-center">
                <Monitor className="h-4 w-4 mr-2" />
                System
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Sound Setting - Coming Soon */}
        <div className="relative">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <span className="text-sm font-medium text-white">Coming soon...</span>
          </div>
          <div className="opacity-50 pointer-events-none">
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
                {updatedSettings.sound_enabled ? 'On' : 'Off'}
              </Label>
            </div>
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
                    className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500" 
                  />
                <Label htmlFor="km">Kilometers (km)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem 
                    value="miles" 
                    id="miles" 
                    className="border-gray-400 data-[state=checked]:border-orange-500 data-[state=checked]:bg-orange-500" 
                  />
                <Label htmlFor="miles">Miles (mi)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        {/* Language Setting - Coming Soon */}
        <div className="relative">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
            <span className="text-sm font-medium text-white">Coming soon...</span>
          </div>
          <div className="opacity-50 pointer-events-none">
            <Label htmlFor="language" className="mb-3 block text-history-primary dark:text-history-light">Language</Label>
            <Select 
              defaultValue={updatedSettings.language}
              onValueChange={(value) => setUpdatedSettings({...updatedSettings, language: value})}
            >
              <SelectTrigger className="w-full sm:w-[240px]" id="language">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>
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