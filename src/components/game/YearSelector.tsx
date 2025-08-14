import React, { useRef } from 'react';
import { Slider } from "@/components/ui/slider";

interface YearSelectorProps {
  selectedYear?: number | null;
  onChange: (year: number) => void;
  onFirstInteract?: () => void;
}

const YearSelector: React.FC<YearSelectorProps> = ({ selectedYear, onChange, onFirstInteract }) => {
  const minYear = 1850;
  const maxYear = 2025;
  const hasInteractedRef = useRef(false);
  const mid = Math.round((minYear + maxYear) / 2);

  return (
    <div className="w-full">
      {/* Slider only */}
      <div className="relative mb-0">
        <Slider
          value={[selectedYear ?? mid]}
          min={minYear}
          max={maxYear}
          step={1}
          onValueChange={(v) => {
            if (!hasInteractedRef.current) {
              hasInteractedRef.current = true;
              onFirstInteract?.();
            }
            onChange(v[0]);
          }}
          className="w-full my-0"
        />
        {/* Endpoint labels without ticks */}
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 px-1 mt-2 select-none">
          <span>{minYear}</span>
          <span>{maxYear}</span>
        </div>
      </div>
    </div>
  );
};

export default YearSelector;
