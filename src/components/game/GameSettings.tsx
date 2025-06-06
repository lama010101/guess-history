import React, { useEffect, useState } from 'react';
import { Slider } from "@/components/ui/slider";
import { HelpCircle, Clock, Save } from "lucide-react";
import { useGame } from '@/contexts/GameContext';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const GameSettings: React.FC = () => {
  const { hintsAllowed, setHintsAllowed, roundTimerSec, setRoundTimerSec } = useGame();
  const { user } = useAuth();
  
  // Local state for the UI
  const [localHints, setLocalHints] = useState(hintsAllowed);
  const [localTimer, setLocalTimer] = useState(roundTimerSec);
  const [timerEnabled, setTimerEnabled] = useState(roundTimerSec > 0);
  
  // Format time for display in minutes and seconds (e.g., '1m20s' or '2m10s')
  const formatTime = (seconds: number): string => {
    if (seconds === 0) return "No timer";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 
      ? `${minutes}m${remainingSeconds}s`
      : `${minutes}m`;
  };

  // Update context and save to localStorage when values change
  useEffect(() => {
    setHintsAllowed(localHints);
    // Save to localStorage
    const settings = {
      hintsAllowed: localHints,
      roundTimerSec: timerEnabled ? localTimer : 0
    };
    localStorage.setItem('gh_game_settings', JSON.stringify(settings));
  }, [localHints, setHintsAllowed, localTimer, timerEnabled]);

  useEffect(() => {
    // Update the timer in context immediately when it changes
    setRoundTimerSec(timerEnabled ? localTimer : 0);
    console.log("Timer updated in GameSettings:", timerEnabled ? localTimer : 0);
  }, [localTimer, timerEnabled, setRoundTimerSec]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('gh_game_settings');
    if (savedSettings) {
      try {
        const { hintsAllowed, roundTimerSec } = JSON.parse(savedSettings);
        setLocalHints(hintsAllowed);
        setLocalTimer(roundTimerSec);
        setTimerEnabled(roundTimerSec > 0);
      } catch (e) {
        console.error('Error loading saved settings:', e);
      }
    }
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-history-primary dark:text-history-light">Game Settings</h2>
      </div>
      
      {/* Hint Rules */}
      <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="font-semibold text-black dark:text-yellow-100 mb-2">Hint Rules</h3>
        <ul className="text-sm text-black dark:text-yellow-100 space-y-1 list-disc pl-5">
          <li>You can use up to <b>2 hints per round</b> and <b>10 hints per game</b>.</li>
          <li>Each hint costs <b>30 XP or 30% accuracy</b>.</li>
        </ul>
      </div>

      {/* Hints Selector */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-history-primary dark:text-history-light" />
          <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Hints per Game</h3>
          <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">
            {localHints}
          </div>
        </div>
        
        <div className="px-2">
          <Slider
            value={[localHints]}
            min={0}
            max={15}
            step={1}
            onValueChange={(value) => setLocalHints(value[0])}
            className="my-5"
          />
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>0</span>
            <span>5</span>
            <span>10</span>
            <span>15</span>
          </div>
        </div>
      </div>
      
      {/* Timer Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-history-primary dark:text-history-light" />
          <h3 className="text-lg font-semibold text-history-primary dark:text-history-light">Round Timer</h3>
          <div className="ml-auto px-3 py-1 bg-history-secondary/20 rounded-full text-history-secondary font-medium">
            {formatTime(timerEnabled ? localTimer : 0)}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mb-4">
          <Switch 
            id="timer-mode" 
            checked={timerEnabled}
            onCheckedChange={setTimerEnabled}
          />
          <Label htmlFor="timer-mode">
            {timerEnabled ? "Timer enabled" : "No time limit"}
          </Label>
        </div>
        
        {timerEnabled && (
          <div className="px-2">
            <Slider
              value={[localTimer]}
              min={5}
              max={300}
              step={5}
              onValueChange={(value) => setLocalTimer(value[0])}
              className="my-5"
            />
            
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>5s</span>
              <span>30s</span>
              <span>1m</span>
              <span>2m</span>
              <span>3m</span>
              <span>4m</span>
              <span>5m</span>
            </div>
            
            <div className="relative mt-1">
              {[30, 60, 120, 180, 240, 300].map((seconds) => {
                const position = ((seconds - 5) / (300 - 5)) * 100;
                return (
                  <div 
                    key={seconds}
                    className="absolute w-0.5 h-2 bg-gray-400 -mt-3"
                    style={{ left: `${position}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSettings; 