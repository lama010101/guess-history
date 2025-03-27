
import { useState, useEffect } from 'react';

interface GameSettings {
  timerEnabled: boolean;
  timerDuration: number; // in seconds
  timerMinutes: number; // in minutes
  maxRounds: number;
  initialHintCoins: number;
}

export const useGameSettings = () => {
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerDuration, setTimerDuration] = useState(60); // Default of 60 seconds
  const [timerPaused, setTimerPaused] = useState(false);
  
  // Load settings from localStorage on first render
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings) {
          if (settings.timerEnabled !== undefined) {
            setTimerEnabled(settings.timerEnabled);
          }
          
          if (settings.timerMinutes) {
            // Convert minutes to seconds for the timer
            setTimerDuration(settings.timerMinutes * 60);
          } else if (settings.timerDuration) {
            setTimerDuration(settings.timerDuration);
          }
        }
      } catch (error) {
        console.error('Error loading game settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  const saveSettings = (newSettings: Partial<GameSettings>) => {
    try {
      const savedSettings = localStorage.getItem('gameSettings');
      const existingSettings = savedSettings ? JSON.parse(savedSettings) : {};
      const updatedSettings = { ...existingSettings, ...newSettings };
      localStorage.setItem('gameSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving game settings:', error);
    }
  };

  return {
    timerEnabled,
    timerDuration,
    timerPaused,
    setTimerEnabled: (value: boolean) => {
      setTimerEnabled(value);
      saveSettings({ timerEnabled: value });
    },
    setTimerDuration: (value: number) => {
      setTimerDuration(value);
      saveSettings({ timerDuration: value });
    },
    setTimerPaused,
  };
};
