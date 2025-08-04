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
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-history-dark p-4 z-10">
      <Button 
        onClick={handleSubmit}
        disabled={isDisabled}
        className={`w-full py-6 text-lg font-semibold rounded-xl shadow-lg transition-colors !text-white ${hasLocation ? '!bg-black hover:!bg-gray-800' : '!bg-gray-400 cursor-not-allowed'}`}
      >
        <span>{isSubmitting ? 'Submitting...' : 'Submit Guess'}</span>
        <ChevronRight className="ml-2 h-5 w-5" />
      </Button>
      </div>
    </div>
  );
};

export default SubmitGuessButton;
