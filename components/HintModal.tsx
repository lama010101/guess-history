
import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, HelpCircle } from "lucide-react";
import { HintType } from "@/hooks/useHint";

interface HintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHintType: HintType;
  hintContent: string | null;
  onSelectHint: (type: HintType) => void;
}

const HintModal = ({ 
  isOpen, 
  onOpenChange, 
  selectedHintType, 
  hintContent, 
  onSelectHint 
}: HintModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 text-white w-[90%] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-white">
            {selectedHintType ? "Your Hint" : "Choose Your Hint"}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          {selectedHintType ? (
            // Show the selected hint
            <div className="text-center p-6 glass rounded-xl">
              <div className="mb-4">
                {selectedHintType === 'where' && <MapPin className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
                {selectedHintType === 'when' && <Clock className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
                {selectedHintType === 'what' && <HelpCircle className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
                <h3 className="text-lg font-medium capitalize">{selectedHintType}</h3>
              </div>
              <p className="text-xl font-medium">{hintContent}</p>
            </div>
          ) : (
            // Show hint options
            <div className="grid gap-4">
              <button 
                onClick={() => onSelectHint('where')}
                className="hint-button p-4 rounded-xl glass flex items-center hover:bg-white/10 transition-colors"
              >
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 h-12 w-12 rounded-full flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium">Where</h3>
                  <p className="text-sm text-gray-300">Reveals the region</p>
                </div>
              </button>
              
              <button 
                onClick={() => onSelectHint('when')}
                className="hint-button p-4 rounded-xl glass flex items-center hover:bg-white/10 transition-colors"
              >
                <div className="bg-gradient-to-br from-pink-500 to-red-600 h-12 w-12 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium">When</h3>
                  <p className="text-sm text-gray-300">Reveals the decade</p>
                </div>
              </button>
              
              <button 
                onClick={() => onSelectHint('what')}
                className="hint-button p-4 rounded-xl glass flex items-center hover:bg-white/10 transition-colors"
              >
                <div className="bg-gradient-to-br from-yellow-500 to-orange-600 h-12 w-12 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 text-left">
                  <h3 className="text-lg font-medium">What</h3>
                  <p className="text-sm text-gray-300">Reveals event description</p>
                </div>
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-center">
          <Button
            onClick={() => onOpenChange(false)}
            className="px-6 bg-gradient-to-r from-history-secondary to-history-secondary/80 border-none hover:opacity-90"
          >
            {selectedHintType ? "Continue Guessing" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HintModal;
