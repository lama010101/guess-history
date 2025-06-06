
import React from 'react';
import { Calendar } from "lucide-react";

interface TimeAccuracyCardProps {
  yearDifference: number;
  guessYear: number;
  eventYear: number;
  timeAccuracy: number;
  timeDifferenceDesc: string;
  className?: string;
}

const TimeAccuracyCard: React.FC<TimeAccuracyCardProps> = ({ 
  yearDifference, 
  guessYear,
  eventYear,
  timeAccuracy,
  timeDifferenceDesc,
  className = ""
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 ${className}`}>
      <div className="border-b border-border pb-3 mb-3 flex justify-between items-center">
        <h2 className="font-bold text-lg text-history-primary dark:text-history-light flex items-center">
          <Calendar className="mr-2 h-4 w-4" />
          Time Accuracy
        </h2>
        <div className="px-3 py-1 rounded-full bg-history-primary/10 text-history-primary dark:bg-history-primary/20 dark:text-history-light text-sm">
          {Math.round(yearDifference)} years off
        </div>
      </div>
      
      <div className="flex justify-between text-sm mb-4">
        <div>Your guess: <span className="font-medium">{Math.round(guessYear)}</span></div>
        <div>Actual: <span className="font-medium">{Math.round(eventYear)}</span></div>
      </div>
      
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-history-primary" 
          style={{ width: `${Math.round(timeAccuracy)}%` }}
        />
      </div>
      
      <div className="mt-2 text-sm text-center text-muted-foreground">
        {timeDifferenceDesc}
      </div>
    </div>
  );
};

export default TimeAccuracyCard;
