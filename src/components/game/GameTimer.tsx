
import { useState, useEffect } from 'react';
import { useGameState } from '@/hooks/useGameState';

interface GameTimerProps {
  duration: number; // in seconds
  paused?: boolean;
  onTimeUp?: () => void;
}

const GameTimer = ({ duration, paused = false, onTimeUp }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  const { handleSubmit } = useGameState();
  
  useEffect(() => {
    // Reset timer when duration changes
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);
  
  useEffect(() => {
    if (paused) {
      setIsRunning(false);
      return;
    }
    setIsRunning(true);
  }, [paused]);
  
  useEffect(() => {
    if (!isRunning) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          // Auto-submit when time is up
          handleSubmit();
          onTimeUp?.();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
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
