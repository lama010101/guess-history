
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [dailyEvents, setDailyEvents] = useState([]);

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

  // Get today's date in YYYY-MM-DD format
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
    
    // Try to fetch today's daily challenge events
    fetchDailyEvents();
  }, []);
  
  // Update countdown timer every second
  useEffect(() => {
    if (!dailyCompleted || !nextDailyAvailable) return;
    
    const timer = setInterval(() => {
      setCountdown(calculateTimeUntilMidnight());
    }, 1000);
    
    return () => clearInterval(timer);
  }, [dailyCompleted, nextDailyAvailable]);

  // Fetch daily events from Supabase or generate them
  const fetchDailyEvents = async () => {
    try {
      const todayDate = getTodayDateString();
      
      // First check if there's already a daily challenge for today
      const { data: existingGameSession, error: existingError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('game_mode', 'daily')
        .eq('created_at', todayDate)
        .maybeSingle();
        
      if (existingError) {
        console.error('Error checking for existing daily challenge:', existingError);
      }
      
      if (existingGameSession && existingGameSession.events && existingGameSession.events.length > 0) {
        // Use the existing daily challenge
        setDailyEvents(existingGameSession.events);
      } else {
        // Generate a new daily challenge
        // First get 5 random events from the historical_events table
        const { data: eventsData, error: eventsError } = await supabase
          .from('historical_events')
          .select('*')
          .eq('deleted', false)
          .limit(5)
          .order('created_at', { ascending: false })
          .range(0, 4);
          
        if (eventsError) {
          console.error('Error fetching events for daily challenge:', eventsError);
          return;
        }
        
        if (eventsData && eventsData.length >= 5) {
          // Transform events data to match our format
          const transformedEvents = eventsData.map((event, index) => ({
            id: index + 1,
            title: event.location_name || '',
            description: event.description || '',
            year: event.year || 2000,
            location: {
              lat: parseFloat(event.latitude) || 0,
              lng: parseFloat(event.longitude) || 0
            },
            locationName: event.location_name || '',
            country: event.country || '',
            src: event.image_url || 'https://via.placeholder.com/800x500?text=No+Image'
          }));
          
          // Save this as today's daily challenge
          const { error: saveError } = await supabase
            .from('game_sessions')
            .insert({
              game_mode: 'daily',
              created_at: todayDate,
              events: transformedEvents,
              settings: {
                gameMode: 'daily',
                distanceUnit: 'km',
                timerEnabled: true,
                timerDuration: 300 // 5 minutes
              }
            });
            
          if (saveError) {
            console.error('Error saving daily challenge:', saveError);
          }
          
          setDailyEvents(transformedEvents);
        }
      }
    } catch (error) {
      console.error('Error in fetchDailyEvents:', error);
    }
  };

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
    
    // Save score to Supabase
    if (supabase.auth.getSession()) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const userId = data.session.user.id;
          
          supabase
            .from('game_results')
            .insert({
              user_id: userId,
              total_score: score,
              round_results: [],
              session_id: null
            })
            .then(({ error }) => {
              if (error) {
                console.error('Error saving daily score:', error);
              }
            });
        }
      });
    }
    
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
    dailyEvents,
    setDailyGame,
    completeDailyGame
  };
};
