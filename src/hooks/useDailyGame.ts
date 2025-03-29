
import { useState, useEffect } from 'react';

interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

export const useDailyGame = () => {
  const [isDaily, setIsDaily] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");
  const [countdown, setCountdown] = useState<CountdownTime>({ hours: 0, minutes: 0, seconds: 0 });
  const [nextDailyAvailable, setNextDailyAvailable] = useState<Date | null>(null);

  // Calculate time until midnight for the next daily challenge
  const calculateTimeUntilMidnight = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diffMs = tomorrow.getTime() - now.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  };

  // Load daily game state on mount
  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    const dailyCompleted = localStorage.getItem('dailyCompleted');
    
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      setDailyDate(lastPlayedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      // Check if played today
      const today = new Date();
      const isSameDay = lastPlayedDate.getDate() === today.getDate() && 
                       lastPlayedDate.getMonth() === today.getMonth() && 
                       lastPlayedDate.getFullYear() === today.getFullYear();
      
      // Only mark as completed if the daily game was actually completed
      setDailyCompleted(isSameDay && dailyCompleted === 'true');
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
      
      // Set next daily available time
      if (isSameDay) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        setNextDailyAvailable(tomorrow);
        
        // Initial countdown
        setCountdown(calculateTimeUntilMidnight());
      }
    }
  }, []);
  
  // Update countdown timer every second
  useEffect(() => {
    if (!dailyCompleted || !nextDailyAvailable) return;
    
    const timer = setInterval(() => {
      setCountdown(calculateTimeUntilMidnight());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [dailyCompleted, nextDailyAvailable]);

  const setDailyGame = (active: boolean) => {
    setIsDaily(active);
    if (active) {
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
      // Remove completed flag when starting a new daily game
      localStorage.removeItem('dailyCompleted');
    }
  };

  const completeDailyGame = (score: number) => {
    setDailyCompleted(true);
    setDailyScore(score);
    localStorage.setItem('lastDailyScore', score.toString());
    localStorage.setItem('dailyCompleted', 'true');
    
    // Set next daily available time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    setNextDailyAvailable(tomorrow);
    
    // Initial countdown
    setCountdown(calculateTimeUntilMidnight());
  };

  return {
    isDaily,
    dailyCompleted,
    dailyScore,
    dailyDate,
    countdown,
    setDailyGame,
    completeDailyGame
  };
};
