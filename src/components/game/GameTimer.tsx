
import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GameTimerProps {
  duration: number; // in seconds
  paused: boolean;
  hintsOpen?: boolean;
  onTimeUp: () => void;
}

const GameTimer = ({ duration, paused, hintsOpen = false, onTimeUp }: GameTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number | null>(null);
  const timeUpFiredRef = useRef(false);

  // Initialize timer
  useEffect(() => {
    setTimeRemaining(duration);
    setProgress(100);
    lastUpdateRef.current = Date.now();
    timeUpFiredRef.current = false;
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [duration]);

  // Handle timer logic
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Don't set up timer if it's paused
    if (paused) {
      // Store the current time when paused to calculate elapsed time accurately later
      lastUpdateRef.current = Date.now();
      return;
    }
    
    // Set up a new timer that updates every 100ms for smoother progress bar
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = lastUpdateRef.current ? (now - lastUpdateRef.current) / 1000 : 0;
      lastUpdateRef.current = now;
      
      setTimeRemaining(prev => {
        const newTime = Math.max(0, prev - elapsed);
        setProgress((newTime / duration) * 100);
        
        // Time's up - only fire the callback once
        if (newTime <= 0 && !timeUpFiredRef.current) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          timeUpFiredRef.current = true;
          onTimeUp();
        }
        
        return newTime;
      });
    }, 100);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [paused, duration, onTimeUp]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Apply warning colors based on remaining time
  const getColorClass = () => {
    const percentage = (timeRemaining / duration) * 100;
    if (percentage < 25) return 'text-red-500';
    if (percentage < 50) return 'text-orange-500';
    return 'text-primary';
  };

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1.5" />
          <span className="text-sm font-medium">Time Remaining:</span>
        </div>
        <span className={`font-mono text-sm font-medium ${getColorClass()}`}>
          {formatTime(timeRemaining)}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
};

export default GameTimer;
