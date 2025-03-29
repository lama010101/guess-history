import React, { useState, useEffect } from 'react';
import './timer-fix.css';

interface GameTimerProps {
  duration: number;
  paused: boolean;
  onTimeUp?: () => void;
  hintsOpen?: boolean;
}

const GameTimer: React.FC<GameTimerProps> = ({ 
  duration, 
  paused, 
  onTimeUp, 
  hintsOpen 
}) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration); // Reset timer when duration prop changes
  }, [duration]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (!paused && timeLeft > 0 && !hintsOpen) {
      intervalId = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      onTimeUp && onTimeUp();
    }

    return () => clearInterval(intervalId);
  }, [paused, timeLeft, onTimeUp, hintsOpen]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-timer-container">
      <span>Time left: {formatTime(timeLeft)}</span>
    </div>
  );
};

export default GameTimer;
