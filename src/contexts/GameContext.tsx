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
import { getLevelUpConstraints } from '@/lib/levelUpConfig';
import { awardRoundAchievements, awardGameAchievements } from '@/utils/achievements';
import { setCurrentRoundInSession } from '@/utils/roomState';

// Dev logging guard
const isDev = (import.meta as any)?.env?.DEV === true;
const devLog = (...args: any[]) => { if (isDev) console.log(...args); };
const devDebug = (...args: any[]) => { if (isDev) console.debug(...args); };

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
  startGame: (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean; roomId?: string; seed?: string; competeVariant?: 'sync' | 'async' }) => Promise<void>; // Updated to accept settings incl. roomId + seed + competeVariant
  startLevelUpGame: (level: number, settings?: { roomId?: string; seed?: string }) => Promise<void>;
  recordRoundResult: (result: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number) => void;
  handleTimeUp?: (currentRoundIndex: number) => void;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  setProvisionalGlobalMetrics: (gameXP: number, gameAccuracy: number) => void;
  hydrateRoomImages: (roomId: string) => Promise<void>;
  // Synchronize URL param roomId into context and ensure membership
  syncRoomId: (roomId: string) => Promise<void>;
  // Preparation progress (for future UI)
  prepStatus: PrepStatus;
  prepProgress: { loaded: number; total: number };
  prepError: string | null;
  abortPreparation: () => void;
  resetPreparation: () => void;
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
    reset: resetPreparation,
    status: prepStatus,
    error: prepError,
    progress: prepProgress,
    prepared: preparedImages,
    loadedIndices: preparedLoadedIndices,
  } = useGamePreparation();

  // Ensure the current user is registered as a participant of a multiplayer room
  const ensureSessionMembership = useCallback(async (targetRoomId: string, providedUserId?: string) => {
    try {
      if (!targetRoomId) return;
      let userId = providedUserId;
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? undefined;
      }
      if (!userId) return;

      // Fetch display name from profiles (do not invent values)
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .maybeSingle();
      if (profErr) {
        // Non-fatal, continue with null display_name
        console.warn('[GameContext] ensureSessionMembership: profile fetch error', profErr);
      }

      const displayName = profile?.display_name ?? null;

      const { error: upsertErr } = await supabase
        .from('session_players')
        .upsert({ room_id: targetRoomId, user_id: userId, display_name: displayName }, { onConflict: 'room_id,user_id' });
      if (upsertErr) {
        console.warn('[GameContext] ensureSessionMembership: upsert failed', upsertErr);
      }
    } catch (e) {
      console.warn('[GameContext] ensureSessionMembership failed', e);
    }
  }, []);

  // Backfill any NULL room_id rows for this game/user once we know the room
  const repairMissingRoomId = useCallback(async (knownRoomId: string) => {
    try {
      if (!knownRoomId) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !gameId) return;
      const { error: updErr } = await supabase
        .from('round_results')
        .update({ room_id: knownRoomId })
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .is('room_id', null);
      if (updErr) {
        console.warn('[GameContext] repairMissingRoomId: update failed', updErr);
      } else {
        console.log(`[GameContext] repairMissingRoomId: backfilled room_id for game ${gameId} to`, knownRoomId);
      }
    } catch (e) {
      console.warn('[GameContext] repairMissingRoomId failed', e);
    }
  }, [gameId]);

  // Save game state to DB whenever it changes
  const saveGameState = useCallback(() => {
    devLog('Game state persisted to DB via recordRoundResult');
  }, []);

  // Load game state from DB on mount
  useEffect(() => {
    const loadGameState = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !gameId) {
          devLog('No user or game ID found, skipping DB load');
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
        devLog('Skipping legacy game-wide round_hints reconstruction; handled per-round via useHintV2.');

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
          devLog('Loaded round results from DB:', mappedResults);
          
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
      devLog('[GameContext] Fetching global metrics from Supabase...');
      
      // Get the current user (works for both authenticated and anonymous users)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        devLog('[GameContext] No user found (not even anonymous), setting metrics to 0');
        setGlobalAccuracy(0);
        setGlobalXP(0);
        setGamesPlayedForAvg(0);
        return;
      }
      
      devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Fetching metrics for user ${user.id}`);

      // Fetch metrics from Supabase (loosen local typing to avoid typed table drift)
      const sb: any = supabase;
      const { data: metrics, error: fetchError } = await sb
        .from('user_metrics')
        .select('xp_total, overall_accuracy, games_played')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No metrics found for user - this is normal for new users
          devLog(`[GameContext] No metrics found for user ${user.id}, initializing to 0`);
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

        devLog('[GameContext] Updating global metrics from fetch:', {
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
        devLog('[GameContext] No metrics data returned from Supabase for user:', user.id);
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

    devLog('[GameContext] Setting provisional global metrics.', {
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

    devLog('[GameContext] Provisional metrics updated', {
      newProvisionalXP,
      newProvisionalAccuracy,
      newTotalGamesForAvg
    });
  }, []);

  // Update game accuracy and XP whenever round results change
  useEffect(() => {
    devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Recalculating game accuracy and XP from round results`);
    
    if (roundResults.length === 0) {
      devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] No round results, resetting accuracy and XP to 0`);
      setTotalGameAccuracy(0);
      setTotalGameXP(0);
      return;
    }
    
    // Calculate total XP from all rounds
    const xpSum = roundResults.reduce((sum, result, index) => {
      const score = result.score || 0;
      devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} XP:`, {
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
        devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from xpWhere/xpWhen):`, {
          xpWhere: result.xpWhere,
          xpWhen: result.xpWhen,
          calculatedPct: roundPct
        });
      } else {
        const maxRoundScore = 1000; // This seems to be a legacy or incorrect max score for percentage calculation
        // Assuming score is out of 200 for percentage calculation similar to xpWhere/xpWhen logic
        roundPct = result.score ? Math.round((result.score / 200) * 100) : 0; 
        roundPct = Math.min(100, roundPct); // Cap at 100%
        devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Round ${index + 1} percentage (from score/200):`, {
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
    
    devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] Final game accuracy calculation:`, {
      roundPercentages,
      avgPercentage,
      finalAccuracy,
      totalRounds: roundResults.length
    });
    
    setTotalGameAccuracy(finalAccuracy);
    
  }, [roundResults, gameId]);
  
  const refreshGlobalMetrics = useCallback(async () => {
    devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics called`);
    const startTime = performance.now();
    try {
      await fetchGlobalMetrics();
      devLog(`[GameContext] [GameID: ${gameId || 'N/A'}] refreshGlobalMetrics completed in ${performance.now() - startTime}ms`);
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
          devLog(`Loaded timer settings from localStorage: ${parsed.timerEnabled ? parsed.timerSeconds : 0}s`);
        }
        if (parsed.hintsPerGame !== undefined) {
          setHintsAllowed(parsed.hintsPerGame);
          devLog(`Loaded hints settings from localStorage: ${parsed.hintsPerGame} hints`);
        }
        if (parsed.timerEnabled !== undefined) {
          setTimerEnabled(parsed.timerEnabled);
          devLog(`Loaded timer enabled setting from localStorage: ${parsed.timerEnabled}`);
        }
      }
    } catch (error) {
      console.error('Error loading game settings from localStorage:', error);
    }
  }, []);

  // Function to fetch images and start a new game
  const startGame = useCallback(async (settings?: { timerSeconds?: number; hintsPerGame?: number; timerEnabled?: boolean; roomId?: string; seed?: string; competeVariant?: 'sync' | 'async' }) => {
    devLog("Starting new game...");
    clearSavedGameState(); // Clear any existing saved state
    setIsLoading(true);
    setError(null);
    setImages([]); // Clear previous images
    setRoundResults([]); // Clear previous results
    
    // Apply game settings provided by the caller (no forced defaults)
    applyGameSettings(settings);
    
    try {
      // Multiplayer gating: require seed when a roomId is specified
      if (settings?.roomId && !settings.seed) {
        try {
          console.warn('[GameContext] Multiplayer start requested without seed. Gating preparation until seed is provided (start event).', {
            roomId: settings.roomId,
          });
        } catch {}
        setIsLoading(false);
        setError(null); // not an error, just waiting for start
        return;
      }
      const newRoomId = settings?.roomId && settings.roomId.trim().length > 0
        ? settings.roomId
        : `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newGameId = uuidv4();
      setGameId(newGameId);
      const isMultiplayer = !!settings?.roomId && !!settings?.seed;
      devLog(`[GameContext] [GameID: ${newGameId}] Starting new game, roomId: ${newRoomId}, seed: ${settings?.seed ?? 'none'}, isMultiplayer: ${isMultiplayer}`);
      setRoomId(newRoomId);
      try { sessionStorage.setItem('lastSyncedRoomId', newRoomId); } catch {}
      // Try deterministic selection first for multiplayer; otherwise use prepare()
      const { data: { user } } = await supabase.auth.getUser();
      if (isMultiplayer) {
        // Upsert membership for RLS/RPC authorization
        await ensureSessionMembership(newRoomId, user?.id);
        await repairMissingRoomId(newRoomId);
      }
      let preparedImages: GameImage[] | null = null;

      if (isMultiplayer) {
        // Deterministic, shared set persisted by roomId and seed.
        const imageBatch = await getOrPersistRoomImages(newRoomId, settings?.seed ?? '', ROUNDS_PER_GAME);
        if (!imageBatch || imageBatch.length < ROUNDS_PER_GAME) {
          console.warn('[GameContext] getOrPersistRoomImages returned insufficient images', imageBatch?.length);
          setIsLoading(false);
          setError('Could not fetch enough images for multiplayer');
          return;
        }

        const resolveUrl = (img: any) => {
          if (img.firebase_url) return String(img.firebase_url);
          let finalUrl: string | null = img.image_url as string | null;
          if (finalUrl && !finalUrl.startsWith('http')) {
            const { data } = supabase.storage.from('images').getPublicUrl(finalUrl);
            finalUrl = data?.publicUrl || '';
          }
          return finalUrl || '';
        };

        preparedImages = imageBatch.map((img: any) => ({
          id: String(img.id),
          title: img.title,
          description: img.description,
          source_citation: img.source_citation,
          latitude: img.latitude,
          longitude: img.longitude,
          year: img.year,
          image_url: img.image_url,
          location_name: img.location_name,
          url: resolveUrl(img),
          firebase_url: img.firebase_url,
          confidence: img.confidence,
        }));

        try {
          devDebug('[GameContext] MP deterministic images selected (first 5 IDs)', {
            first5: preparedImages.map(i => i.id).slice(0, 5),
            total: preparedImages.length,
            roomId: newRoomId,
            seed: settings?.seed,
          });
        } catch {}

        setImages(preparedImages);
        // Mark these images as played for the current user to avoid repeats in future games
        try {
          const playedIds = preparedImages.map((i) => i.id);
          await recordPlayedImages(user?.id ?? null, playedIds);
        } catch (e) {
          console.warn('[GameContext] Failed to record played images (multiplayer)', e);
        }
      } else {
        try {
          const prep = await prepare({
            userId: user?.id ?? null,
            roomId: null,
            count: ROUNDS_PER_GAME,
            seed: null,
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
          console.warn('[GameContext] prepare() failed', prepErr);
        }

        if (!preparedImages) {
          // Legacy no-repeat fetch for solo
          const imageBatch = await getNewImages(user?.id ?? null, ROUNDS_PER_GAME);
          if (!imageBatch || imageBatch.length < ROUNDS_PER_GAME) {
            console.warn('Could not fetch at least 5 images, fetched:', imageBatch?.length);
            setIsLoading(false);
            setError('Could not fetch at least 5 images.');
            return;
          }
          const mappedImages: GameImage[] = imageBatch.map((img: any) => ({
            id: String(img.id),
            title: img.title,
            description: img.description,
            source_citation: img.source_citation,
            latitude: img.latitude,
            longitude: img.longitude,
            year: img.year,
            image_url: img.image_url,
            location_name: img.location_name,
            url: img.url || img.image_url,
            firebase_url: img.firebase_url,
            confidence: img.confidence,
          }));
          // Persist solo selection to game_sessions for stable hydration on refresh
          try {
            const imageIds = mappedImages.map((i) => i.id);
            await supabase
              .from('game_sessions' as any)
              .upsert(
                { room_id: newRoomId, seed: newRoomId, image_ids: imageIds, started_at: new Date().toISOString() },
                { onConflict: 'room_id' }
              );
          } catch (e) {
            console.warn('[GameContext] solo fallback persist to game_sessions failed', e);
          }
          setImages(mappedImages);
          // Record played images to prevent repeats next games
          try {
            const playedIds = mappedImages.map((i) => i.id);
            await recordPlayedImages(user?.id ?? null, playedIds);
          } catch (e) {
            console.warn('[GameContext] Failed to record played images (solo fallback)', e);
          }
        } else {
          // Persist solo (prepared) selection to game_sessions for stable hydration on refresh
          try {
            const imageIds = preparedImages.map((i) => i.id);
            await supabase
              .from('game_sessions' as any)
              .upsert(
                { room_id: newRoomId, seed: newRoomId, image_ids: imageIds, started_at: new Date().toISOString() },
                { onConflict: 'room_id' }
              );
          } catch (e) {
            console.warn('[GameContext] solo prepared persist to game_sessions failed', e);
          }
          setImages(preparedImages);
          // Record played images to prevent repeats next games
          try {
            const playedIds = preparedImages.map((i) => i.id);
            await recordPlayedImages(user?.id ?? null, playedIds);
          } catch (e) {
            console.warn('[GameContext] Failed to record played images (solo prepared)', e);
          }
        }
      }
      devLog("Prepared and preloaded 5 images stored in context:", preparedImages);
      devLog(`Game settings: ${hintsAllowed} hints, ${roundTimerSec}s timer, timer enabled: ${timerEnabled}`);
      
      setIsLoading(false);
      // Persist round 1 immediately so reloads know where to land
      try { await setCurrentRoundInSession(newRoomId, 1); } catch {}
      
      // Navigate immediately without artificial delay
      const isMultiplayerNow = !!(settings?.roomId && settings?.seed);
      if (isMultiplayerNow) {
        const variant = settings?.competeVariant === 'async' ? 'async' : 'sync';
        navigate(`/compete/${variant}/game/room/${newRoomId}/round/1`);
      } else {
        navigate(`/solo/game/room/${newRoomId}/round/1`);
      }

    } catch (err) {
      console.error("Error in startGame:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
      // Consider a more user-friendly error display than alert
      // alert('Failed to start game. Please try again.'); 
    }
  }, [navigate, hintsAllowed, roundTimerSec, timerEnabled, clearSavedGameState]);

  // Start a Level Up game for a given level (1..100) using year constraints and timer from levelUpConfig
  const startLevelUpGame = useCallback(async (level: number, settings?: { roomId?: string; seed?: string }) => {
    devLog(`[GameContext] Starting Level Up game for level ${level}...`);
    // Apply Level Up theming immediately so preparation overlay uses pink accents
    try { document.body.classList.add('mode-levelup'); } catch {}
    clearSavedGameState();
    setIsLoading(true);
    setError(null);
    setImages([]);
    setRoundResults([]);

    // Compute constraints and apply timer (no UI change)
    const c = getLevelUpConstraints(level);
    const minYear = c.levelYearRange.start;
    const maxYear = c.levelYearRange.end;
    const timerSeconds = c.timerSec;
    setTimerEnabled(true);
    handleSetRoundTimerSec(timerSeconds);

    try {
      // Multiplayer gating: require seed when a roomId is specified
      if (settings?.roomId && !settings.seed) {
        try {
          console.warn('[GameContext] LevelUp MP start requested without seed. Gating preparation until seed is provided.', {
            roomId: settings.roomId,
          });
        } catch {}
        setIsLoading(false);
        setError(null);
        return;
      }

      const newRoomId = settings?.roomId && settings.roomId.trim().length > 0
        ? settings.roomId
        : `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newGameId = uuidv4();
      setGameId(newGameId);
      const isMultiplayer = !!settings?.roomId && !!settings?.seed;
      devLog(`[GameContext] [GameID: ${newGameId}] LevelUp start, roomId: ${newRoomId}, seed: ${settings?.seed ?? 'none'}, isMultiplayer: ${isMultiplayer}`, { minYear, maxYear, timerSeconds });
      setRoomId(newRoomId);
      try { sessionStorage.setItem('lastSyncedRoomId', newRoomId); } catch {}

      const { data: { user } } = await supabase.auth.getUser();
      if (isMultiplayer) {
        await ensureSessionMembership(newRoomId, user?.id);
        await repairMissingRoomId(newRoomId);
      }

      // Always use prepare() so year constraints flow to the RPC and selection persists server-side
      const prep = await prepare({
        userId: user?.id ?? null,
        roomId: settings?.roomId ? newRoomId : null,
        count: ROUNDS_PER_GAME,
        seed: settings?.seed ?? null,
        minYear,
        maxYear,
      });

      const preparedImages: GameImage[] = prep.images.map((img) => ({
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

      // Persist Level Up selection to game_sessions for stable hydration (even in solo Level Up)
      try {
        const imageIds = preparedImages.map((i) => i.id);
        await supabase
          .from('game_sessions' as any)
          .upsert(
            { room_id: newRoomId, seed: (settings?.seed ?? newRoomId) as any, image_ids: imageIds, started_at: new Date().toISOString() },
            { onConflict: 'room_id' }
          );
      } catch (e) {
        console.warn('[GameContext] levelup persist to game_sessions failed', e);
      }
      setImages(preparedImages);
      // Record played images so Level Up also avoids repeats on future games
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const playedIds = preparedImages.map((i) => i.id);
        await recordPlayedImages(user?.id ?? null, playedIds);
      } catch (e) {
        console.warn('[GameContext] Failed to record played images (level up)', e);
      }
      devLog('[GameContext] LevelUp prepared images (first 5 IDs)', preparedImages.slice(0, 5).map(i => i.id));

      setIsLoading(false);
      setTimeout(() => {
        // Level Up has its own distinct route prefix
        navigate(`/level/${level}/game/room/${newRoomId}/round/1`);
      }, 100);
    } catch (err) {
      console.error('[GameContext] Error in startLevelUpGame:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setIsLoading(false);
    }
  }, [clearSavedGameState, handleSetRoundTimerSec, setTimerEnabled, navigate, prepare, ensureSessionMembership, repairMissingRoomId]);

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
      try { sessionStorage.setItem('lastSyncedRoomId', existingRoomId); } catch {}
      // Ensure user is recorded as participant in this room for multiplayer visibility
      await ensureSessionMembership(existingRoomId, user?.id);
      await repairMissingRoomId(existingRoomId);
      if (!gameId) {
        // Generate a lightweight gameId so subsequent results can persist
        setGameId(uuidv4());
      }
    } catch (e) {
      console.warn('[GameContext] hydrateRoomImages failed', e);
    }
  }, [images, gameId, processRawImages, ensureSessionMembership, repairMissingRoomId]);

  // Sync URL roomId into context even when images are already hydrated
  const syncRoomId = useCallback(async (incomingRoomId: string) => {
    try {
      if (!incomingRoomId) return;
      const changed = roomId !== incomingRoomId;
      if (changed) {
        setRoomId(incomingRoomId);
        try { sessionStorage.setItem('lastSyncedRoomId', incomingRoomId); } catch {}
      }
      const { data: { user } } = await supabase.auth.getUser();
      await ensureSessionMembership(incomingRoomId, user?.id);
      await repairMissingRoomId(incomingRoomId);
      if (!gameId) {
        setGameId(uuidv4());
      }
      if (changed) {
        console.log('[GameContext] syncRoomId: updated roomId to', incomingRoomId);
      } else {
        console.log('[GameContext] syncRoomId: roomId already set, ensured membership/repair for', incomingRoomId);
      }
    } catch (e) {
      console.warn('[GameContext] syncRoomId failed', e);
    }
  }, [roomId, ensureSessionMembership, gameId, repairMissingRoomId]);

  // On first load, derive roomId from URL if present to avoid early NULL writes
  useEffect(() => {
    try {
      const path = typeof window !== 'undefined' ? (window.location.pathname || '') : '';
      const match = path.match(/\/room\/([^/]+)/);
      const urlRoomId = (match && match[1]) ? match[1] : null;
      if (urlRoomId && urlRoomId !== roomId) {
        setRoomId(urlRoomId);
        try { sessionStorage.setItem('lastSyncedRoomId', urlRoomId); } catch {}
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          await ensureSessionMembership(urlRoomId, user?.id);
          await repairMissingRoomId(urlRoomId);
          if (!gameId) setGameId(uuidv4());
        })();
      }
    } catch (e) {
      console.warn('[GameContext] URL roomId bootstrap failed', e);
    }
  }, [roomId, ensureSessionMembership, repairMissingRoomId, gameId]);

  

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
      // Derive effective room id: prefer context, then URL, then sessionStorage
      let effectiveRoomId: string | null = roomId;
      if (!effectiveRoomId && typeof window !== 'undefined') {
        const path = window.location.pathname || '';
        const match = path.match(/\/room\/([^/]+)/);
        effectiveRoomId = (match && match[1]) ? match[1] : null;
        if (!effectiveRoomId) {
          const last = sessionStorage.getItem('lastSyncedRoomId');
          effectiveRoomId = last && last.length > 0 ? last : null;
        }
        if (effectiveRoomId) {
          setRoomId(effectiveRoomId);
          await ensureSessionMembership(effectiveRoomId, user.id);
          await repairMissingRoomId(effectiveRoomId);
        }
      }
      console.log('[GameContext] recordRoundResult effectiveRoomId:', effectiveRoomId ?? 'null');

      // Build full payload (preferred schema)
      const payloadFull = {
        user_id: user.id,
        game_id: gameId,
        room_id: effectiveRoomId ?? null,
        round_index: currentRoundIndex,
        image_id: currentImage.id,
        score: fullResult.score,
        accuracy: Number(resultData.accuracy ?? 0),
        xp_total: (fullResult.xpWhere ?? 0) + (fullResult.xpWhen ?? 0),
        xp_where: fullResult.xpWhere,
        xp_when: fullResult.xpWhen,
        hints_used: fullResult.hintsUsed,
        distance_km: fullResult.distanceKm,
        guess_year: fullResult.guessYear,
        guess_lat: fullResult.guessCoordinates?.lat ?? null,
        guess_lng: fullResult.guessCoordinates?.lng ?? null,
        actual_lat: fullResult.actualCoordinates.lat,
        actual_lng: fullResult.actualCoordinates.lng,
      } as const;

      // Choose the correct conflict target backed by a UNIQUE index
      // - Multiplayer: (room_id, user_id, round_index)
      // - Solo/legacy: (user_id, game_id, round_index)
      const conflictTarget = (payloadFull.room_id && payloadFull.room_id.length > 0)
        ? 'room_id,user_id,round_index'
        : 'user_id,game_id,round_index';

      let upsertData: any = null;
      let upsertError: any = null;

      // Attempt 1: full payload
      {
        const { data, error } = await supabase
          .from('round_results')
          .upsert(payloadFull, { onConflict: conflictTarget });
        upsertData = data;
        upsertError = error;
      }

      // Fallbacks for schema drift
      if (upsertError) {
        try {
          const msg: string = String(upsertError.message || '');
          console.warn('[GameContext] recordRoundResult: primary upsert failed, applying fallbacks', {
            code: upsertError.code,
            message: upsertError.message,
          });

          // Attempt 2: remove xp_total if missing
          if (msg.includes("'xp_total'") || msg.toLowerCase().includes('xp_total')) {
            const { xp_total, ...payloadNoXp } = payloadFull as any;
            const { data, error } = await supabase
              .from('round_results')
              .upsert(payloadNoXp, { onConflict: conflictTarget });
            upsertData = data;
            upsertError = error;
          }

          // Attempt 3: if still error and room_id appears missing, remove room_id
          if (upsertError) {
            const msg2: string = String(upsertError.message || msg || '');
            if (msg2.includes("'room_id'") || msg2.toLowerCase().includes('room_id')) {
              const { room_id, ...payloadNoRoom } = payloadFull as any;
              const { data, error } = await supabase
                .from('round_results')
                .upsert(payloadNoRoom, { onConflict: conflictTarget });
              upsertData = data;
              upsertError = error;
            }
          }

          // Attempt 4: ultimate legacy-minimal payload
          if (upsertError) {
            const payloadLegacy: any = {
              user_id: user.id,
              game_id: gameId,
              round_index: currentRoundIndex,
              image_id: currentImage.id,
              score: fullResult.score,
              accuracy: Number(resultData.accuracy ?? 0),
              xp_where: fullResult.xpWhere,
              xp_when: fullResult.xpWhen,
              hints_used: fullResult.hintsUsed,
              distance_km: fullResult.distanceKm,
              guess_year: fullResult.guessYear,
              guess_lat: fullResult.guessCoordinates?.lat ?? null,
              guess_lng: fullResult.guessCoordinates?.lng ?? null,
              actual_lat: fullResult.actualCoordinates.lat,
              actual_lng: fullResult.actualCoordinates.lng,
            };
            const { data, error } = await supabase
              .from('round_results')
              .upsert(payloadLegacy, { onConflict: conflictTarget });
            upsertData = data;
            upsertError = error;
            if (!error) {
              console.warn('[GameContext] recordRoundResult: persisted via legacy payload (without xp_total/room_id)');
            }
          }
        } catch (fallbackErr) {
          console.warn('[GameContext] recordRoundResult: fallback handling threw', fallbackErr);
        }
      }
      // Update local state after persistence attempts (regardless of fallback path)
      setRoundResults((prev) => {
        const next = [...prev];
        next[currentRoundIndex] = fullResult;
        return next;
      });
      saveGameState();

      // Award round-level achievements (deduped per context)
      try {
        const contextIdForAchievements = effectiveRoomId ?? gameId;
        await awardRoundAchievements({
          userId: user.id,
          contextId: contextIdForAchievements,
          actualYear: currentImage.year,
          result: fullResult,
        });
      } catch (achErr) {
        console.warn('[GameContext] awardRoundAchievements failed', achErr);
      }
    } catch (persistErr) {
      console.error('[GameContext] Error persisting round result', persistErr);
    }
  }, [gameId, images, roomId, ensureSessionMembership, repairMissingRoomId, saveGameState]);

  // After all rounds complete, award game-level achievements once per session/context
  useEffect(() => {
    if (!gameId) return;
    if (images.length === 0) return;
    if (roundResults.length !== images.length) return;
    if (roundResults.some((r) => r == null)) return;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const contextId = roomId ?? gameId;
        const actualYears = images.map((img) => img.year);
        await awardGameAchievements({
          userId: user.id,
          contextId,
          actualYears,
          results: roundResults,
        });
      } catch (e) {
        console.warn('[GameContext] awardGameAchievements failed', e);
      }
    })();
  }, [roundResults, images, gameId, roomId]);

  // Reset game state, timer, and Level Up related flags
  const resetGame = useCallback(() => {
    setImages([]);
    setRoundResults([]);
    setError(null);
    setIsLoading(false);
    setRoomId(null);
    setTimerEnabled(false);
    setRoundTimerSec(0);
    setGameId(uuidv4());
  }, []);

  const contextValue: GameContextState = {
    gameId,
    setGameId,
    refreshGlobalMetrics,
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
    startLevelUpGame,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    setProvisionalGlobalMetrics,
    hydrateRoomImages,
    syncRoomId,
    // preparation state (no UI coupling)
    prepStatus,
    prepProgress,
    prepError,
    abortPreparation,
    resetPreparation,
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
