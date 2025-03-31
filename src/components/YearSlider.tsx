
import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

interface YearSliderProps {
  minYear?: number;
  maxYear?: number;
  selectedYear?: number;
  onChange?: (year: number) => void;
}

const YearSlider = ({ minYear = 1900, maxYear = 2025, selectedYear: initialYear, onChange }: YearSliderProps) => {
  const [selectedYear, setSelectedYear] = useState(initialYear || Math.floor((minYear + maxYear) / 2));
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (onChange) {
      onChange(selectedYear);
    }
  }, [selectedYear, onChange]);

  useEffect(() => {
    if (initialYear !== undefined && initialYear !== selectedYear) {
      setSelectedYear(initialYear);
    }
  }, [initialYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
  };

  return (
    <div className="w-full px-1 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor="year-slider" className="text-sm font-medium flex items-center">
          <Calendar className="h-4 w-4 mr-1.5" />
          Year
        </label>
        <div 
          className={`text-lg font-semibold transition-all duration-300 ${
            isDragging ? 'text-primary scale-110' : 'text-foreground'
          }`}
        >
          {selectedYear}
        </div>
      </div>
      
      <div className="relative mb-4">
        <input
          id="year-slider"
          type="range"
          min={minYear}
          max={maxYear}
          value={selectedYear}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onTouchStart={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchEnd={() => setIsDragging(false)}
          className="year-slider"
        />
        
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground">
        <p>Slide to select the year you think the photo was taken</p>
      </div>
    </div>
  );
};

export default YearSlider;
