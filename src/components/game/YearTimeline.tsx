
import { Circle } from 'lucide-react';

interface YearTimelineProps {
  guessedYear: number;
  actualYear: number;
  yearDifference?: number;
  minYear?: number;
  maxYear?: number;
}

const YearTimeline = ({ 
  guessedYear, 
  actualYear, 
  yearDifference: providedYearDifference,
  minYear = 1900, 
  maxYear = 2025 
}: YearTimelineProps) => {
  // Calculate positions as percentages
  const timeRange = maxYear - minYear;
  const actualPosition = ((actualYear - minYear) / timeRange) * 100;
  const guessedPosition = ((guessedYear - minYear) / timeRange) * 100;
  
  // Calculate year difference if not provided
  const yearDifference = providedYearDifference !== undefined ? 
    providedYearDifference : 
    Math.abs(actualYear - guessedYear);
  
  return (
    <div className="w-full py-4">
      {/* Timeline */}
      <div className="w-full h-0.5 bg-border relative">
        {/* Min label */}
        <div className="absolute bottom-2 left-0 transform -translate-x-1/2">
          <div className="h-2 w-0.5 bg-border"></div>
          <span className="text-[10px] text-muted-foreground">{minYear}</span>
        </div>
        
        {/* Max label */}
        <div className="absolute bottom-2 right-0 transform translate-x-1/2">
          <div className="h-2 w-0.5 bg-border"></div>
          <span className="text-[10px] text-muted-foreground">{maxYear}</span>
        </div>
        
        {/* Midpoint label */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <div className="h-2 w-0.5 bg-border"></div>
          <span className="text-[10px] text-muted-foreground">{Math.floor((minYear + maxYear) / 2)}</span>
        </div>
        
        {/* Actual Year marker */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2" 
          style={{ left: `${actualPosition}%` }}
        >
          <div className="relative flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-md"></div>
            <div className="absolute top-5 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium bg-green-500/10 text-green-700 px-1.5 py-0.5 rounded">
                {actualYear}
              </span>
            </div>
          </div>
        </div>
        
        {/* Guessed Year marker */}
        <div 
          className="absolute top-1/2 transform -translate-y-1/2" 
          style={{ left: `${guessedPosition}%` }}
        >
          <div className="relative flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
            <div className="absolute bottom-5 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs font-medium bg-blue-500/10 text-blue-700 px-1.5 py-0.5 rounded">
                {guessedYear}
              </span>
            </div>
          </div>
        </div>
        
        {/* Line connecting the dots if they're different */}
        {actualYear !== guessedYear && (
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 h-0.5 bg-red-400"
            style={{
              left: `${Math.min(actualPosition, guessedPosition)}%`,
              width: `${Math.abs(actualPosition - guessedPosition)}%`
            }}
          ></div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center mt-6 gap-4 text-xs">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></div>
          <span className="text-muted-foreground">Actual Year</span>
        </div>
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></div>
          <span className="text-muted-foreground">Your Guess</span>
        </div>
      </div>
    </div>
  );
};

export default YearTimeline;
