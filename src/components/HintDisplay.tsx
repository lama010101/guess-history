
import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface HintDisplayProps {
  availableHints: number;
}

const HintDisplay = ({ availableHints }: HintDisplayProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center bg-muted px-3 py-1 rounded-md cursor-pointer hover:bg-muted/80 transition-colors">
          <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
          <span className="text-sm font-medium mr-1">Hints:</span>
          <span className="text-sm font-bold">{availableHints}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-md p-4" align="end">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Available Hints
          </h3>
          <p className="text-sm text-muted-foreground">
            You have <span className="font-bold">{availableHints}</span> hints available to use in the game.
          </p>
          <div className="mt-2 pt-2 border-t">
            <h4 className="text-sm font-medium mb-1">How hints work:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Location hint shows you the country</li>
              <li>• Year hint shows the approximate year (last digit hidden)</li>
              <li>• Each hint costs 1 hint coin</li>
              <li>• Using hints will reduce your round score (-500 points per hint)</li>
            </ul>
          </div>
          <div className="mt-2 pt-2 border-t">
            <h4 className="text-sm font-medium mb-1">How to earn hint coins:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Play daily challenges (+2 coins)</li>
              <li>• Achieve perfect scores (+1 coin)</li>
              <li>• Log in consecutive days (+1 coin per day)</li>
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default HintDisplay;
