
/**
 * Game progress and round management utilities
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchRandomImageIds } from './images';

export async function checkGameProgress(gameId: string): Promise<{ isLastRound: boolean, nextRound?: number, error?: string }> {
  if (!gameId) return { isLastRound: false, error: "No game ID provided" };
  
  const TOTAL_ROUNDS = 5; // Define a constant for total rounds
  
  // Handle temporary games
  const isTempGame = gameId?.startsWith('temp_');
  if (isTempGame) {
    // For temp games, get current round from session storage
    const currentRoundStr = sessionStorage.getItem(`temp_game_${gameId}_current_round`);
    const currentRound = currentRoundStr ? parseInt(currentRoundStr, 10) : 1;
    const nextRound = currentRound + 1;
    const isLastRound = currentRound >= TOTAL_ROUNDS;
    
    console.log(`Temp game check progress: current round ${currentRound}, next round ${nextRound}, isLastRound: ${isLastRound}`);
    
    // Store next round in session storage
    if (!isLastRound) {
      sessionStorage.setItem(`temp_game_${gameId}_current_round`, nextRound.toString());
    }
    
    return { isLastRound, nextRound };
  }
  
  try {
    // Get current game state
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select('*')
      .eq('id', gameId)
      .maybeSingle();
      
    if (gameError || !game) {
      console.error("Error fetching game data:", gameError);
      return { isLastRound: false, nextRound: 2 };
    }
    
    const currentRound = game.current_round || 1;
    const roundCount = game.round_count || TOTAL_ROUNDS;
    
    console.log(`Database game check progress: current round ${currentRound}, round count ${roundCount}`);
    
    // Check if this was the final round
    if (currentRound >= roundCount) {
      return { isLastRound: true };
    }
    
    return { 
      isLastRound: false, 
      nextRound: currentRound + 1 
    };
  } catch (err) {
    console.error("Error checking game progress:", err);
    return { isLastRound: false, nextRound: 2 };
  }
}

export async function advanceToNextRound(gameId: string, nextRound: number): Promise<{ success: boolean, error?: string }> {
  console.log(`Advancing to next round: ${nextRound} for game: ${gameId}`);
  
  try {
    // Handle temporary games
    const isTempGame = gameId?.startsWith('temp_');
    if (isTempGame) {
      console.log("Advancing temp game to next round:", nextRound);
      // Store the next round in session storage
      sessionStorage.setItem(`temp_game_${gameId}_current_round`, nextRound.toString());
      return { success: true };
    }
    
    // Update the current round in the games table
    const { error: updateError } = await supabase
      .from("games")
      .update({ current_round: nextRound })
      .eq("id", gameId);
      
    if (updateError) {
      console.error("Error updating game round:", updateError);
      return { success: false, error: "Could not advance to next round" };
    }
    
    // Check if we already have a game_round for this next round
    const { data: existingRound, error: checkError } = await supabase
      .from("game_rounds")
      .select("*")
      .eq("game_id", gameId)
      .eq("round_index", nextRound)
      .maybeSingle();
      
    // If we already have a round, no need to create a new one
    if (!checkError && existingRound) {
      console.log("Round already exists for this game and round index");
      return { success: true };
    }
    
    // If not, fetch a random image and create the next game round
    const randomImages = await fetchRandomImageIds(1);
    if (randomImages.length === 0) {
      return { success: false, error: "Could not find an image for the next round" };
    }
    
    // Create the new game round record
    const { error: insertError } = await supabase
      .from("game_rounds")
      .insert({
        game_id: gameId,
        round_index: nextRound,
        image_id: randomImages[0]
      });
      
    if (insertError) {
      console.error("Error creating next game round:", insertError);
      return { success: false, error: "Could not create next round data" };
    }
    
    return { success: true };
  } catch (err) {
    console.error("Error advancing to next round:", err);
    return { success: false, error: "An error occurred" };
  }
}
