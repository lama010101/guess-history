
import { useState, useEffect } from 'react';

export const useDailyGame = () => {
  const [isDaily, setIsDaily] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");

  useEffect(() => {
    // Check if the session has a flag to start a daily game
    const startingDailyGame = sessionStorage.getItem('startingDailyGame') === 'true';
    if (startingDailyGame) {
      setIsDaily(true);
      // Remove the flag after reading it
      sessionStorage.removeItem('startingDailyGame');
    }
    
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    const dailyCompleted = localStorage.getItem('dailyGameCompleted');
    
    if (lastPlayed) {
      const lastPlayedDate = new Date(lastPlayed);
      setDailyDate(lastPlayedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }));
      
      // Check if played today and completed
      const today = new Date();
      const isSameDay = lastPlayedDate.getDate() === today.getDate() && 
                       lastPlayedDate.getMonth() === today.getMonth() && 
                       lastPlayedDate.getFullYear() === today.getFullYear();
      
      // Only set as completed if explicitly marked as completed
      setDailyCompleted(isSameDay && dailyCompleted === 'true');
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
    }
  }, []);

  const setDailyGame = (active: boolean) => {
    setIsDaily(active);
    if (active) {
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
      // Reset the completed flag when starting a new daily game
      localStorage.removeItem('dailyGameCompleted');
    }
  };

  const completeDailyGame = (score: number) => {
    setDailyCompleted(true);
    setDailyScore(score);
    localStorage.setItem('lastDailyScore', score.toString());
    localStorage.setItem('dailyGameCompleted', 'true');
  };

  return {
    isDaily,
    dailyCompleted,
    dailyScore,
    dailyDate,
    setDailyGame,
    completeDailyGame
  };
};
