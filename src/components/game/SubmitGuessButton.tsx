import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SubmitGuessButtonProps {
  onClick: () => void;
  isSubmitting?: boolean;
  guessData?: {
    guessYear: number;
    guessLat: number;
    guessLng: number;
    imageId: string;
  };
}

const SubmitGuessButton: React.FC<SubmitGuessButtonProps> = ({ 
  onClick, 
  isSubmitting = false,
  guessData
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>();
  const roundNumber = parseInt(roundNumberStr || '1', 10);

  const handleSubmit = async () => {
    if (!roomId || isNaN(roundNumber)) {
      console.error("Missing roomId or invalid roundNumber in URL");
      toast({ variant: "destructive", title: "Error", description: "Invalid game state." });
      return;
    }
    
    if (!guessData || typeof guessData.guessLat !== 'number' || typeof guessData.guessLng !== 'number') {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a location on the map before submitting"
      });
      return;
    }
    
    onClick();

    try {
      const isTempGame = roomId?.startsWith('temp_');
      const guessKey = isTempGame 
        ? `temp_game_${roomId}_round_${roundNumber}_guess` 
        : `fallback_game_${roomId}_round_${roundNumber}_guess`;
      
      const guessToStore = {
        guessYear: guessData.guessYear,
        guessLat: guessData.guessLat,
        guessLng: guessData.guessLng,
        imageId: guessData.imageId,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem(guessKey, JSON.stringify(guessToStore));
      console.log(`Saved guess to sessionStorage with key: ${guessKey}`);
      
      if (!isTempGame) {
        console.log("Submitting guess to database:", {
          game_id: roomId,
          round_index: roundNumber,
          image_id: guessData.imageId,
          guess_year: guessData.guessYear,
          guess_lat: guessData.guessLat,
          guess_lon: guessData.guessLng
        });
        const { error } = await supabase
          .from('guesses')
          .insert({
            game_id: roomId,
            round_index: roundNumber,
            image_id: guessData.imageId,
            guess_year: guessData.guessYear,
            guess_lat: guessData.guessLat,
            guess_lon: guessData.guessLng
          });
        if (error) console.error("DB Error:", error);
        }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const nextRoundNumber = roundNumber + 1;
      if (nextRoundNumber <= 5) {
        console.log(`Navigating to next round: ${nextRoundNumber}`);
        navigate(`/game/room/${roomId}/round/${nextRoundNumber}`);
      } else {
        console.log(`Navigating to final results for room ${roomId}`);
        navigate(`/game/room/${roomId}/final`);
      }

    } catch (err) {
      console.error("Unexpected error submitting guess:", err);
      toast({ variant: "destructive", title: "Error", description: "Submit failed." });
    }
  };

  const isDisabled = isSubmitting || 
                     !guessData || 
                     typeof guessData.guessLat !== 'number' || 
                     typeof guessData.guessLng !== 'number';
                     
  const hasLocation = !isDisabled; // True when a location is selected

  return (
    <div className="relative pb-24">
      <div className="fixed bottom-0 left-0 w-full bg-transparent p-4 z-10">
      <Button 
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`relative overflow-visible w-full py-6 text-lg font-semibold rounded-xl shadow-lg transition-colors !text-white ${hasLocation ? '!bg-orange-500 hover:!bg-orange-600' : '!bg-gray-400 cursor-not-allowed'}`}
      >
        {/* Sparkle FX when enabled */}
        {hasLocation && (
          <>
            {/* subtle outer glow */}
            <span className="pointer-events-none absolute -inset-0.5 rounded-2xl bg-[radial-gradient(closest-side,rgba(255,255,255,0.35),transparent)] blur-md" />
            {/* sparkles */}
            <span className="pointer-events-none absolute -top-1 left-6 h-2 w-2 rotate-45 bg-yellow-200 shadow-[0_0_8px_2px_rgba(250,204,21,0.8)] animate-[sparkle_1.3s_ease-in-out_infinite]" />
            <span className="pointer-events-none absolute -bottom-1 right-8 h-1.5 w-1.5 rotate-45 bg-white/90 shadow-[0_0_6px_2px_rgba(255,255,255,0.8)] animate-[sparkle_1.6s_ease-in-out_infinite_200ms]" />
            <span className="pointer-events-none absolute -top-2 right-4 h-1 w-1 rotate-45 bg-yellow-300 animate-[sparkle_1.1s_ease-in-out_infinite_120ms]" />
          </>
        )}
        <span className="relative z-10 flex items-center">
          <span>{isSubmitting ? 'Submitting...' : 'Submit Guess'}</span>
          <ChevronRight className="ml-2 h-5 w-5" />
        </span>
      </Button>
      {/* Local keyframes for sparkle animation */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { transform: translateY(0) scale(0.8) rotate(45deg); opacity: .5; }
          50% { transform: translateY(-3px) scale(1.25) rotate(45deg); opacity: 1; }
        }
      `}</style>
      </div>
    </div>
  );
};

export default SubmitGuessButton;
