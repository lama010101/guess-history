
import React from "react";
import { cn } from "@/lib/utils";

interface SegmentedProgressBarProps {
  current: number;
  total: number;
  className?: string;
  // Add round and totalRounds for backward compatibility
  round?: number;
  totalRounds?: number;
}

const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  current,
  total,
  className,
  round,
  totalRounds,
}) => {
  // Use round and totalRounds if provided, otherwise use current and total
  const currentValue = round !== undefined ? round : current;
  const totalValue = totalRounds !== undefined ? totalRounds : total;
  
  return (
    <div 
      className={cn(
        "flex w-full gap-0.5 bg-black/25 dark:bg-black/40 h-1 rounded-none overflow-hidden",
        className
      )}
    >
      {Array.from({ length: totalValue }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-full flex-1 transition-colors duration-300 ease-in-out",
            index < currentValue 
              ? "bg-orange-500 dark:bg-orange-400" 
              : "bg-[#787A7A] dark:bg-gray-700"
          )}
        />
      ))}
    </div>
  );
};

export default SegmentedProgressBar; 
