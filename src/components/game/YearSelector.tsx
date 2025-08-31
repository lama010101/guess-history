import React, { useRef } from 'react';
import { Slider } from "@/components/ui/slider";

interface YearSelectorProps {
  selectedYear?: number | null;
  onChange: (year: number) => void;
  onFirstInteract?: () => void;
  // Optional dynamic bounds for the slider
  minYear?: number;
  maxYear?: number;
}

const YearSelector: React.FC<YearSelectorProps> = ({ selectedYear, onChange, onFirstInteract, minYear, maxYear }) => {
  const effectiveMin = typeof minYear === 'number' ? minYear : 1850;
  const effectiveMax = typeof maxYear === 'number' ? maxYear : 2026;
  const hasInteractedRef = useRef(false);
  const mid = Math.round((effectiveMin + effectiveMax) / 2);

  return (
    <div className="w-full">
      {/* Slider only */}
      <div className="relative mb-0">
        <Slider
          value={[selectedYear ?? mid]}
          min={effectiveMin}
          max={effectiveMax}
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
          <span>{effectiveMin}</span>
          <span>{effectiveMax}</span>
        </div>
      </div>
    </div>
  );
};

export default YearSelector;

