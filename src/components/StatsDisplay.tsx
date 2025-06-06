import React from 'react';
import { Target, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useGame } from '@/contexts/GameContext';

export const StatsDisplay = () => {
  const { globalAccuracy, globalXP } = useGame();

  return (
    <div className="flex items-center gap-6 text-white/80">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant="accuracy" className="flex items-center gap-1 text-sm">
                <Target className="h-4 w-4" />
                <span>{Math.round(globalAccuracy)}%</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Global Accuracy Score</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Badge variant="xp" className="flex items-center gap-1 text-sm">
                <Zap className="h-4 w-4" />
                <span>{globalXP.toLocaleString()}</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Total Experience Points (XP)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
