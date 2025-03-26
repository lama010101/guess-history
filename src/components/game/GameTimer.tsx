
import { useState, useEffect, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface GameTimerProps {
  duration: number;
  paused: boolean;
  hintsOpen?: boolean;
  onTimeUp: () => void;
}

const GameTimer = ({ duration, paused, hintsOpen, onTimeUp }: GameTimerProps) => {
  const [secondsLeft, setSecondsLeft] = useState(duration);
  const [progress, setProgress] = useState(100);
  const initialDuration = useRef(duration);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update duration if it changes from props
  useEffect(() => {
    initialDuration.current = duration;
    setSecondsLeft(duration);
    setProgress(100);
  }, [duration]);
  
  useEffect(() => {
    if (paused) {
      // If paused, clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    // Create a new timer
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          // Time's up, clear interval and call onTimeUp
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [paused, onTimeUp]);
  
  // Update progress bar
  useEffect(() => {
    const progressValue = (secondsLeft / initialDuration.current) * 100;
    setProgress(progressValue);
  }, [secondsLeft]);
  
  // Format time as MM:SS
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`relative w-full ${hintsOpen ? 'opacity-30' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-primary" />
        <div className="flex-1 flex justify-between items-center">
          <span className="text-sm font-medium">Time Remaining</span>
          <span className="text-sm font-mono">{formatTime(secondsLeft)}</span>
        </div>
      </div>
      
      <Progress 
        value={progress} 
        className="h-2" 
        indicatorClassName={`${progress < 20 ? 'bg-red-500' : progress < 50 ? 'bg-yellow-500' : 'bg-primary'}`}
      />
    </div>
  );
};

export default GameTimer;
