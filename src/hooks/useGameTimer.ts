
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useGameTimer = () => {
  const [timeLimit, setTimeLimit] = useState<number>(120); // Default 120 seconds
  const [remainingTime, setRemainingTime] = useState<number>(timeLimit);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const { toast } = useToast();

  // Load timer settings from localStorage if available
  useEffect(() => {
    const savedSettings = localStorage.getItem('gameSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings && typeof settings.timerEnabled === 'boolean') {
          setIsActive(settings.timerEnabled);
        }
        if (settings && typeof settings.timerSeconds === 'number') {
          setTimeLimit(settings.timerSeconds);
          setRemainingTime(settings.timerSeconds);
        }
      } catch (error) {
        console.error('Error loading timer settings:', error);
      }
    }
  }, []);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && !isPaused && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(time => time - 1);
      }, 1000);
    } else if (remainingTime === 0 && isActive) {
      // Time's up!
      toast({
        title: "Time's up!",
        description: "Your time has expired for this round.",
      });
      // Optional: Automatically submit the answer or penalize the score
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isPaused, remainingTime, toast]);

  // Start the timer for a new round
  const startTimer = () => {
    setRemainingTime(timeLimit);
    setIsActive(true);
    setIsPaused(false);
  };

  // Pause the timer (e.g., when showing results)
  const pauseTimer = () => {
    setIsPaused(true);
  };

  // Resume the timer
  const resumeTimer = () => {
    setIsPaused(false);
  };

  // Reset the timer for a new round
  const resetTimer = () => {
    setRemainingTime(timeLimit);
    setIsPaused(false);
  };

  // Update timer settings
  const updateTimerSettings = (enabled: boolean, seconds?: number) => {
    setIsActive(enabled);
    if (seconds) {
      setTimeLimit(seconds);
      setRemainingTime(seconds);
    }
    
    // Save settings to localStorage
    const savedSettings = localStorage.getItem('gameSettings') || '{}';
    try {
      const settings = JSON.parse(savedSettings);
      localStorage.setItem('gameSettings', JSON.stringify({
        ...settings,
        timerEnabled: enabled,
        timerSeconds: seconds || timeLimit
      }));
    } catch (error) {
      console.error('Error saving timer settings:', error);
    }
  };

  return {
    timeLimit,
    remainingTime,
    isActive,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    updateTimerSettings
  };
};
