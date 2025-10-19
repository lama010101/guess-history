import React from 'react';
import { Target, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useGame } from '@/contexts/GameContext';

const Pill: React.FC<{ icon: React.ReactNode; label: string; gradient: string }> = ({ icon, label, gradient }) => (
  <div
    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_18px_rgba(0,0,0,0.35)] transition-transform duration-200 hover:scale-[1.02] focus-visible:scale-[1.02] ${gradient}`}
  >
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/20 text-white/90">
      {icon}
    </span>
    <span>{label}</span>
  </div>
);

export const StatsDisplay = () => {
  const { globalAccuracy, globalXP } = useGame();

  return (
    <div className="flex items-center gap-3 sm:gap-4 text-white/90">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Pill
              icon={<Target className="h-3.5 w-3.5" />}
              label={`${Math.round(globalAccuracy)}%`}
              gradient="bg-gradient-to-r from-[#4765FF] via-[#4A7BFF] to-[#4DC5FF]"
            />
          </TooltipTrigger>
          <TooltipContent>Global Accuracy Score</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Pill
              icon={<Zap className="h-3.5 w-3.5" />}
              label={`+${globalXP.toLocaleString()} XP`}
              gradient="bg-gradient-to-r from-[#1AB977] via-[#22CC88] to-[#32F0B0]"
            />
          </TooltipTrigger>
          <TooltipContent>Total Experience Points (XP)</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
