
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useDailyGame } from '@/hooks/useDailyGame';

interface DailyCountdownProps {
  score: number;
  targetDate?: Date; // Add targetDate prop
  className?: string; // Add className prop
}

const DailyCountdown = ({ score, targetDate, className }: DailyCountdownProps) => {
  const { countdown } = useDailyGame();
  
  // Use targetDate if provided, otherwise use countdown from hook
  const displayCountdown = targetDate ? {
    hours: Math.floor((targetDate.getTime() - Date.now()) / 1000 / 60 / 60) % 24,
    minutes: Math.floor((targetDate.getTime() - Date.now()) / 1000 / 60) % 60,
    seconds: Math.floor((targetDate.getTime() - Date.now()) / 1000) % 60
  } : countdown;
  
  return (
    <div className={`p-4 border rounded-lg bg-background/50 backdrop-blur-sm space-y-3 ${className || ''}`}>
      <div>
        <h3 className="text-lg font-semibold mb-1">Daily Challenge Complete</h3>
        <p className="text-sm text-muted-foreground">Your score: <span className="font-semibold">{score.toLocaleString()} points</span></p>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1.5" />
          <span>Next challenge available in:</span>
        </div>
        
        <div className="flex justify-center space-x-2 font-mono">
          <div className="bg-muted w-14 text-center py-2 rounded">
            <div className="text-2xl font-bold">{displayCountdown.hours.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">hours</div>
          </div>
          <div className="bg-muted w-14 text-center py-2 rounded">
            <div className="text-2xl font-bold">{displayCountdown.minutes.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">mins</div>
          </div>
          <div className="bg-muted w-14 text-center py-2 rounded">
            <div className="text-2xl font-bold">{displayCountdown.seconds.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">secs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCountdown;
