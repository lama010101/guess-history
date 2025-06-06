
import { Target, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const StatsDisplay = () => {
  // TODO: These will be fetched from user context/state later
  const xp = 1250;
  const accuracy = 78.5;

  return (
    <div className="flex items-center gap-6 text-white/80">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="font-semibold">{xp.toLocaleString()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Experience Points (XP)</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              <span className="font-semibold">{accuracy}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Accuracy Score</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};
