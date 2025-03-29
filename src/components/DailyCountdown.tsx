
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useDailyGame } from '@/hooks/useDailyGame';

interface DailyCountdownProps {
  score: number;
}

const DailyCountdown = ({ score }: DailyCountdownProps) => {
  const { countdown } = useDailyGame();
  
  return (
    <div className="p-4 border rounded-lg bg-background/50 backdrop-blur-sm space-y-3">
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
            <div className="text-2xl font-bold">{countdown.hours.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">hours</div>
          </div>
          <div className="bg-muted w-14 text-center py-2 rounded">
            <div className="text-2xl font-bold">{countdown.minutes.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">mins</div>
          </div>
          <div className="bg-muted w-14 text-center py-2 rounded">
            <div className="text-2xl font-bold">{countdown.seconds.toString().padStart(2, '0')}</div>
            <div className="text-xs text-muted-foreground">secs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCountdown;
