import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

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
  // Remove 1850 and current year ticks per spec
  const defaultMarkers = [1900, 1950, 2000];
  const markers = (yearMarkers || defaultMarkers).filter(
    (y) => y !== 1850 && y !== currentYear
  );
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
    <div className="w-full">
      {/* Editable year display */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">Year</span>
        {isEditing ? (
          <input
            type="number"
            value={yearInput}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-24 bg-transparent border-b border-gray-500 focus:outline-none focus:border-orange-500 text-right text-white"
            min={1850}
            max={currentYear}
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={handleYearClick}
            className="text-orange-400 font-semibold hover:underline"
            aria-label="Edit year"
            title="Click to edit year"
          >
            {selectedYear}
          </button>
        )}
      </div>
      {/* Slider */}
      <div className="relative mb-6">
        <Slider
          value={[selectedYear]}
          min={1850}
          max={currentYear}
          step={1}
          onValueChange={(v) => onChange(v[0])}
          className="w-full my-2"
        />
        {/* Custom tick marks with labels */}
        {/* Custom tick marks with labels */}
        <div className="flex w-full relative mt-0 px-2">
          {markers.map((year, index) => {
            // Calculate position percentage
            const position = ((year - 1850) / (currentYear - 1850)) * 100;
            return (
              <div 
                key={year} 
                className="absolute flex flex-col items-center"
                style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-0.5 h-2 bg-gray-600 dark:bg-gray-400 -mt-2"></div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{year}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default YearSelector;
