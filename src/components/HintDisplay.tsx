
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
import { useGameState } from '@/hooks/useGameState';

interface HintDisplayProps {
  availableHints: number;
  onClose: () => void;
}

const HintDisplay = ({ availableHints, onClose }: HintDisplayProps) => {
  const [isHintDialogOpen, setIsHintDialogOpen] = useState(true);
  const { 
    handleUseLocationHint, 
    handleUseYearHint,
    locationHintUsed,
    yearHintUsed,
    hintCoins
  } = useGameState();

  const useLocationHint = () => {
    handleUseLocationHint();
    setIsHintDialogOpen(false);
    onClose();
  };

  const useYearHint = () => {
    handleUseYearHint();
    setIsHintDialogOpen(false);
    onClose();
  };

  const handleCloseDialog = () => {
    setIsHintDialogOpen(false);
    onClose();
  };

  return (
    <Dialog open={isHintDialogOpen} onOpenChange={(open) => {
      setIsHintDialogOpen(open);
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Available Hints
          </DialogTitle>
          <DialogDescription>
            You have <span className="font-bold">{hintCoins}</span> hints available to use.
            Using hints reduces your round score.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button 
            onClick={useLocationHint}
            disabled={locationHintUsed || hintCoins <= 0}
            variant={locationHintUsed ? "outline" : "secondary"}
            className="w-full"
          >
            {locationHintUsed ? "Location Hint Used" : "Use Location Hint"}
            <span className="ml-1 text-xs">(-500 pts)</span>
          </Button>
          
          <Button 
            onClick={useYearHint}
            disabled={yearHintUsed || hintCoins <= 0}
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
          <Button type="button" variant="ghost" className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100" onClick={handleCloseDialog}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default HintDisplay;
