
import { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/hooks/useGameState';

interface GameTimerProps {
  duration: number; // in seconds
  paused?: boolean;
  onTimeUp?: () => void;
}

const GameTimer = ({ duration, paused = false, onTimeUp }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  const { handleSubmit, showResults } = useGameState();
  const timerRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Reset timer when duration changes
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);
  
  useEffect(() => {
    // Pause timer when paused prop changes or when showing results
    if (paused || showResults) {
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  }, [paused, showResults]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          // Auto-submit when time is up
          handleSubmit();
          onTimeUp?.();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, onTimeUp, handleSubmit]);
  
  // Calculate percentage of time left
  const percentLeft = (timeLeft / duration) * 100;
  
  // Determine color based on time left
  const getTimerColor = () => {
    if (percentLeft <= 10) return 'bg-red-500';
    if (percentLeft <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div className="relative w-full h-2">
      <div 
        className={`absolute left-0 top-0 h-2 transition-all ${getTimerColor()}`}
        style={{ width: `${percentLeft}%` }}
        aria-label={`${timeLeft} seconds remaining`}
      />
      <div className="absolute top-2 right-1 text-xs font-medium">
        {timeLeft} sec
      </div>
    </div>
  );
};

export default GameTimer;
