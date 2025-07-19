import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";

interface YearSelectorProps {
  selectedYear: number;
  onChange: (year: number) => void;
  yearMarkers?: number[];
}

const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onChange,
  yearMarkers,
}) => {
  const currentYear = new Date().getFullYear();
  const defaultMarkers = [1850, 1900, 1950, 2000, currentYear];
  const markers = yearMarkers || defaultMarkers;
  const [isEditing, setIsEditing] = useState(false);
  const [yearInput, setYearInput] = useState(selectedYear.toString());

  const handleYearClick = () => {
    setYearInput(selectedYear.toString());
    setIsEditing(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYearInput(e.target.value);
  };

  const handleInputBlur = () => {
    const parsedYear = parseInt(yearInput);
    if (!isNaN(parsedYear) && parsedYear >= 1850 && parsedYear <= currentYear) {
      onChange(parsedYear);
    } else {
      setYearInput(selectedYear.toString());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setYearInput(selectedYear.toString());
      setIsEditing(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between mb-2">
        <label className="font-semibold text-history-primary dark:text-history-light">WHEN</label>
        {isEditing ? (
          <input
            type="number"
            value={yearInput}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            min={1850}
            max={currentYear}
            className="w-16 text-right font-medium bg-transparent border-b border-history-secondary focus:outline-none focus:border-history-primary"
            autoFocus
          />
        ) : (
          <Badge variant="selectedValue" onClick={handleYearClick} className="cursor-pointer hover:text-history-primary">
            {selectedYear}
          </Badge>
        )}
      </div>
      <div className="relative">
        <input 
          type="range" 
          min={1850} 
          max={currentYear} 
          value={selectedYear} 
          onChange={e => onChange(parseInt(e.target.value))} 
          step={1}
          className="time-slider w-full" 
          aria-valuemin={1850}
          aria-valuemax={currentYear}
          aria-valuenow={selectedYear}
          list="year-markers"
        />
        <datalist id="year-markers">
          {markers.map(year => (
            <option key={year} value={year} />
          ))}
        </datalist>
        
        {/* Custom tick marks with labels */}
        <div className="flex w-full relative mt-0">
          {markers.map((year, index) => {
            // Calculate position percentage
            const position = ((year - 1850) / (currentYear - 1850)) * 100;
            return (
              <div 
                key={year} 
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-2 bg-[#dadada] -mt-2"></div>
                <div className="text-xs text-[#dadada] mt-1">{year}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default YearSelector;
