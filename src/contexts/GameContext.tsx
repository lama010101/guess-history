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
  refreshGlobalMetrics: () => Promise<void>; // Add this line
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[]; // Store results for each round
  isLoading: boolean;
  error: string | null;
  hintsAllowed: number; // Number of hints allowed per game
  roundTimerSec: number; // Timer duration for each round in seconds
  totalGameAccuracy: number; // Current game accuracy
  totalGameXP: number; // Current game XP
  globalAccuracy: number; // Average accuracy across all games
  globalXP: number; // Total XP earned across all games
  setHintsAllowed: (hints: number) => void; // Function to update hints allowed
  setRoundTimerSec: (seconds: number) => void; // Function to update round timer
  startGame: () => Promise<void>;
  recordRoundResult: (result: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => void; // Function to record results
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>; // Function to fetch global metrics from Supabase or localStorage
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

  // Keep roundTimerSec in sync with timerSeconds from settings store
  useEffect(() => {
    setRoundTimerSec(timerSeconds);
  }, [timerSeconds]);

  // Accept settings from startGame
  const applyGameSettings = (settings?: { timerSeconds?: number; hintsPerGame?: number }) => {
    if (settings) {
      if (typeof settings.timerSeconds === 'number') setRoundTimerSec(settings.timerSeconds);
      if (typeof settings.hintsPerGame === 'number') setHintsAllowed(settings.hintsPerGame);
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
        totalGameAccuracy,
        totalGameXP,
        timestamp: Date.now()
      };
      localStorage.setItem('gh_current_game', JSON.stringify(gameState));
    }
  }, [roomId, images, roundResults, hintsAllowed, roundTimerSec, totalGameAccuracy, totalGameXP]);

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

  // Function to fetch global metrics from Supabase or localStorage
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      console.log('Fetching global metrics...');
      // First check for guest session in localStorage
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        try {
          const guestUser = JSON.parse(guestSession);
          const storageKey = `guest_metrics_${guestUser.id}`;
          const storedMetrics = localStorage.getItem(storageKey);
          
          if (storedMetrics) {
            const metrics = JSON.parse(storedMetrics);
            // Ensure we have valid numbers
            const accuracyValue = typeof metrics.overall_accuracy === 'number' ? metrics.overall_accuracy : 0;
            const xpValue = typeof metrics.xp_total === 'number' ? metrics.xp_total : 0;
            
            // Set state with verified numeric values
            console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Updating global metrics for guest user:`, { 
              previousAccuracy: globalAccuracy,
              newAccuracy: accuracyValue,
              previousXP: globalXP,
              newXP: xpValue,
              source: 'guest-local-storage',
              timestamp: new Date().toISOString()
            });
            
            setGlobalAccuracy(accuracyValue);
            setGlobalXP(xpValue);
            return;
          } else {
            console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Initializing new guest metrics`);
            setGlobalAccuracy(0);
            setGlobalXP(0);
            const initialMetrics = {
              user_id: guestUser.id,
              xp_total: 0,
              overall_accuracy: 0,
              games_played: 0,
              updated_at: new Date().toISOString()
            };
            localStorage.setItem(storageKey, JSON.stringify(initialMetrics));
            return;
          }
        } catch (e) {
          console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error parsing guest metrics:`, e);
        }
      }

      // If no guest session or error parsing it, try authenticated user
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Fetching metrics for authenticated user`);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] No authenticated user found, setting metrics to 0`);
        setGlobalAccuracy(0);
        setGlobalXP(0);
        return;
      }
      
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Fetching metrics for user ${user.id}`);
      const { data: metrics, error: fetchError } = await supabase
        .from('user_metrics')
        .select('overall_accuracy, xp_total')
        .eq('user_id', user.id)
        .single();
        
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No metrics found for user
          console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] No metrics found for user, initializing to 0`);
          setGlobalAccuracy(0);
          setGlobalXP(0);
        } else {
          console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error fetching user metrics:`, fetchError);
        }
        return;
      }
      
      if (metrics) {
        const newAccuracy = metrics.overall_accuracy || 0;
        const newXP = metrics.xp_total || 0;
        
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Updating global metrics for user:`, {
          userId: user.id,
          previousAccuracy: globalAccuracy,
          newAccuracy,
          previousXP: globalXP,
          newXP,
          source: 'supabase-fetch',
          timestamp: new Date().toISOString()
        });
        
        setGlobalAccuracy(newAccuracy);
        setGlobalXP(newXP);
      } else {
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] No metrics data returned from Supabase`);
        setGlobalAccuracy(0);
        setGlobalXP(0);
      }
    } catch (err) {
      console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error in fetchGlobalMetrics:`, err);
      setGlobalAccuracy(0);
      setGlobalXP(0);
    }
  }, []);

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
        // Use the formula: roundPct = Math.min(100, Math.round(((xpWhere + xpWhen)/200)*100))
        roundPct = Math.min(100, Math.round(((result.xpWhere + result.xpWhen) / 200) * 100));
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from xpWhere/xpWhen):`, {
          xpWhere: result.xpWhere,
          xpWhen: result.xpWhen,
          calculatedPct: roundPct
        });
      } else {
        // Fallback to previous calculation method using score
        const maxRoundScore = 1000;
        roundPct = result.score ? Math.round((result.score / maxRoundScore) * 100) : 0;
        roundPct = Math.min(100, roundPct); // Cap at 100%
        console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from score):`, {
          score: result.score,
          maxScore: maxRoundScore,
          calculatedPct: roundPct
        });
      }
      
      return roundPct;
    });
    
    // Calculate average of all round percentages
    const avgPercentage = roundPercentages.length > 0
      ? roundPercentages.reduce((sum, pct) => sum + pct, 0) / roundPercentages.length
      : 0;
    
    // Round and cap at 100%
    const finalAccuracy = Math.min(100, Math.round(avgPercentage));
    
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Final game accuracy calculation:`, {
      roundPercentages,
      avgPercentage,
      finalAccuracy,
      totalRounds: roundResults.length
    });
    
    setTotalGameAccuracy(finalAccuracy);
    
  }, [roundResults]);
  
  // Add a refreshGlobalMetrics function to force a metrics refresh
  const refreshGlobalMetrics = useCallback(async () => {
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics called`);
    const startTime = performance.now();
    try {
      await fetchGlobalMetrics();
      console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics completed in ${performance.now() - startTime}ms`);
    } catch (error) {
      console.error(`[GameContext] [GameID: ${gameId || 'N/A'}] Error in refreshGlobalMetrics:`, error);
      throw error;
    }
  }, [fetchGlobalMetrics]);

  // Fetch global metrics on initial load
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
      }
    } catch (error) {
      console.error('Error loading game settings from localStorage:', error);
    }
  }, []);

  // Function to fetch images and start a new game
  const startGame = useCallback(async (settings?: { timerSeconds?: number; hintsPerGame?: number }) => {
    console.log("Starting new game...");
    clearSavedGameState(); // Clear any existing saved state
    setIsLoading(true);
    setError(null);
    setImages([]); // Clear previous images
    setRoundResults([]); // Clear previous results
    
    applyGameSettings(settings);
    
    try {
      // Generate a simple unique room ID for this session
      const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newGameId = uuidv4(); // Generate unique game ID
      setGameId(newGameId);
      console.log(`[GameContext] [GameID: ${newGameId}] Starting new game, roomId: ${newRoomId}`);
      setRoomId(newRoomId);
      console.log(`Generated Room ID: ${newRoomId}`);

      // Fetch a larger batch of images (e.g., 20) without specific ordering
      console.log("Fetching batch of images from Supabase...");
      const { data: imageBatch, error: fetchError } = await supabase
        .from('images')
        // Select fields that exist in the DB schema
        .select('id, title, description, latitude, longitude, year, image_url, location_name') 
        // Only fetch production-ready images
        .eq('ready', true)
        // Remove the .order() clause
        .limit(20); // Fetch more images than needed
        
      if (fetchError) {
        console.error("Error fetching images:", fetchError);
        throw new Error(`Failed to fetch images: ${fetchError.message}`);
      }

      if (!imageBatch || imageBatch.length < 5) {
        // Handle case where not enough images are found (even in the larger batch)
        console.warn("Could not fetch at least 5 images, fetched:", imageBatch?.length);
        throw new Error(`Database only contains ${imageBatch?.length || 0} images. Need 5 to start.`);
      }

      console.log(`Fetched ${imageBatch.length} images initially.`);

      // Shuffle the fetched images
      const shuffledBatch = shuffleArray(imageBatch);

      // Select the first 5 images from the shuffled batch
      const selectedImages = shuffledBatch.slice(0, 5);
      console.log(`Selected 5 images after shuffling.`);


      // Process the selected 5 images
      const processedImages = await Promise.all(
        selectedImages.map(async (img) => {
          let finalUrl = img.image_url;
          if (finalUrl && !finalUrl.startsWith('http')) {
            // Assume image_url is a path in Supabase storage
            const { data: urlData } = supabase.storage.from('images').getPublicUrl(finalUrl);
            finalUrl = urlData?.publicUrl || 'placeholder.jpg'; // Use placeholder if URL fails
          } else if (!finalUrl) {
              finalUrl = 'placeholder.jpg'; // Use placeholder if image_url is null/empty
          }
          
          return {
            id: img.id,
            title: img.title || 'Untitled',
            description: img.description || 'No description.',
            latitude: img.latitude || 0,
            longitude: img.longitude || 0,
            year: img.year || 0,
            image_url: img.image_url, // Keep original image_url if needed elsewhere
            location_name: img.location_name || 'Unknown Location',
            url: finalUrl // Final processed URL for display
          } as GameImage;
        })
      );

      setImages(processedImages);
      console.log("Selected 5 images stored in context:", processedImages);

      // Save game settings to local storage for persistence
      localStorage.setItem('gh_game_settings', JSON.stringify({
        hintsAllowed,
        roundTimerSec
      }));

      console.log(`Game settings: ${hintsAllowed} hints, ${roundTimerSec}s timer`);
      
      // Set loading to false before navigation to prevent UI issues
      setIsLoading(false);
      
      // Navigate to the first round - ensure this matches the route in App.tsx
      console.log(`[GameContext] [GameID: ${gameId || newGameId}] Navigating to round 1 for room ${newRoomId}`);
      // Use a setTimeout to ensure state updates have completed before navigation
      setTimeout(() => {
        navigate(`/test/game/room/${newRoomId}/round/1`);
      }, 100);

    } catch (err) {
      console.error("Error in startGame:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
      alert('Failed to start game. Please try again.');
    }
  }, [navigate, hintsAllowed, roundTimerSec, clearSavedGameState]);

  // Function to record the result of a round
  const recordRoundResult = useCallback((resultData: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => {
    if (currentRoundIndex < 0 || currentRoundIndex >= images.length) {
        console.error("Cannot record result for invalid round index:", currentRoundIndex);
        return;
    }
    const currentImage = images[currentRoundIndex];
    
    // Calculate xpWhere and xpWhen if score is available but they aren't
    let xpWhere = resultData.xpWhere;
    let xpWhen = resultData.xpWhen;
    
    if (resultData.score && (xpWhere === undefined || xpWhen === undefined)) {
        // Use 70% of score for xpWhere and 30% for xpWhen, as seen in RoundResultsPage.tsx
        xpWhere = Math.round(resultData.score * 0.7);
        xpWhen = Math.round(resultData.score * 0.3);
        console.log(`Calculated xpWhere (${xpWhere}) and xpWhen (${xpWhen}) from score ${resultData.score}`);
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
    };

    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Recording result for round ${currentRoundIndex + 1}:`, fullResult);
    setRoundResults(prevResults => {
        // Avoid duplicates - replace if already exists for this index
        const existingIndex = prevResults.findIndex(r => r.roundIndex === currentRoundIndex);
        if (existingIndex !== -1) {
            const updatedResults = [...prevResults];
            updatedResults[existingIndex] = fullResult;
            return updatedResults;
        } else {
            return [...prevResults, fullResult];
        }
    });
  }, [images]); // Dependency on images to get actual coordinates

  // Function to reset game state
  const resetGame = useCallback(() => {
    console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Resetting game state...`);
    clearSavedGameState();
    setRoomId(null);
    setGameId(null); // Reset gameId
    setImages([]);
    setRoundResults([]); // Clear results on reset
    setError(null);
    setIsLoading(false);
    // Optionally navigate home or to a new game setup screen
    // navigate('/'); // Example: navigate home
  }, [clearSavedGameState]);

  // Value provided by the context
  const value: GameContextState = {
    gameId, // Provide gameId in context
    roomId,
    images,
    roundResults,
    isLoading,
    error,
    hintsAllowed,
    roundTimerSec,
    totalGameAccuracy,
    totalGameXP,
    globalAccuracy,
    globalXP,
    setHintsAllowed,
    setRoundTimerSec: handleSetRoundTimerSec,
    startGame,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics // Add this line
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// Custom hook to use the GameContext
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