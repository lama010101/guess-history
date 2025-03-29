
import { useState, useEffect } from 'react';

interface DailyLimitState {
  lastPlayed: string | null;
  canPlayDaily: boolean;
  todayScore: number | null;
  timeUntilNextReset: number; // milliseconds until next day
}

export const useDailyLimit = () => {
  const [dailyState, setDailyState] = useState<DailyLimitState>({
    lastPlayed: null,
    canPlayDaily: true,
    todayScore: null,
    timeUntilNextReset: 0
  });

  // Check if the user can play today's challenge
  useEffect(() => {
    const checkDailyLimit = () => {
      const storedData = localStorage.getItem('dailyGameLimit');
      
      if (storedData) {
        try {
          const data = JSON.parse(storedData);
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Check if the user has already played today
          if (data.lastPlayed === today) {
            // Calculate time until next day reset (midnight)
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            const timeRemaining = tomorrow.getTime() - now.getTime();
            
            setDailyState({
              lastPlayed: today,
              canPlayDaily: false,
              todayScore: data.score || null,
              timeUntilNextReset: timeRemaining
            });
          } else {
            // User hasn't played today
            setDailyState({
              lastPlayed: data.lastPlayed,
              canPlayDaily: true,
              todayScore: null,
              timeUntilNextReset: 0
            });
          }
        } catch (error) {
          console.error('Error parsing daily limit data:', error);
          resetDailyLimit();
        }
      } else {
        // No stored data, user can play
        resetDailyLimit();
      }
    };
    
    checkDailyLimit();
    
    // Set up a timer to check the daily limit every minute
    const intervalId = setInterval(() => {
      checkDailyLimit();
    }, 60000); // every minute
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Record that the user has played today
  const recordDailyPlay = (score: number) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Calculate time until next day reset (midnight)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const timeRemaining = tomorrow.getTime() - now.getTime();
    
    // Update local state
    setDailyState({
      lastPlayed: today,
      canPlayDaily: false,
      todayScore: score,
      timeUntilNextReset: timeRemaining
    });
    
    // Save to localStorage
    localStorage.setItem('dailyGameLimit', JSON.stringify({
      lastPlayed: today,
      score: score
    }));
  };
  
  // Reset the daily limit (e.g., for testing)
  const resetDailyLimit = () => {
    setDailyState({
      lastPlayed: null,
      canPlayDaily: true,
      todayScore: null,
      timeUntilNextReset: 0
    });
    
    localStorage.removeItem('dailyGameLimit');
  };
  
  return {
    ...dailyState,
    recordDailyPlay,
    resetDailyLimit
  };
};
