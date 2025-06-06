/**
 * Round result fetching and processing utilities
 */

import { supabase } from "@/integrations/supabase/client";
import { generatePlaceholderGuess } from './placeholderData';
import { 
  generateMockResult, 
  generateResultFromStoredGuess,
  generateResultWithImageData
} from './mockResults';
import { RoundResult } from './types';

/**
 * Helper function for handling round loading failures
 */
function handleRoundLoadFailure(gameId: string, roundIndex: number, imageData: any = null): Promise<{ result: RoundResult | null, error: string | null }> {
  console.log("Attempting to recover from round loading failure");
  
  // If we have imageData, try to generate a result with placeholder guess
  if (imageData) {
    console.log("Using available image data with placeholder guess");
    const placeholderGuess = generatePlaceholderGuess(imageData);
    return Promise.resolve(generateResultWithImageData(imageData, placeholderGuess));
  }
  
  // Otherwise fall back to a mock result
  console.log("Falling back to mock result");
  return Promise.resolve(generateMockResult());
}

/**
 * Main function to fetch a round result
 */
export async function fetchRoundResult(gameId: string, roundIndex: number): Promise<{ result: RoundResult | null, error: string | null }> {
  if (!gameId) {
    return { result: null, error: "No game ID provided" };
  }
  
  console.log(`Starting to load results for game ${gameId}, round ${roundIndex}`);
  
  // Check if this is a temporary game ID
  const isTempGame = gameId?.startsWith('temp_');
  
  try {
    // For temporary games, try to get data from sessionStorage
    if (isTempGame) {
      console.log('Handling temporary game result');
      const guessKey = `temp_game_${gameId}_round_${roundIndex}_guess`;
      const storedGuess = sessionStorage.getItem(guessKey);
      
      if (storedGuess) {
        console.log('Found stored guess for temp game:', storedGuess);
        return generateResultFromStoredGuess(JSON.parse(storedGuess));
      }
      
      console.log('No stored guess found for temp game, generating mock result');
      return generateMockResult();
    }
    
    // Try to get fallback data from sessionStorage first
    const fallbackKey = `fallback_game_${gameId}_round_${roundIndex}_guess`;
    const fallbackGuess = sessionStorage.getItem(fallbackKey);
    
    if (fallbackGuess) {
      console.log('Found fallback guess data in sessionStorage, using it for results');
      return generateResultFromStoredGuess(JSON.parse(fallbackGuess));
    }
    
    // Fetch the game round to get the image id
    console.log(`Fetching game round data for game ${gameId}, round ${roundIndex}`);
    const { data: gameRound, error: gameRoundError } = await supabase
      .from("game_rounds")
      .select("*")
      .eq("game_id", gameId)
      .eq("round_index", roundIndex)
      .maybeSingle();
      
    if (gameRoundError) {
      console.error("Error fetching game round:", gameRoundError);
      // If there's an error fetching the round, try the fallback guess mode
      return handleRoundLoadFailure(gameId, roundIndex);
    }
    
    if (!gameRound) {
      console.warn("Game round not found in database, checking for previous round image");
      // Try to find any existing round for this game to get an image
      const { data: anyRound } = await supabase
        .from("game_rounds")
        .select("*")
        .eq("game_id", gameId)
        .order("round_index", { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (!anyRound) {
        console.error("No rounds found for this game at all");
        return handleRoundLoadFailure(gameId, roundIndex);
      }
      
      // If we found a previous round, we'll use its image
      const imageId = anyRound.image_id;
      console.log(`Using image from previous round: ${imageId}`);
      
      // Fetch the image data for this imageId
      const { data: imageData, error: imageError } = await supabase
        .from("images")
        .select("*")
        .eq("id", imageId)
        .maybeSingle();
        
      if (imageError || !imageData) {
        console.error("Error fetching image data:", imageError);
        return handleRoundLoadFailure(gameId, roundIndex);
      }
      
      // Try to fetch the user guess
      const { data: guessData, error: guessError } = await supabase
        .from("guesses")
        .select("*")
        .eq("game_id", gameId)
        .eq("round_index", roundIndex)
        .maybeSingle();
        
      if (guessError || !guessData) {
        console.error("Error or no guess found:", guessError);
        // Check if we have a fallback
        return handleRoundLoadFailure(gameId, roundIndex, imageData);
      }
      
      return generateResultWithImageData(imageData, guessData);
    }
    
    const imageId = gameRound.image_id;
    console.log(`Found game round with image id: ${imageId}`);
    
    // Fetch the image data for the correct answers
    const { data: imageData, error: imageError } = await supabase
      .from("images")
      .select("*")
      .eq("id", imageId)
      .maybeSingle();
      
    if (imageError || !imageData) {
      console.error("Error fetching image data:", imageError);
      return handleRoundLoadFailure(gameId, roundIndex);
    }
    
    // Fetch user guess for this round
    const { data: guessData, error: guessError } = await supabase
      .from("guesses")
      .select("*")
      .eq("game_id", gameId)
      .eq("round_index", roundIndex)
      .maybeSingle();
      
    if (guessError) {
      console.error("Error fetching guess data:", guessError);
      return handleRoundLoadFailure(gameId, roundIndex, imageData);
    }
    
    if (!guessData) {
      console.error("No guess found for this round");
      // Since database guess lookup failed, try to find the guess in sessionStorage
      const sessionGuessKey = `fallback_game_${gameId}_round_${roundIndex}_guess`;
      const sessionGuess = sessionStorage.getItem(sessionGuessKey);
      
      if (sessionGuess) {
        console.log("Found fallback guess in sessionStorage:", sessionGuess);
        const parsedGuess = JSON.parse(sessionGuess);
        
        // Calculate results based on the session guess and image data
        return generateResultWithImageData(imageData, {
          guess_year: parsedGuess.guessYear,
          guess_lat: parsedGuess.guessLat,
          guess_lon: parsedGuess.guessLng
        });
      }
      
      // If no guess was found anywhere, generate a random one
      console.warn("No guess data available, generating placeholder guess");
      const placeholderGuess = generatePlaceholderGuess(imageData);
      return generateResultWithImageData(imageData, placeholderGuess);
    }
    
    console.log("Loaded image and guess data successfully");
    // Calculate and return results
    return generateResultWithImageData(imageData, guessData);
  } catch (err) {
    console.error("Unexpected error in loadRoundResult:", err);
    return handleRoundLoadFailure(gameId, roundIndex);
  }
}
