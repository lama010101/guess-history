import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { v4 as uuidv4 } from 'uuid'; // For generating unique game IDs

// Define the structure for a user's guess coordinates
export interface GuessCoordinates {
  lat: number;
  lng: number;
}

// Define the structure for the result of a single round
export interface RoundResult {
  roundIndex: number; // 0-based index
  imageId: string;
  guessCoordinates: GuessCoordinates | null;
  actualCoordinates: { lat: number; lng: number };
  distanceKm: number | null; // Distance in kilometers
  score: number | null;
  guessYear: number | null; // Added year guess
  xpWhere?: number; // Location XP (0-100)
  xpWhen?: number; // Time XP (0-100)
  accuracy?: number; // Overall accuracy percentage for the round (0-100)
  hintsUsed?: number; // Number of hints used in this round
}

// Define the structure of an image object based on actual schema
export interface GameImage {
  id: string;
  title: string;
  description: string;
  // Keep fields that exist
  latitude: number;
  longitude: number;
  year: number;
  image_url: string; // Use actual column name
  location_name: string;
  url: string; // Keep processed url field
}

// Define the context state shape
interface GameContextState {
  // ... existing properties ...
  gameId: string | null; // Unique ID for the current game session
  setGameId: (id: string) => void; // Function to update gameId
  refreshGlobalMetrics: () => Promise<void>; // Add this line
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[];
  isLoading: boolean;
  error: string | null;
  hintsAllowed: number;
  roundTimerSec: number;
  timerEnabled: boolean; // Flag to determine if timer should be shown in HUD
  totalGameAccuracy: number;
  totalGameXP: number;
  globalAccuracy: number;
  globalXP: number;
  gamesPlayedForAvg: number;
  setHintsAllowed: (hints: number) => void;
  setRoundTimerSec: (seconds: number) => void;
  setTimerEnabled: (enabled: boolean) => void; // Function to enable/disable timer
  startGame: (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean }) => Promise<void>; // Updated to accept settings
  recordRoundResult: (result: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => void;
  handleTimeUp?: (currentRoundIndex: number) => void;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  setProvisionalGlobalMetrics: (gameXP: number, gameAccuracy: number) => void;
}

// Create the context
const GameContext = createContext<GameContextState | undefined>(undefined);

// Define the provider props
interface GameProviderProps {
  children: ReactNode;
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Create the provider component
export const GameProvider: React.FC<GameProviderProps> = ({ children }) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]); // Initialize results state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hintsAllowed, setHintsAllowed] = useState<number>(3); // Default 3 hints per game
  
  // Get timer setting from settings store (defaults to 60 seconds)
  const { timerSeconds, setTimerSeconds } = useSettingsStore();
  const [roundTimerSec, setRoundTimerSec] = useState<number>(timerSeconds || 60);
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true); // Default to timer enabled

  // Keep roundTimerSec in sync with timerSeconds from settings store
  useEffect(() => {
    setRoundTimerSec(timerSeconds);
  }, [timerSeconds]);

  // Accept settings from startGame
  const applyGameSettings = (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean }) => {
    if (settings) {
      if (typeof settings.timerSeconds === 'number') setRoundTimerSec(settings.timerSeconds);
      if (typeof settings.hintsPerGame === 'number') setHintsAllowed(settings.hintsPerGame);
      if (typeof settings.timerEnabled === 'boolean') setTimerEnabled(settings.timerEnabled);
    }
  };

  // Unified setter for both context and settings store
  const handleSetRoundTimerSec = useCallback((seconds: number) => {
    setRoundTimerSec(seconds);
    setTimerSeconds(seconds);
  }, [setTimerSeconds]);
  const [totalGameAccuracy, setTotalGameAccuracy] = useState<number>(0);
  const [totalGameXP, setTotalGameXP] = useState<number>(0);
  const [globalAccuracy, setGlobalAccuracy] = useState<number>(0);
  const [globalXP, setGlobalXP] = useState<number>(0);
  const [gamesPlayedForAvg, setGamesPlayedForAvg] = useState<number>(0);
  const navigate = useNavigate();

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (roomId && images.length > 0) {
      const gameState = {
        roomId,
        images,
        roundResults,
        hintsAllowed,
        roundTimerSec,
        timerEnabled,
        totalGameAccuracy,
        totalGameXP,
        timestamp: Date.now()
      };
      localStorage.setItem('gh_current_game', JSON.stringify(gameState));
    }
  }, [roomId, images, roundResults, hintsAllowed, roundTimerSec, timerEnabled, totalGameAccuracy, totalGameXP]);

  // Load game state from localStorage on mount
  useEffect(() => {
    const loadGameState = () => {
      try {
        const savedGame = localStorage.getItem('gh_current_game');
        if (savedGame) {
          const gameState = JSON.parse(savedGame);
          
          // Only load if the saved game is less than 24 hours old
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (Date.now() - (gameState.timestamp || 0) < TWENTY_FOUR_HOURS) {
            setRoomId(gameState.roomId);
            setImages(gameState.images || []);
            setRoundResults(gameState.roundResults || []);
            setHintsAllowed(gameState.hintsAllowed || 3);
            setRoundTimerSec(gameState.roundTimerSec || 60);
            setTimerEnabled(gameState.timerEnabled || true);
            setTotalGameAccuracy(gameState.totalGameAccuracy || 0);
            setTotalGameXP(gameState.totalGameXP || 0);
            console.log('Loaded saved game state:', gameState);
          } else {
            // Clear old game state
            localStorage.removeItem('gh_current_game');
          }
        }
      } catch (error) {
        console.error('Error loading game state:', error);
        localStorage.removeItem('gh_current_game');
      }
    };

    loadGameState();
  }, []);

  // Clear saved game state when component unmounts or game is reset
  const clearSavedGameState = useCallback(() => {
    localStorage.removeItem('gh_current_game');
  }, []);

  // Function to fetch global metrics from Supabase
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      console.log('[GameContext] Fetching global metrics from Supabase...');
      
      // Get the current user (works for both authenticated and anonymous users)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[GameContext] No user found (not even anonymous), setting metrics to 0');
        setGlobalAccuracy(0);
        setGlobalXP(0);
        setGamesPlayedForAvg(0);
        return;
      }
      
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Fetching metrics for user ${user.id}`);

      // Fetch metrics from Supabase
      const { data: metrics, error: fetchError } = await supabase
        .from('user_metrics')
        .select('xp_total, overall_accuracy, games_played')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No metrics found for user - this is normal for new users
          console.log(`[GameContext] No metrics found for user ${user.id}, initializing to 0`);
          setGlobalAccuracy(0);
          setGlobalXP(0);
          setGamesPlayedForAvg(0);
        } else {
          console.error('[GameContext] Error fetching user metrics:', fetchError);
          // Optionally, keep existing values or reset, for now resetting
          setGlobalAccuracy(0);
          setGlobalXP(0);
          setGamesPlayedForAvg(0);
        }
        return;
      }

      // Update state with the fetched metrics
      if (metrics) {
        const newAccuracy = metrics.overall_accuracy || 0;
        const newXP = metrics.xp_total || 0;
        const newGamesPlayed = metrics.games_played || 0;

        console.log('[GameContext] Updating global metrics from fetch:', {
          userId: user.id,
          newAccuracy,
          newXP,
          newGamesPlayed,
          timestamp: new Date().toISOString()
        });

        setGlobalAccuracy(newAccuracy);
        setGlobalXP(newXP);
        setGamesPlayedForAvg(newGamesPlayed);
      } else {
        console.log('[GameContext] No metrics data returned from Supabase for user:', user.id);
        setGlobalAccuracy(0);
        setGlobalXP(0);
        setGamesPlayedForAvg(0);
      }
    } catch (err) {
      console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error in fetchGlobalMetrics:`, err);
      setGlobalAccuracy(0);
      setGlobalXP(0);
      setGamesPlayedForAvg(0);
    }
  }, [gameId, globalAccuracy, globalXP]); // Added gameId, globalAccuracy, globalXP to dependencies as they are used in logging or implicitly affect the outcome of re-fetch logic

  // Function to optimistically update global metrics for immediate UI feedback
  const setProvisionalGlobalMetrics = useCallback((gameXP: number, gameAccuracy: number) => {
    console.log(`[GameContext] Setting provisional global metrics. Game XP: ${gameXP}, Game Acc: ${gameAccuracy}`);
    console.log(`[GameContext] Current global XP: ${globalXP}, Global Acc: ${globalAccuracy}, Games Played (for avg): ${gamesPlayedForAvg}`);

    const newProvisionalXP = globalXP + gameXP;
    // Ensure gamesPlayedForAvg is a non-negative integer before incrementing
    const currentGamesCount = Math.max(0, gamesPlayedForAvg || 0);
    const newTotalGamesForAvg = currentGamesCount + 1;
    
    let newProvisionalAccuracy;
    if (newTotalGamesForAvg === 1) {
      newProvisionalAccuracy = gameAccuracy;
    } else {
      // Weighted average: (current_avg * old_games_count + new_game_accuracy) / new_total_games_count
      // Ensure globalAccuracy is a number before using in calculation
      const currentAvgAccuracy = Number(globalAccuracy) || 0;
      newProvisionalAccuracy = ((currentAvgAccuracy * currentGamesCount) + gameAccuracy) / newTotalGamesForAvg;
    }
    // Clamp accuracy between 0 and 100 and round to a reasonable number of decimals
    newProvisionalAccuracy = Math.max(0, Math.min(100, parseFloat(newProvisionalAccuracy.toFixed(2))));

    setGlobalXP(newProvisionalXP);
    setGlobalAccuracy(newProvisionalAccuracy);
    setGamesPlayedForAvg(newTotalGamesForAvg); // Update games played count for next provisional update
    
    // We don't need to do anything special for guest users here
    // The database update will be handled by updateUserMetrics in FinalResultsPage

    console.log(`[GameContext] Provisional metrics updated: New Global XP: ${newProvisionalXP}, New Global Acc: ${newProvisionalAccuracy}, New Games Played (for avg): ${newTotalGamesForAvg}`);
  }, [globalXP, globalAccuracy, gamesPlayedForAvg]);

  // Update game accuracy and XP whenever round results change
  useEffect(() => {
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Recalculating game accuracy and XP from round results`);
    
    if (roundResults.length === 0) {
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] No round results, resetting accuracy and XP to 0`);
      setTotalGameAccuracy(0);
      setTotalGameXP(0);
      return;
    }
    
    // Calculate total XP from all rounds
    const xpSum = roundResults.reduce((sum, result, index) => {
      const score = result.score || 0;
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} XP:`, {
        round: index + 1,
        score,
        xpWhere: result.xpWhere,
        xpWhen: result.xpWhen
      });
      return sum + score;
    }, 0);
    
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Total game XP from rounds:`, xpSum);
    setTotalGameXP(xpSum);
    
    // Calculate per-round percentages
    const roundPercentages = roundResults.map((result, index) => {
      let roundPct: number;
      
      // Check if xpWhere and xpWhen are available
      if (result.xpWhere !== undefined && result.xpWhen !== undefined) {
        roundPct = Math.min(100, Math.round(((result.xpWhere + result.xpWhen) / 200) * 100));
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from xpWhere/xpWhen):`, {
          xpWhere: result.xpWhere,
          xpWhen: result.xpWhen,
          calculatedPct: roundPct
        });
      } else {
        const maxRoundScore = 1000; // This seems to be a legacy or incorrect max score for percentage calculation
        // Assuming score is out of 200 for percentage calculation similar to xpWhere/xpWhen logic
        roundPct = result.score ? Math.round((result.score / 200) * 100) : 0; 
        roundPct = Math.min(100, roundPct); // Cap at 100%
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from score/200):`, {
          score: result.score,
          maxScore: 200, // Corrected for percentage
          calculatedPct: roundPct
        });
      }
      
      return roundPct;
    });
    
    const avgPercentage = roundPercentages.length > 0
      ? roundPercentages.reduce((sum, pct) => sum + pct, 0) / roundPercentages.length
      : 0;
    
    const finalAccuracy = Math.min(100, Math.round(avgPercentage));
    
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Final game accuracy calculation:`, {
      roundPercentages,
      avgPercentage,
      finalAccuracy,
      totalRounds: roundResults.length
    });
    
    setTotalGameAccuracy(finalAccuracy);
    
  }, [roundResults, gameId]);
  
  const refreshGlobalMetrics = useCallback(async () => {
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics called`);
    const startTime = performance.now();
    try {
      await fetchGlobalMetrics();
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics completed in ${performance.now() - startTime}ms`);
    } catch (error) {
      console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error in refreshGlobalMetrics:`, error);
      // Not re-throwing, allow app to continue
    }
  }, [fetchGlobalMetrics, gameId]);

  // Initial fetch of global metrics when the provider mounts
  useEffect(() => {
    fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  // Log gameId whenever it changes for debugging
  useEffect(() => {
    if (gameId) {
      console.log(`[GameContext] [GameID: ${gameId}] Game ID state updated.`);
    }
  }, [gameId]);

  // Load game settings from localStorage on initial load
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('globalGameSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.timerSeconds !== undefined) {
          setRoundTimerSec(parsed.timerEnabled ? parsed.timerSeconds : 0);
          console.log(`Loaded timer settings from localStorage: ${parsed.timerEnabled ? parsed.timerSeconds : 0}s`);
        }
        if (parsed.hintsPerGame !== undefined) {
          setHintsAllowed(parsed.hintsPerGame);
          console.log(`Loaded hints settings from localStorage: ${parsed.hintsPerGame} hints`);
        }
        if (parsed.timerEnabled !== undefined) {
          setTimerEnabled(parsed.timerEnabled);
          console.log(`Loaded timer enabled setting from localStorage: ${parsed.timerEnabled}`);
        }
      }
    } catch (error) {
      console.error('Error loading game settings from localStorage:', error);
    }
  }, []);

  // Function to fetch images and start a new game
  const startGame = useCallback(async (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean }) => {
    console.log("Starting new game...");
    clearSavedGameState(); // Clear any existing saved state
    setIsLoading(true);
    setError(null);
    setImages([]); // Clear previous images
    setRoundResults([]); // Clear previous results
    
    applyGameSettings(settings);
    
    try {
      const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newGameId = uuidv4();
      setGameId(newGameId);
      console.log(`[GameContext] [GameID: ${newGameId}] Starting new game, roomId: ${newRoomId}`);
      setRoomId(newRoomId);

      const { data: imageBatch, error: fetchError } = await supabase
        .from('images')
        .select('id, title, description, latitude, longitude, year, image_url, location_name') 
        .eq('ready', true)
        .limit(20);
        
      if (fetchError) {
        console.error("Error fetching images:", fetchError);
        throw new Error(`Failed to fetch images: ${fetchError.message}`);
      }

      if (!imageBatch || imageBatch.length < 5) {
        console.warn("Could not fetch at least 5 images, fetched:", imageBatch?.length);
        throw new Error(`Database only contains ${imageBatch?.length || 0} images. Need 5 to start.`);
      }

      const shuffledBatch = shuffleArray(imageBatch);
      const selectedImages = shuffledBatch.slice(0, 5);

      const processedImages = await Promise.all(
        selectedImages.map(async (img) => {
          let finalUrl = img.image_url;
          if (finalUrl && !finalUrl.startsWith('http')) {
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(finalUrl);
            finalUrl = urlData?.publicUrl || 'placeholder.jpg';
          } else if (!finalUrl) {
              finalUrl = 'placeholder.jpg';
          }
          
          return {
            id: img.id,
            title: img.title || 'Untitled',
            description: img.description || 'No description.',
            latitude: img.latitude || 0,
            longitude: img.longitude || 0,
            year: img.year || 0,
            image_url: img.image_url,
            location_name: img.location_name || 'Unknown Location',
            url: finalUrl
          } as GameImage;
        })
      );

      setImages(processedImages);
      console.log("Selected 5 images stored in context:", processedImages);

      localStorage.setItem('gh_game_settings', JSON.stringify({
        hintsAllowed,
        roundTimerSec,
        timerEnabled
      }));

      console.log(`Game settings: ${hintsAllowed} hints, ${roundTimerSec}s timer, timer enabled: ${timerEnabled}`);
      
      setIsLoading(false);
      
      setTimeout(() => {
        navigate(`/test/game/room/${newRoomId}/round/1`);
      }, 100);

    } catch (err) {
      console.error("Error in startGame:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
      // Consider a more user-friendly error display than alert
      // alert('Failed to start game. Please try again.'); 
    }
  }, [navigate, hintsAllowed, roundTimerSec, timerEnabled, clearSavedGameState]);

  const recordRoundResult = useCallback((resultData: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => {
    if (currentRoundIndex < 0 || currentRoundIndex >= images.length) {
        console.error("Cannot record result for invalid round index:", currentRoundIndex);
        return;
    }
    const currentImage = images[currentRoundIndex];
    
    let xpWhere = resultData.xpWhere;
    let xpWhen = resultData.xpWhen;
    
    if (resultData.score && (xpWhere === undefined || xpWhen === undefined)) {
        xpWhere = Math.round(resultData.score * 0.7); // Example split
        xpWhen = Math.round(resultData.score * 0.3); // Example split
    }
    
    const fullResult: RoundResult = {
        roundIndex: currentRoundIndex,
        imageId: currentImage.id,
        actualCoordinates: { lat: currentImage.latitude, lng: currentImage.longitude },
        guessCoordinates: resultData.guessCoordinates,
        distanceKm: resultData.distanceKm,
        score: resultData.score,
        guessYear: resultData.guessYear,
        xpWhere,
        xpWhen,
        hintsUsed: resultData.hintsUsed || 0
    };

    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Recording result for round ${currentRoundIndex + 1}:`, fullResult);
    setRoundResults(prevResults => {
        const existingIndex = prevResults.findIndex(r => r.roundIndex === currentRoundIndex);
        if (existingIndex !== -1) {
            const updatedResults = [...prevResults];
            updatedResults[existingIndex] = fullResult;
            return updatedResults;
        } else {
            return [...prevResults, fullResult];
        }
    });
  }, [images, gameId]);

  const handleTimeUp = useCallback(async (currentRoundIndex: number) => {
    console.log(`[GameContext] Time is up for round ${currentRoundIndex + 1}`);
    
    if (!images || images.length === 0 || !images[currentRoundIndex]) {
      console.error(`[GameContext] handleTimeUp: Images array is empty or current image not found for index ${currentRoundIndex}. Cannot record result.`);
      return; 
    }

    const currentImage = images[currentRoundIndex];
    const hintsUsedForRound = (roundResults && roundResults[currentRoundIndex]?.hintsUsed !== undefined) 
                              ? roundResults[currentRoundIndex].hintsUsed 
                              : 0;
    
    // Get the current year guess if it exists (from partial round result), or use default year (1932)
    // This preserves the user's selected year rather than setting it to null or the correct answer
    const currentYearGuess = (roundResults && roundResults[currentRoundIndex]?.guessYear) || 1932;

    const resultDataForTimeout: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'> = {
      guessCoordinates: null, // No guess made as time is up
      distanceKm: null,       // No distance calculated for location
      score: 0,               // Score for a timed-out round is 0
      guessYear: currentYearGuess, // Preserve user's selected year or use default
      xpWhere: 0,             // Location XP is 0 as per requirement
      xpWhen: 0,              // Time/Year XP is 0
      accuracy: 0,            // Overall accuracy for this round is 0
      hintsUsed: hintsUsedForRound, // Preserve hints used if any, otherwise 0
    };

    console.log('[GameContext] handleTimeUp: Recording result for timed-out round:', resultDataForTimeout);
    recordRoundResult(resultDataForTimeout, currentRoundIndex);
    
    // Explicitly navigate to the round results page
    // Use the URL room ID from the browser if available, otherwise use gameId
    // This ensures consistency between URL and context room IDs
    const urlParams = new URLSearchParams(window.location.pathname);
    const urlRoomId = window.location.pathname.split('/room/')[1]?.split('/')[0] || null;
    
    // Use URL room ID if available, otherwise fall back to context gameId
    const roomId = urlRoomId || gameId || 'default';
    
    const roundNumber = currentRoundIndex + 1; // Convert 0-based index to 1-based round number
    console.log(`[GameContext] handleTimeUp: Navigating to results page for round ${roundNumber} with roomId ${roomId}`);
    navigate(`/test/game/room/${roomId}/round/${roundNumber}/results`);
  }, [images, recordRoundResult, roundResults, navigate, gameId]);

  const resetGame = useCallback(() => {
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Resetting game state...`);
    clearSavedGameState();
    setRoomId(null);
    setGameId(null);
    setImages([]);
    setRoundResults([]);
    setError(null);
    setIsLoading(false);
  }, [clearSavedGameState, gameId]);

  // Timer initialization is handled in GameRoundPage.tsx

  const contextValue = {
    gameId,
    setGameId, // Add setGameId to the context value
    roomId,
    images,
    roundResults,
    isLoading,
    error,
    hintsAllowed,
    roundTimerSec,
    timerEnabled,
    totalGameAccuracy,
    totalGameXP,
    globalAccuracy,
    globalXP,
    gamesPlayedForAvg,
    setHintsAllowed,
    setRoundTimerSec: handleSetRoundTimerSec,
    setTimerEnabled,
    startGame,
    recordRoundResult,
    handleTimeUp,
    resetGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics,
    setProvisionalGlobalMetrics,
  };

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
};
export const useGame = (): GameContextState => { // Ensure hook returns the full state type
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

// Note: We've moved distance and score calculation to gameCalculations.ts
// These functions are kept here for backward compatibility but marked as deprecated

/**
 * @deprecated Use calculateDistanceKm from gameCalculations.ts instead
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  console.warn('calculateDistance is deprecated. Use calculateDistanceKm from gameCalculations.ts instead');
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * @deprecated Use calculateRoundScore from gameCalculations.ts instead
 */
export function calculateScore(distanceKm: number): number {
    console.warn('calculateScore is deprecated. Use calculateRoundScore from gameCalculations.ts instead');
    const maxDistanceForPoints = 2000; // Max distance (km) where points are awarded
    const maxScore = 5000;

    if (distanceKm < 0) return 0; // Should not happen
    if (distanceKm === 0) return maxScore; // Perfect guess
    if (distanceKm > maxDistanceForPoints) return 0;

    // Example: Linear decrease (you could use logarithmic, exponential, etc.)
    const score = Math.round(maxScore * (1 - distanceKm / maxDistanceForPoints));

    // Ensure score is within bounds [0, maxScore]
    return Math.max(0, Math.min(score, maxScore));
} 