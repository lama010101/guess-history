import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { GameImage } from '@/contexts/GameContext';
import { useLogs } from '@/contexts/LogContext';
import { HINT_COSTS, HINT_DEPENDENCIES, HINT_TYPE_NAMES } from '@/constants/hints';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { makeRoundId } from '@/utils/roomState';

// Hint interface definition
export interface Hint {
  id: string;
  type: string;
  text: string;
  level: number;
  image_id: string;
  xp_cost: number;
  accuracy_penalty: number;
  // Optional DB-only metadata for certain hint types
  distance_km?: number;
  time_diff_years?: number;
  /**
   * Optional ID of a prerequisite hint that must be purchased before this one.
   * This is expressed as a full hint ID (e.g. `2_where_landmark-<imageId>`)
   * so the UI can quickly check purchase status without extra look-ups.
   */
  prerequisite?: string;
}

// Interface for the hook's return value
export interface UseHintV2Return {
  availableHints: Hint[];
  purchasedHintIds: string[];
  purchasedHints: Hint[];
  xpDebt: number;        // Total XP that will be deducted at round end
  accDebt: number;       // Total accuracy penalty that will be applied at round end
  isLoading: boolean;
  isHintLoading: boolean;
  purchaseHint: (hintId: string) => Promise<void>;
  hintsByLevel: Record<number, Hint[]>;
}

/**
 * Enhanced hint system hook with Supabase integration
 * Provides functionality for fetching, purchasing, and managing hints
 */
export const useHintV2 = (
  imageData: GameImage | null = null,
  opts?: { roomId?: string; roundNumber?: number }
): UseHintV2Return => {
  const { user } = useAuth();
  const { addLog } = useLogs();
  
  // State variables
  const [availableHints, setAvailableHints] = useState<Hint[]>([]);
  const [purchasedHintIds, setPurchasedHintIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isHintLoading, setIsHintLoading] = useState<boolean>(false);
  
  // Refs for managing Supabase realtime subscriptions
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef<boolean>(false);
  const channelNameRef = useRef<string>('');

  // Fetch hints for the current image
  const fetchHints = useCallback(async () => {
    if (!imageData || !user) {
      addLog('No image data or user available for hints');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    addLog(`Fetching hints for image ${imageData.id}`);

    try {
      // 1) Try to fetch pre-generated hints from the dedicated `public.hints` table.
      //    If this table is populated (recommended production path), we can map rows
      //    directly into Hint objects and skip the column-parsing fallback.
      const { data: dbHints, error: dbHintsError } = await supabase
        .from('hints' as any)
        .select('*')
        .eq('image_id', imageData.id)
        .order('level', { ascending: true });

      if (dbHintsError) {
        // Do NOT throw here – we can still fall back to legacy column mapping.
        addLog(`Error querying hints table: ${dbHintsError.message}. Falling back to legacy column mapping.`);
      }

      let hints: Hint[] = [];

      if (dbHints && dbHints.length > 0) {
        // Map DB rows to Hint objects expected by the UI.
        hints = dbHints.map((row: any) => ({
          id: row.id,
          type: row.type,
          text: row.text,
          level: row.level,
          image_id: row.image_id,
          xp_cost: row.cost_xp,
          accuracy_penalty: row.cost_accuracy,
          distance_km: row.distance_km ?? undefined,
          time_diff_years: row.time_diff_years ?? undefined,
          // Derive prerequisite ID from dependency map (same logic as before)
          prerequisite: HINT_DEPENDENCIES[row.type] ? `${HINT_DEPENDENCIES[row.type]}-${imageData.id}` : undefined
        })) as Hint[];

        addLog(`Loaded ${hints.length} hints for image ${imageData.id} from hints table`);
      } else {
        // 2) Fallback – legacy approach: build hints dynamically from columns on the `images` table.
        addLog('No rows found in hints table – using legacy column mapping');

        const { data: imageRow, error: imageError } = await supabase
          .from('images' as any)
          .select('*')
          .eq('id', imageData.id)
          .single();

        if (imageError) {
          addLog(`Error fetching image row for legacy mapping: ${imageError.message}`);
          throw imageError;
        }

        // Map image column → HINT_COSTS key so that we can attach XP / accuracy costs
        const costKeyMap: Record<string, keyof typeof HINT_COSTS | null> = {
          '1_where_continent': 'continent',
          '1_when_century': 'century',
          '2_where_landmark': 'distantLandmark',
          '2_where_landmark_km': 'distantDistance',
          '2_when_event': 'distantEvent',
          '2_when_event_years': 'distantTimeDiff',
          '3_where_region': 'region',
          '3_when_decade': 'narrowDecade',
          '4_where_landmark': 'nearbyLandmark',
          '4_where_landmark_km': 'nearbyDistance',
          '4_when_event': 'contemporaryEvent',
          '4_when_event_years': 'closeTimeDiff',
          '5_where_clues': 'whereClues',
          '5_when_clues': 'whenClues'
        };

        hints = Object.entries(costKeyMap)
          .filter(([column]) => imageRow && imageRow[column] !== null && imageRow[column] !== '')
          .map(([column, costKey]) => {
            const level = parseInt(column.charAt(0), 10) || 1;
            const xp_cost = costKey ? HINT_COSTS[costKey].xp : 0;
            const accuracy_penalty = costKey ? HINT_COSTS[costKey].acc : 0;
            const prereqType = HINT_DEPENDENCIES[column] ?? null;

            return {
              id: uuidv4(),
              type: column,
              text: String(imageRow[column]),
              level,
              image_id: imageData.id,
              xp_cost,
              accuracy_penalty,
              prerequisite: undefined
            } as Hint;
          });

        // After initial creation, wire prerequisite IDs now that we have all hint IDs
            hints.forEach(h => {
              const prereqType = HINT_DEPENDENCIES[h.type as keyof typeof HINT_DEPENDENCIES];
              if (prereqType) {
                const prereqHint = hints.find(ph => ph.type === prereqType);
                if (prereqHint) {
                  h.prerequisite = prereqHint.id;
                }
              }
            });

        addLog(`Generated ${hints.length} hints for image ${imageData.id} from images column fallback`);
      }

      setAvailableHints(hints);

      // ------------- Fetch already purchased hints for this user & room-round -------------
      let purchasedHintIdsFromDb: string[] = [];
      try {
        // Derive a unique round session ID in the format <roomId>-r<roundNumber>
        let roundSessionId: string;
        if (opts?.roomId && typeof opts.roundNumber === 'number' && !isNaN(opts.roundNumber)) {
          roundSessionId = makeRoundId(opts.roomId, opts.roundNumber);
        } else {
          const urlMatch = window.location.pathname.match(/room\/([^/]+)\/round\/(\d+)/);
          const roomFromUrl = urlMatch ? urlMatch[1] : 'unknown_room';
          const roundNumFromUrl = urlMatch ? parseInt(urlMatch[2], 10) : 0;
          roundSessionId = makeRoundId(roomFromUrl, roundNumFromUrl);
        }

        const { data: purchases, error: purchaseError } = await supabase
          .from('round_hints' as any)
          .select('hint_id')
          .eq('user_id', user.id)
          .eq('round_id', roundSessionId);

        if (purchaseError) throw purchaseError;
        purchasedHintIdsFromDb = (purchases ?? []).map((row: any) => row.hint_id);
        addLog(`Fetched ${purchasedHintIdsFromDb.length} purchased hints for round ${roundSessionId}`);
      } catch (error: any) {
        addLog(`Error fetching purchased hints: ${error.message || error}`);
      }

      setPurchasedHintIds(purchasedHintIdsFromDb);
    } catch (error) {
      addLog(`Error in fetchHints: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageData, user, opts?.roomId, opts?.roundNumber]);

  // Purchase a hint
  const purchaseHint = useCallback(async (hintId: string) => {
    if (!user || !imageData) {
      addLog('Cannot purchase hint: No user or image data');
      return;
    }

    const hintToPurchase = availableHints.find(h => h.id === hintId);

    if (!hintToPurchase) {
      throw new Error(`Hint with ID ${hintId} not found in available hints.`);
    }

    // Check for prerequisites and duplicates
    if (!canPurchaseHint(hintToPurchase)) {
    addLog(`Cannot purchase hint ${hintId}: prerequisite not met or already purchased.`);
    return; 
  }

  const hintLabel = hintToPurchase.text;
    const hintType = hintToPurchase.type.includes('where') ? 'where' : 'when';

    setIsHintLoading(true);

    try {
      // Derive a unique round session ID in the format <roomId>-r<roundNumber>
      let roundSessionId: string;
      if (opts?.roomId && typeof opts.roundNumber === 'number' && !isNaN(opts.roundNumber)) {
        roundSessionId = makeRoundId(opts.roomId, opts.roundNumber);
      } else {
        const urlMatch = window.location.pathname.match(/room\/([^/]+)\/round\/(\d+)/);
        const roomFromUrl = urlMatch ? urlMatch[1] : 'unknown_room';
        const roundNumFromUrl = urlMatch ? parseInt(urlMatch[2], 10) : 0;
        roundSessionId = makeRoundId(roomFromUrl, roundNumFromUrl);
      }

      const insertPayload = {
        id: uuidv4(),
        user_id: user.id,
        round_id: roundSessionId,
        hint_id: hintToPurchase.id,
        xpDebt: hintToPurchase.xp_cost,
        accDebt: hintToPurchase.accuracy_penalty,
        label: hintLabel,
        hint_type: hintType,
        purchased_at: new Date().toISOString()
      };


      addLog(`Attempting to insert hint purchase: ${JSON.stringify(insertPayload)}`);
      
      // Try direct insert first
      
      const { data: insertData, error } = await supabase
        .from('round_hints')
        .insert([insertPayload])
        .select('*');

      if (error) {
        addLog(`round_hints insert failed: ${error.message}`);
        // Do not update local state if DB insert fails, unless it's a duplicate error
        if (error.code !== '23505') {
          throw new Error(`Failed to purchase hint: ${error.message}`);
        }
      }
      
      // If insert is successful (or it was a duplicate), update local state
      addLog(`Hint purchase for ${hintId} recorded successfully.`);
      setPurchasedHintIds(prev => (prev.includes(hintId) ? prev : [...prev, hintId]));
    } catch (error) {
      addLog(`Error in purchaseHint: ${error}`);
    } finally {
      setIsHintLoading(false);
    }
  }, [availableHints, purchasedHintIds, user, imageData, opts?.roomId, opts?.roundNumber]);

  // Set up realtime subscription for hint purchases
  useEffect(() => {
    if (!user || !imageData || !supabase) return;

    addLog(`Running main effect for user ${user.id} and image ${imageData.id}`);
    fetchHints();

    const setupRealtimeSubscription = async () => {
      if (channelRef.current && isSubscribedRef.current) {
        addLog('Subscription already active. Skipping setup.');
        return;
      }

      try {
        // Clean up any existing subscription first
        if (channelRef.current && isSubscribedRef.current) {
          addLog('Removing existing subscription before creating a new one');
          await channelRef.current.unsubscribe();
          isSubscribedRef.current = false;
        }

        // Create a unique channel name with timestamp to avoid conflicts
        const timestamp = new Date().getTime();
        const newChannelName = `hints-${imageData.id}-${timestamp}`;
        channelNameRef.current = newChannelName;
        
        addLog(`Setting up new realtime subscription on channel: ${newChannelName}`);
        
        // Create and subscribe to the channel
        const channel = supabase.channel(newChannelName);
        
        channel
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'round_hints',
              filter: `user_id=eq.${user.id}` 
            }, 
            (payload) => {
              addLog(`Received realtime update for round_hints: ${JSON.stringify(payload)}`);
              fetchHints();
            }
          )
          .on('postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_metrics',
              filter: `user_id=eq.${user.id}`
            },
            (payload) => {
              addLog(`Received realtime update for user_metrics: ${JSON.stringify(payload)}`);
              fetchHints();
            }
          )
          .subscribe((status) => {
            addLog(`Subscription status for ${newChannelName}: ${status}`);
            if (status === 'SUBSCRIBED') {
              isSubscribedRef.current = true;
              channelRef.current = channel;
            }
          });
      } catch (error) {
        addLog(`Error setting up realtime subscription: ${error}`);
      }
    };

    setupRealtimeSubscription();

    // Clean up subscription on unmount or when dependencies change
    return () => {
      const cleanup = async () => {
        if (channelRef.current && isSubscribedRef.current) {
          addLog(`Cleaning up subscription for channel: ${channelNameRef.current}`);
          try {
            await channelRef.current.unsubscribe();
            isSubscribedRef.current = false;
          } catch (error) {
            addLog(`Error cleaning up subscription: ${error}`);
          }
        }
      };
      
      cleanup();
    };
  }, [user, imageData, fetchHints, addLog]);

  // Fetch hints when image changes
  useEffect(() => {
    if (imageData && user) {
      fetchHints();
    }
  }, [imageData, user, fetchHints]);

  // Group hints by level for UI display
  const hintsByLevel = availableHints.reduce((acc, hint) => {
    if (!acc[hint.level]) {
      acc[hint.level] = [];
    }
    acc[hint.level].push(hint);
    return acc;
  }, {} as Record<number, Hint[]>);

  // Hint dependency map based on PRD
  
  // Check if user can purchase a hint (checks dependency and duplicate)
  const canPurchaseHint = (hint: Hint): boolean => {
    if (purchasedHintIds.includes(hint.id)) return false;
    const prereq = HINT_DEPENDENCIES[hint.type];
    if (!prereq) return true;
    // Find the prerequisite hint object and ensure it's purchased
    const prereqHint = availableHints.find(h => h.type === prereq);
    if (!prereqHint) return false; // should not happen if data complete
    return purchasedHintIds.includes(prereqHint.id);
  };

  // Get purchased hints
  const purchasedHints = availableHints.filter(hint => 
    purchasedHintIds.includes(hint.id)
  );

  // Calculate total XP debt and accuracy debt from purchased hints
  const xpDebt = purchasedHints.reduce((total, hint) => total + (hint.xp_cost || 0), 0);
  const accDebt = purchasedHints.reduce((total, hint) => total + (hint.accuracy_penalty || 0), 0);

  return {
    availableHints,
    purchasedHintIds,
    purchasedHints,
    xpDebt,
    accDebt,
    isLoading,
    isHintLoading,
    purchaseHint,
    hintsByLevel
  };
};
