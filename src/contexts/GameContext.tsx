import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { v4 as uuidv4 } from 'uuid'; // For generating unique game IDs
import { getNewImages, getOrPersistRoomImages, recordPlayedImages } from '@/utils/imageHistory';
import { ROUNDS_PER_GAME } from '@/utils/gameCalculations';
import { Hint } from '@/hooks/useHintV2';
import { RoundResult, GuessCoordinates } from '@/types';
import { useGamePreparation, PrepStatus, PreparedImage } from '@/hooks/useGamePreparation';

// Define the structure of an image object based on actual schema
export interface GameImage {
  id: string;
  title: string;
  description?: string | null;
  source_citation?: string | null;
  // Keep fields that exist
  latitude: number;
  longitude: number;
  year: number;
  image_url: string; // Use actual column name
  location_name: string;
  url: string; // Keep processed url field
  firebase_url?: string; // Optional Firebase image URL
  confidence?: number; // Add confidence score
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
  startGame: (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean; roomId?: string; seed?: string }) => Promise<void>; // Updated to accept settings incl. roomId + seed
  recordRoundResult: (result: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => void;
  handleTimeUp?: (currentRoundIndex: number) => void;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  setProvisionalGlobalMetrics: (gameXP: number, gameAccuracy: number) => void;
  hydrateRoomImages: (roomId: string) => Promise<void>;
  // Preparation progress (for future UI)
  prepStatus: PrepStatus;
  prepProgress: { loaded: number; total: number };
  prepError: string | null;
  abortPreparation: () => void;
  // New: expose prepared images and which indices are loaded for overlay previews
  preparedImages: PreparedImage[];
  preparedLoadedIndices: Set<number>;
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
  const [timerEnabled, setTimerEnabled] = useState<boolean>(true); // Default to timer enabled - MUST be true for timer to work

  // Keep roundTimerSec in sync with timerSeconds from settings store
  useEffect(() => {
    setRoundTimerSec(timerSeconds);
  }, [timerSeconds]);

  // Accept settings from startGame
  const applyGameSettings = (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean; roomId?: string }) => {
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
  
  // Refs mirroring global metrics to support stable provisional updater without stale closures
  const globalXPRef = React.useRef<number>(0);
  const globalAccuracyRef = React.useRef<number>(0);
  const gamesPlayedForAvgRef = React.useRef<number>(0);

  useEffect(() => { globalXPRef.current = globalXP; }, [globalXP]);
  useEffect(() => { globalAccuracyRef.current = globalAccuracy; }, [globalAccuracy]);
  useEffect(() => { gamesPlayedForAvgRef.current = gamesPlayedForAvg; }, [gamesPlayedForAvg]);
  const navigate = useNavigate();
  const {
    prepare,
    abort: abortPreparation,
    status: prepStatus,
    error: prepError,
    progress: prepProgress,
    prepared: preparedImages,
    loadedIndices: preparedLoadedIndices,
  } = useGamePreparation();

  // Save game state to DB whenever it changes
  const saveGameState = useCallback(() => {
    console.log('Game state persisted to DB via recordRoundResult');
  }, []);

  // Load game state from DB on mount
  useEffect(() => {
    const loadGameState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !gameId) {
          console.log('No user or game ID found, skipping DB load');
          return;
        }

        // Load round results from DB
        const { data: dbResults, error: resultsError } = await supabase
          .from('round_results')
          .select('*')
          .eq('user_id', user.id)
          .eq('game_id', gameId)
          .order('round_index', { ascending: true });

        if (resultsError) {
          console.error('Error loading round results from DB:', resultsError);
          return;
        }

        // Hints are persisted per round via round_id and managed by useHintV2.
        // Reconstructing a game-wide hint state here is not supported with the current schema
        // and is unnecessary. Hint debts and purchases are fetched where needed (e.g., RoundResultsPage).
        console.log('Skipping legacy game-wide round_hints reconstruction; handled per-round via useHintV2.');

        if (dbResults && dbResults.length > 0) {
          const mappedResults: RoundResult[] = dbResults.map(dbResult => ({
            roundIndex: dbResult.round_index,
            imageId: dbResult.image_id,
            actualCoordinates: { lat: dbResult.actual_lat, lng: dbResult.actual_lng },
            guessCoordinates: dbResult.guess_lat && dbResult.guess_lng 
              ? { lat: dbResult.guess_lat, lng: dbResult.guess_lng }
              : undefined,
            distanceKm: dbResult.distance_km,
            score: dbResult.score,
            accuracy: dbResult.accuracy,
            guessYear: dbResult.guess_year,
            xpWhere: dbResult.xp_where,
            xpWhen: dbResult.xp_when,
            hintsUsed: dbResult.hints_used
          }));

          setRoundResults(mappedResults);
          console.log('Loaded round results from DB:', mappedResults);
          
          // Clear localStorage since we're using DB
          localStorage.removeItem('gh_current_game');
        }
      } catch (error) {
        console.error('Error loading game state from DB:', error);
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
  }, []);

  // Function to optimistically update global metrics for immediate UI feedback
  // Stable identity to avoid triggering effects that depend on it
  const setProvisionalGlobalMetrics = useCallback((gameXP: number, gameAccuracy: number) => {
    const prevXP = Number(globalXPRef.current) || 0;
    const prevAcc = Number(globalAccuracyRef.current) || 0;
    const prevGames = Math.max(0, Number(gamesPlayedForAvgRef.current) || 0);

    console.log('[GameContext] Setting provisional global metrics.', {
      gameXP,
      gameAccuracy,
      prevXP,
      prevAcc,
      prevGames
    });

    const newProvisionalXP = prevXP + gameXP;
    const newTotalGamesForAvg = prevGames + 1;

    const weightedAcc = newTotalGamesForAvg === 1
      ? gameAccuracy
      : ((prevAcc * prevGames) + gameAccuracy) / newTotalGamesForAvg;
    const newProvisionalAccuracy = Math.max(0, Math.min(100, parseFloat(weightedAcc.toFixed(2))));

    setGlobalXP(newProvisionalXP);
    setGlobalAccuracy(newProvisionalAccuracy);
    setGamesPlayedForAvg(newTotalGamesForAvg);

    console.log('[GameContext] Provisional metrics updated', {
      newProvisionalXP,
      newProvisionalAccuracy,
      newTotalGamesForAvg
    });
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
  const startGame = useCallback(async (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean; roomId?: string; seed?: string }) => {
    console.log("Starting new game...");
    clearSavedGameState(); // Clear any existing saved state
    setIsLoading(true);
    setError(null);
    setImages([]); // Clear previous images
    setRoundResults([]); // Clear previous results
    
    // Apply game settings provided by the caller (no forced defaults)
    applyGameSettings(settings);
    
    try {
      const newRoomId = settings?.roomId && settings.roomId.trim().length > 0
        ? settings.roomId
        : `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newGameId = uuidv4();
      setGameId(newGameId);
      console.log(`[GameContext] [GameID: ${newGameId}] Starting new game, roomId: ${newRoomId}, seed: ${settings?.seed ?? 'none'}`);
      setRoomId(newRoomId);
      // Try new atomic RPC + preload path first
      const { data: { user } } = await supabase.auth.getUser();
      let preparedImages: GameImage[] | null = null;
      try {
        const prep = await prepare({
          userId: user?.id ?? null,
          roomId: settings?.roomId ? newRoomId : null,
          count: ROUNDS_PER_GAME,
          seed: settings?.seed ?? null,
        });
        preparedImages = prep.images.map((img) => ({
          id: img.id,
          title: img.title,
          description: img.description,
          source_citation: img.source_citation,
          latitude: img.latitude,
          longitude: img.longitude,
          year: img.year,
          image_url: img.image_url,
          location_name: img.location_name,
          url: img.url,
          firebase_url: img.firebase_url,
          confidence: img.confidence,
        }));
      } catch (prepErr) {
        console.warn('[GameContext] prepare() failed, falling back to legacy selection', prepErr);
      }

      if (!preparedImages) {
        // Legacy hybrid no-repeat fetch
        const imageBatch = settings?.roomId
          ? await getOrPersistRoomImages(newRoomId, `${newRoomId}-${settings?.seed ?? ''}`, ROUNDS_PER_GAME)
          : await getNewImages(user?.id ?? null, ROUNDS_PER_GAME);
          
        if (!imageBatch || imageBatch.length < ROUNDS_PER_GAME) {
          console.warn("Could not fetch at least 5 images, fetched:", imageBatch?.length);
          throw new Error(`Database only contains ${imageBatch?.length || 0} images. Need ${ROUNDS_PER_GAME} to start.`);
        }

        // For solo play, shuffle locally; for multiplayer (roomId present), keep seeded order
        const selectedImages = settings?.roomId ? (imageBatch as any) : shuffleArray(imageBatch as any);
        const processedImages = await processRawImages(selectedImages);
        setImages(processedImages);
        console.log("Selected 5 images stored in context:", processedImages);
      } else {
        setImages(preparedImages);
        console.log("Prepared and preloaded 5 images stored in context:", preparedImages);
      }

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

  // Helper to process raw DB images into GameImage objects
  const processRawImages = useCallback(async (selectedImages: any[]): Promise<GameImage[]> => {
    return Promise.all(
      selectedImages.map(async (img: any) => {
        if (img.firebase_url) {
          return {
            id: img.id,
            title: img.title || 'Untitled',
            description: img.description || 'No description.',
            latitude: img.latitude || 0,
            longitude: img.longitude || 0,
            year: img.year || 0,
            image_url: img.image_url,
            location_name: img.location_name || 'Unknown Location',
            url: img.firebase_url,
            firebase_url: img.firebase_url,
            confidence: img.confidence,
            source_citation: img.source_citation
          } as GameImage;
        }

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
          url: finalUrl,
          firebase_url: img.firebase_url ?? undefined,
          confidence: img.confidence,
          source_citation: img.source_citation
        } as GameImage;
      })
    );
  }, []);

  // Hydrate images from game_sessions for a room (used on refresh when context is empty)
  const hydrateRoomImages = useCallback(async (existingRoomId: string) => {
    try {
      if (!existingRoomId) return;
      if (images && images.length > 0) return; // already hydrated
      const { data: { user } } = await supabase.auth.getUser();
      const batch = await getOrPersistRoomImages(existingRoomId, `${existingRoomId}`, ROUNDS_PER_GAME);
      if (!batch || batch.length === 0) return;
      const processed = await processRawImages(batch as any[]);
      setImages(processed);
      setRoomId(existingRoomId);
      if (!gameId) {
        // Generate a lightweight gameId so subsequent results can persist
        setGameId(uuidv4());
      }
    } catch (e) {
      console.warn('[GameContext] hydrateRoomImages failed', e);
    }
  }, [images, gameId, processRawImages]);

  const recordRoundResult = useCallback(async (resultData: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => {
    if (!gameId) {
      console.error('[GameContext] CRITICAL: gameId is null. Cannot record round result. This should not happen if a game is in progress.');
      return;
    }

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
    
    // Persist to DB
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found, cannot persist round result');
        return;
      }

      const { data, error } = await supabase
        .from('round_results')
        .upsert({
          user_id: user.id,
          game_id: gameId,
          round_index: currentRoundIndex,
          image_id: currentImage.id,
          score: fullResult.score,
          accuracy: fullResult.accuracy,
          xp_where: fullResult.xpWhere,
          xp_when: fullResult.xpWhen,
          hints_used: fullResult.hintsUsed,
          distance_km: fullResult.distanceKm,
          guess_year: fullResult.guessYear,
          guess_lat: fullResult.guessCoordinates?.lat,
          guess_lng: fullResult.guessCoordinates?.lng,
          actual_lat: fullResult.actualCoordinates.lat,
          actual_lng: fullResult.actualCoordinates.lng
        }, {
          onConflict: 'user_id,game_id,round_index'
        });

      if (error) {
        console.error('Error persisting round result:', error);
      } else {
        console.log('Round result persisted successfully:', data);
      }
    } catch (error) {
      console.error('Error in recordRoundResult:', error);
    }

    // Update local state
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

  const handleTimeUp = useCallback((currentRoundIndex: number) => {
    if (currentRoundIndex < 0 || currentRoundIndex >= images.length) {
      console.error(`[GameContext] handleTimeUp: Invalid round index ${currentRoundIndex}.`);
      return;
    }

    const existingResult = roundResults.find(r => r.roundIndex === currentRoundIndex);
    if (existingResult) {
      console.log(`[GameContext] handleTimeUp: Result for round ${currentRoundIndex + 1} already exists.`);
      return; // Avoid re-submitting
    }

    console.log(`[GameContext] Time's up for round ${currentRoundIndex + 1}! Recording null result.`);

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

  // === Record played images when game ends ===
  useEffect(() => {
    (async () => {
      if (images.length > 0 && roundResults.length === images.length) {
        const { data: { user } } = await supabase.auth.getUser();
        try {
          await recordPlayedImages(user?.id ?? null, images.map((img) => img.id));
        } catch (err) {
          console.error('[GameContext] Failed to record played images', err);
        }
      }
    })();
  }, [images, roundResults]);

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
    hydrateRoomImages,
    // preparation state (no UI coupling)
    prepStatus,
    prepProgress,
    prepError,
    abortPreparation,
    preparedImages,
    preparedLoadedIndices,
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
