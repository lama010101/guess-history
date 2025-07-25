import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GameImage } from '@/contexts/GameContext';
import { useLogs } from '@/contexts/LogContext';
import { HINT_COSTS, HINT_DEPENDENCIES } from '@/constants/hints';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

// Hint interface definition
export interface Hint {
  id: string;
  type: string;
  text: string;
  level: number;
  image_id: string;
  xp_cost: number;
  accuracy_penalty: number;
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
export const useHintV2 = (imageData: GameImage | null = null): UseHintV2Return => {
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
      // Fetch hint data directly from the `images` table. Each image row contains
      // the raw hint values (e.g. `1_where_continent`, `2_when_event`, ...).
      // We transform those columns into an array of `Hint` objects so the rest of
      // the hook / UI can work as-is.
      const { data: imageRow, error: imageError } = await supabase
        .from('images' as any)
        .select('*')
        .eq('id', imageData.id)
        .single();

      if (imageError) {
        addLog(`Error fetching hints from images table: ${imageError.message}`);
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

      // Convert non-null column values into Hint objects
      const hints: Hint[] = Object.entries(costKeyMap)
        .filter(([column]) => imageRow && imageRow[column] !== null && imageRow[column] !== '')
        .map(([column, costKey]) => {
          const level = parseInt(column.charAt(0), 10) || 1; // first char is the level (1-5)
          const xp_cost = costKey ? HINT_COSTS[costKey].xp : 0;
          const accuracy_penalty = costKey ? HINT_COSTS[costKey].acc : 0;
          // Resolve prerequisite based on dependency map so the UI can lock items until required hints are bought
          const prereqType = HINT_DEPENDENCIES[column] ?? null;

          return {
            id: `${column}-${imageData.id}`,
            type: column, // keep original column name so dependencies match
            text: String(imageRow[column]),
            level,
            image_id: imageData.id,
            xp_cost,
            accuracy_penalty,
            prerequisite: prereqType ? `${prereqType}-${imageData.id}` : undefined
          } as Hint;
        });

      addLog(`Generated ${hints.length} hints for image ${imageData.id} from images table`);
      setAvailableHints(hints);


      // Fetch already purchased hints
      let purchasedHintIdsFromDb: string[] = [];
      try {
        const { data: purchasedHints, error: purchasedError } = await supabase
          .from('round_hints' as any)
          .select('hint_id')
          .eq('user_id', user.id)
          // NOTE: `round_hints` table currently has no `image_id` column. Skip this filter for now.
          // .eq('image_id', imageData.id)
          .limit(1000);

        if (purchasedError) {
          throw purchasedError;
        }

        if (purchasedHints && purchasedHints.length > 0) {
          purchasedHintIdsFromDb = purchasedHints.map((item: any) => item.hint_id);
        }
      } catch (err: any) {
        // Log but don't fail UI
        addLog(`round_hints query failed (likely schema mismatch): ${err.message || err}`);
      }

      // Update local state with whatever we found (may be empty)
      setPurchasedHintIds(purchasedHintIdsFromDb);
      addLog(`Loaded ${purchasedHintIdsFromDb.length} purchased hints from DB`);
    } catch (error) {
      addLog(`Error in fetchHints: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [imageData, user]);

  // Purchase a hint
  const purchaseHint = useCallback(async (hintId: string) => {
    if (!user || !imageData) {
      addLog('Cannot purchase hint: No user or image data');
      return;
    }

    const hint = availableHints.find(h => h.id === hintId);
    if (!hint) {
      addLog(`Hint with ID ${hintId} not found`);
      return;
    }

    if (purchasedHintIds.includes(hintId)) {
      addLog(`Hint ${hintId} already purchased`);
      return;
    }

    setIsHintLoading(true);
    addLog(`Attempting to purchase hint ${hintId} (${hint.type})`);

    try {
      // Call the RPC function to purchase the hint
      // Note: API no longer checks XP balance, only prevents duplicates
      let purchaseSucceeded = false;
      try {
        const { error } = await supabase.rpc('purchase_hint' as any, {
          p_hint_id: hintId,
          p_user_id: user.id,
          p_image_id: imageData.id ?? null
        });

        if (error) {
          throw error;
        }
        purchaseSucceeded = true;
        addLog(`Hint purchase recorded in DB (RPC purchase_hint)`);
      } catch (err: any) {
        addLog(`purchase_hint RPC failed or missing: ${err.message || err}. Falling back to local-only purchase.`);
      }

      // Update local state so UI shows purchase immediately
      setPurchasedHintIds(prev => (prev.includes(hintId) ? prev : [...prev, hintId]));
    } catch (error) {
      addLog(`Error in purchaseHint: ${error}`);
    } finally {
      setIsHintLoading(false);
    }
  }, [availableHints, purchasedHintIds, user, imageData]);

  // Set up realtime subscription for hint purchases
  useEffect(() => {
    if (!user || !imageData || !supabase) return;

    const setupRealtimeSubscription = async () => {
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
  }, [user, imageData]);

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

/*
      type: 'continent',
      text: 'Europe',
      level: 1,
      image_id: imageId,
      xp_cost: HINT_COSTS.continent.xp,
      accuracy_penalty: HINT_COSTS.continent.acc
    },
    {
      id: `sample-century-${imageId}`,
      type: 'century',
      text: '20th Century',
      level: 1,
      image_id: imageId,
      xp_cost: HINT_COSTS.century.xp,
      accuracy_penalty: HINT_COSTS.century.acc
    },
    
    // Level 2 Hints
    {
      id: `sample-distant-landmark-${imageId}`,
      type: 'distant_landmark',
      text: 'Eiffel Tower',
      level: 2,
      image_id: imageId,
      xp_cost: HINT_COSTS.distantLandmark.xp,
      accuracy_penalty: HINT_COSTS.distantLandmark.acc
    },
    {
      id: `sample-distant-distance-${imageId}`,
      type: 'distant_distance',
      text: 'Distance > 350km',
      level: 2,
      image_id: imageId,
      xp_cost: HINT_COSTS.distantDistance.xp,
      accuracy_penalty: HINT_COSTS.distantDistance.acc
    },
    {
      id: `sample-distant-event-${imageId}`,
      type: 'distant_event',
      text: 'World War II',
      level: 2,
      image_id: imageId,
      xp_cost: HINT_COSTS.distantEvent.xp,
      accuracy_penalty: HINT_COSTS.distantEvent.acc
    },
    {
      id: `sample-distant-time-diff-${imageId}`,
      type: 'distant_time_diff',
      text: 'Time Difference > 15 years',
      level: 2,
      image_id: imageId,
      xp_cost: HINT_COSTS.distantTimeDiff.xp,
      accuracy_penalty: HINT_COSTS.distantTimeDiff.acc
    },
    
    // Level 3 Hints
    {
      id: `sample-region-${imageId}`,
      type: 'region',
      text: 'Germany',
      level: 3,
      image_id: imageId,
      xp_cost: HINT_COSTS.region.xp,
      accuracy_penalty: HINT_COSTS.region.acc
    },
    {
      id: `sample-narrow-decade-${imageId}`,
      type: 'narrow_decade',
      text: '1940s',
      level: 3,
      image_id: imageId,
      xp_cost: HINT_COSTS.narrowDecade.xp,
      accuracy_penalty: HINT_COSTS.narrowDecade.acc
    },
    
    // Level 4 Hints
    {
      id: `sample-nearby-landmark-${imageId}`,
      type: 'nearby_landmark',
      text: 'Brandenburg Gate',
      level: 4,
      image_id: imageId,
      xp_cost: HINT_COSTS.nearbyLandmark.xp,
      accuracy_penalty: HINT_COSTS.nearbyLandmark.acc
    },
    {
      id: `sample-nearby-distance-${imageId}`,
      type: 'nearby_distance',
      text: 'Distance < 5km',
      level: 4,
      image_id: imageId,
      xp_cost: HINT_COSTS.nearbyDistance.xp,
      accuracy_penalty: HINT_COSTS.nearbyDistance.acc
    },
    {
      id: `sample-contemporary-event-${imageId}`,
      type: 'contemporary_event',
      text: 'Berlin Blockade',
      level: 4,
      image_id: imageId,
      xp_cost: HINT_COSTS.contemporaryEvent.xp,
      accuracy_penalty: HINT_COSTS.contemporaryEvent.acc
    },
    {
      id: `sample-close-time-diff-${imageId}`,
      type: 'close_time_diff',
      text: 'Time Difference < 3 years',
      level: 4,
      image_id: imageId,
      xp_cost: HINT_COSTS.closeTimeDiff.xp,
      accuracy_penalty: HINT_COSTS.closeTimeDiff.acc
    },
    
    // Level 5 Hints - Full Clues
    {
      id: `sample-where-clues-${imageId}`,
      type: 'where_clues',
      text: 'Berlin, Germany',
      level: 5,
      image_id: imageId,
      xp_cost: 300,
      accuracy_penalty: 30
    },
    {
      id: `sample-when-clues-${imageId}`,
      type: 'when_clues',
      text: '1945',
      level: 5,
      image_id: imageId,
      xp_cost: 300,
      accuracy_penalty: 30
    }
  ];
*/
