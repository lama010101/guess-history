
import { useState, useEffect } from 'react';

export const useDailyGame = () => {
  const [isDaily, setIsDaily] = useState(false);
  const [dailyCompleted, setDailyCompleted] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyDate, setDailyDate] = useState("");

  useEffect(() => {
    const lastPlayed = localStorage.getItem('lastDailyPlayed');
    const savedScore = localStorage.getItem('lastDailyScore');
    
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
      
      setDailyCompleted(isSameDay);
      
      if (savedScore) {
        setDailyScore(parseInt(savedScore, 10));
      }
    }
  }, []);

  const setDailyGame = (active: boolean) => {
    setIsDaily(active);
    if (active) {
      localStorage.setItem('lastDailyPlayed', new Date().toISOString());
    }
  };

  const completeDailyGame = (score: number) => {
    setDailyCompleted(true);
    setDailyScore(score);
    localStorage.setItem('lastDailyScore', score.toString());
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
