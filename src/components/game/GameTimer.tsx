
import { useState, useEffect, useRef } from 'react';
import { useGameState } from '@/hooks/useGameState';

interface GameTimerProps {
  duration: number; // in seconds
  paused?: boolean;
  onTimeUp?: () => void;
  hintsOpen?: boolean; // Added prop for when hints are open
}

const GameTimer = ({ duration, paused = false, onTimeUp, hintsOpen = false }: GameTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isRunning, setIsRunning] = useState(true);
  const { handleSubmit, showResults } = useGameState();
  const timerRef = useRef<number | null>(null);
  
  // Reset timer when duration changes
  useEffect(() => {
    setTimeLeft(duration);
    setIsRunning(true);
  }, [duration]);

  // Stop timer when paused, hints are open, or results are showing
  useEffect(() => {
    if (paused || hintsOpen || showResults) {
      setIsRunning(false);
    } else {
      setIsRunning(true);
    }
  }, [paused, hintsOpen, showResults]);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning) return;
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          // Call handleSubmit to end the round when timer reaches zero
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
      }
    };
  }, [isRunning, onTimeUp, handleSubmit]);

  const percentLeft = (timeLeft / duration) * 100;

  const getTimerColor = () => {
    if (percentLeft <= 10) return 'bg-red-500';
    if (percentLeft <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="relative w-full">
      <div className="flex justify-between items-center mb-1">
        <div className="absolute right-0 top-0 text-xs font-medium">
          {timeLeft} sec
        </div>
      </div>
      <div className="relative w-full h-2">
        <div 
          className={`absolute left-0 top-0 h-2 transition-all ${getTimerColor()}`}
          style={{ width: `${percentLeft}%` }}
          aria-label={`${timeLeft} seconds remaining`}
        />
      </div>
    </div>
  );
};

export default GameTimer;
