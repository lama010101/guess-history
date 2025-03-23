
import { useState, useEffect } from 'react';

interface GameTimerProps {
  duration: number; // in seconds
  paused?: boolean;
  onTimeUp?: () => void;
}

const GameTimer = ({ duration, paused = false, onTimeUp }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  
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
          onTimeUp?.();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isRunning, onTimeUp]);
  
  // Calculate percentage of time left
  const percentLeft = (timeLeft / duration) * 100;
  
  // Determine color based on time left
  const getTimerClass = () => {
    if (percentLeft <= 10) return 'game-timer danger';
    if (percentLeft <= 30) return 'game-timer warning';
    return 'game-timer';
  };
  
  return (
    <div 
      className={getTimerClass()} 
      style={{ width: `${percentLeft}%` }}
      aria-label={`${timeLeft} seconds remaining`}
    />
  );
};

export default GameTimer;
