
import React from 'react';

interface XpBreakdownCardProps {
  locationAccuracy: number;
  timeAccuracy: number;
  xpWhere: number;
  xpWhen: number;
}

const XpBreakdownCard: React.FC<XpBreakdownCardProps> = ({ 
  locationAccuracy, 
  timeAccuracy, 
  xpWhere, 
  xpWhen 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-center">XP Breakdown</h3>
      
      <div className="space-y-4">
        {/* Location XP */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Where</span>
            <span className="text-sm font-medium">{Math.round(xpWhere)} XP</span>
          </div>
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div 
              className="absolute top-0 left-0 h-full bg-history-accent rounded-full" 
              style={{ width: `${Math.round(locationAccuracy)}%` }}
            />
          </div>
          <div className="text-xs text-right mt-1 text-muted-foreground">
            {Math.round(locationAccuracy)}% accurate
          </div>
        </div>
        
        {/* Time XP */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">When</span>
            <span className="text-sm font-medium">{Math.round(xpWhen)} XP</span>
          </div>
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
            <div 
              className="absolute top-0 left-0 h-full bg-history-primary rounded-full" 
              style={{ width: `${Math.round(timeAccuracy)}%` }}
            />
          </div>
          <div className="text-xs text-right mt-1 text-muted-foreground">
            {Math.round(timeAccuracy)}% accurate
          </div>
        </div>
      </div>
    </div>
  );
};

export default XpBreakdownCard;
