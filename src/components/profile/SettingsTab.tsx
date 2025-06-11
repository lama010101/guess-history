import React, { useState, useEffect } from 'react';
import { UserSettings } from '@/utils/profile/profileService';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Moon, Sun, Monitor } from "lucide-react";
import { useSettingsStore } from '@/lib/useSettingsStore';

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
  const [updatedSettings, setUpdatedSettings] = useState<UserSettings>(settings);
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
      <h3 className="text-lg font-semibold mb-6 text-history-primary dark:text-history-light">Your Settings</h3>
      
      <div className="space-y-6">
        {/* Theme Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Theme</Label>
          <RadioGroup 
            defaultValue={updatedSettings.theme} 
            onValueChange={(value) => 
              setUpdatedSettings({...updatedSettings, theme: value as 'light' | 'dark' | 'system'})
            }
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

        {/* Sound Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Sound</Label>
          <div className="flex items-center space-x-3">
            <Switch
              id="sound-toggle"
              checked={updatedSettings.sound_enabled ?? true}
              onCheckedChange={(checked) => setUpdatedSettings({ ...updatedSettings, sound_enabled: checked })}
            />
            <Label htmlFor="sound-toggle">
              {updatedSettings.sound_enabled ? 'On' : 'Off'}
            </Label>
          </div>
        </div>

        {/* Distance Units Setting */}
        <div>
          <Label className="mb-3 block text-history-primary dark:text-history-light">Distance Units</Label>
          <RadioGroup 
            defaultValue={updatedSettings.distance_unit} 
            onValueChange={(value) => 
              setUpdatedSettings({...updatedSettings, distance_unit: value as 'km' | 'mi'})
            }
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="km" id="km" />
              <Label htmlFor="km">Kilometers (km)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="miles" id="miles" />
              <Label htmlFor="miles">Miles (mi)</Label>
            </div>
          </RadioGroup>
        </div>
        
        {/* Language Setting */}
        <div>
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
        
        <div className="pt-4">
          <Button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full sm:w-auto"
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