import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import GameLayout1 from "@/components/layouts/GameLayout1";

const TestGamePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const mode = searchParams.get('mode') || 'solo';
  const gameId = searchParams.get('id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGameState = async () => {
      if (!gameId) {
        toast({
          variant: "destructive",
          title: "Game not found",
          description: "Returning to home page",
        });
        navigate('/test');
        return;
      }

      try {
        setLoading(true);
        
        // Check if game exists and its completion status
        const { data: game, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single();

        if (gameError) {
          throw gameError;
        }

        if (!game) {
          throw new Error('Game not found');
        }

        // If game is already completed, redirect to results
        if (game.completed) {
          console.log('Game already completed, redirecting to results');
          navigate(`/test/results?id=${gameId}`);
          return;
        }

        // Load game settings from localStorage if available
        if (mode === 'multi') {
          const savedSettings = localStorage.getItem('guessHistory_roomSettings');
          if (savedSettings) {
            const { timerMinutes, hintCount } = JSON.parse(savedSettings);
            console.log(`Loaded settings: ${timerMinutes}min timer, ${hintCount} hints`);
            // Here we would apply these settings to the game
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking game state:', error);
        toast({
          variant: "destructive",
          title: "Error loading game",
          description: error.message || "Please try again later",
        });
        navigate('/test');
      }
    };

    checkGameState();
  }, [gameId, navigate, toast, mode]);

  const handleGameComplete = async () => {
    // Update game status to completed
    if (gameId) {
      try {
        const { error } = await supabase
          .from('games')
          .update({ completed: true })
          .eq('id', gameId);

        if (error) {
          throw error;
        }

        console.log('Game marked as completed');
        navigate(`/test/results?id=${gameId}`);
      } catch (error) {
        console.error("Error completing game:", error);
        // Still navigate even if there's an error
        navigate(`/test/results?id=${gameId}`);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading game...</div>;
  }

  if (!gameId) return null;

  return (
    <div className="relative w-full h-full">
      <GameLayout1 onComplete={handleGameComplete} gameMode={mode} gameId={gameId} />
    </div>
  );
};

export default TestGamePage;
