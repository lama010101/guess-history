
import { Lightbulb, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HintDisplayProps {
  availableHints: number;
}

const HintDisplay = ({ availableHints }: HintDisplayProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center bg-muted px-3 py-1 rounded-md">
            <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
            <span className="text-sm font-medium mr-1">Hints:</span>
            <span className="text-sm font-bold">{availableHints}</span>
            <HelpCircle className="h-4 w-4 ml-1 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">Available hints to use in the game</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HintDisplay;
