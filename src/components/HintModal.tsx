
import React, { useState } from 'react';
import Popup from '@/components/ui/Popup';
import { Button } from "@/components/ui/button";
import { MapPin, Clock } from "lucide-react";
import { HintType } from "@/hooks/useHint";

interface HintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHintType: HintType;
  hintContent: string | null;
  onSelectHint: (type: HintType) => void;
}

interface HintModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedHintType: HintType;
  hintContent: string | null;
  onSelectHint: (type: HintType) => void;
  hintsUsedThisRound: number;
  hintsUsedTotal: number;
  HINTS_PER_ROUND: number;
  HINTS_PER_GAME: number;
}

const HintModal = ({ 
  isOpen, 
  onOpenChange, 
  selectedHintType, 
  hintContent, 
  onSelectHint,
  hintsUsedThisRound,
  hintsUsedTotal,
  HINTS_PER_ROUND,
  HINTS_PER_GAME
}: HintModalProps) => {
  const [loadingHint, setLoadingHint] = useState<HintType | null>(null);

  const handleHintSelection = (hintType: HintType) => {
    setLoadingHint(hintType);
    try {
      onSelectHint(hintType);
    } catch (error) {
      console.error('Error selecting hint:', error);
    } finally {
      setLoadingHint(null);
    }
  };
  return (
    <Popup isOpen={isOpen} onClose={() => onOpenChange(false)} ariaLabelledBy="hint-modal-title">
      {/* Content that was previously in DialogContent now goes here, styled by Popup.module.css */}
      {/* The className on DialogContent is now handled by Popup.module.css's .panel style */}
      <div className="text-center">
        <h2 id="hint-modal-title" className="text-xl font-bold text-white mb-4">
            {selectedHintType ? "Your Hint" : "Choose Your Hint"}
        </h2>
      </div>

        <div className="mt-4">
          {selectedHintType ? (
            // Show the selected hint
            <div className="text-center p-6 glass rounded-xl">
              <div className="mb-4">
                {selectedHintType === 'where' && <MapPin className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
                {selectedHintType === 'when' && <Clock className="mx-auto h-8 w-8 text-history-secondary mb-2" />}
                <h3 className="text-lg font-medium capitalize">{selectedHintType}</h3>
              </div>
              <p className="text-xl font-medium">
                {hintContent || 'No hint content available'}
              </p>
            </div>
          ) : (
            // Show hint options
            <div className="grid gap-4">
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-400 text-sm mt-0.5">⚠️</span>
                  <div>
                    <p className="text-yellow-300 text-sm font-medium">Hint Cost</p>
                    <p className="text-yellow-200 text-xs mt-1">
                      Each hint costs 30 XP or 30% accuracy. Best used if you're less than 50% sure.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Remaining hints info */}
              <div className="mb-4 grid grid-cols-2 gap-3 text-center">
                <div className="bg-white/5 p-2 rounded-lg">
                  <div className="text-xs text-gray-300 mb-1">This Round</div>
                  <div className="text-xl font-bold text-white">
                    {HINTS_PER_ROUND - hintsUsedThisRound}
                    <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_ROUND}</span>
                  </div>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <div className="text-xs text-gray-300 mb-1">Total Remaining</div>
                  <div className="text-xl font-bold text-white">
                    {HINTS_PER_GAME - hintsUsedTotal}
                    <span className="text-xs font-normal text-gray-400"> / {HINTS_PER_GAME}</span>
                  </div>
                </div>
              </div>
              {/* Show hint buttons only if not all used this round */}
              {hintsUsedThisRound >= HINTS_PER_ROUND || (HINTS_PER_GAME - hintsUsedTotal) <= 0 ? (
                <div className="text-red-400 font-semibold py-8 text-center">
                  {hintsUsedThisRound >= HINTS_PER_ROUND 
                    ? "You've used all hints for this round."
                    : "You've used all your hints for this game."}
                </div>
              ) : (
                <div className="grid gap-4">
                  <button 
                    onClick={() => handleHintSelection('where')}
                    className={`hint-button p-4 rounded-xl glass flex items-center transition-colors ${
                      hintsUsedThisRound >= HINTS_PER_ROUND 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-white/10'}`}
                    disabled={hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint !== null}
                  >
                    <div className={`bg-gradient-to-br from-indigo-500 to-purple-600 h-12 w-12 rounded-full flex items-center justify-center ${
                      loadingHint === 'where' ? 'animate-pulse' : ''
                    }`}>
                      {loadingHint === 'where' ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <MapPin className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="text-lg font-medium">Where</h3>
                      <p className="text-sm text-gray-300">Reveals the region</p>
                    </div>
                  </button>
                  
                  <button 
                    onClick={() => handleHintSelection('when')}
                    className={`hint-button p-4 rounded-xl glass flex items-center transition-colors ${
                      hintsUsedThisRound >= HINTS_PER_ROUND 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:bg-white/10'}`}
                    disabled={hintsUsedThisRound >= HINTS_PER_ROUND || loadingHint !== null}
                  >
                    <div className={`bg-gradient-to-br from-pink-500 to-red-600 h-12 w-12 rounded-full flex items-center justify-center ${
                      loadingHint === 'when' ? 'animate-pulse' : ''
                    }`}>
                      {loadingHint === 'when' ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Clock className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div className="ml-4 text-left">
                      <h3 className="text-lg font-medium">When</h3>
                      <p className="text-sm text-gray-300">Reveals the decade</p>
                    </div>
                  </button>
                  
                  {/* Removed 'what' hint button as per requirements */}
                </div>
              )}
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
      {/* Closing Popup tag */}
    </Popup>
  );
};

export default HintModal;
