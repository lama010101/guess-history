
import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface HintDisplayProps {
  availableHints: number;
  onUseLocationHint?: () => void;
  onUseYearHint?: () => void;
  locationHintUsed?: boolean;
  yearHintUsed?: boolean;
}

const HintDisplay = ({ 
  availableHints, 
  onUseLocationHint, 
  onUseYearHint,
  locationHintUsed,
  yearHintUsed
}: HintDisplayProps) => {
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(false);

  const handleUseLocationHint = () => {
    if (onUseLocationHint) {
      onUseLocationHint();
      // Don't close dialog after using hint
    }
  };

  const handleUseYearHint = () => {
    if (onUseYearHint) {
      onUseYearHint();
      // Don't close dialog after using hint
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Hint button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="flex items-center gap-1"
        onClick={() => setIsHintDialogOpen(true)}
      >
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-medium mr-1">Hints:</span>
        <span className="text-sm font-bold">{availableHints}</span>
      </Button>

      {/* Full-width hint dialog */}
      <Dialog open={isHintDialogOpen} onOpenChange={setIsHintDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Available Hints
            </DialogTitle>
            <DialogDescription>
              You have <span className="font-bold">{availableHints}</span> hints available to use.
              Using hints reduces your round score.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button 
              onClick={handleUseLocationHint}
              disabled={locationHintUsed || availableHints <= 0}
              variant={locationHintUsed ? "outline" : "secondary"}
              className="w-full"
            >
              {locationHintUsed ? "Location Hint Used" : "Use Location Hint"}
              <span className="ml-1 text-xs">(-500 pts)</span>
            </Button>
            
            <Button 
              onClick={handleUseYearHint}
              disabled={yearHintUsed || availableHints <= 0}
              variant={yearHintUsed ? "outline" : "secondary"}
              className="w-full"
            >
              {yearHintUsed ? "Year Hint Used" : "Use Year Hint"}
              <span className="ml-1 text-xs">(-500 pts)</span>
            </Button>
          </div>
          
          <div className="mt-2 pt-2 border-t">
            <h4 className="text-sm font-medium mb-1">How to earn hint coins:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Play daily challenges (+2 coins)</li>
              <li>• Achieve perfect scores (+1 coin)</li>
              <li>• Log in consecutive days (+1 coin per day)</li>
            </ul>
          </div>
          
          <DialogClose asChild>
            <Button type="button" variant="ghost" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HintDisplay;
