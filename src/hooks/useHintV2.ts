import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GameImage } from '@/contexts/GameContext';
import { useLogs } from '@/contexts/LogContext';
import { HINT_COSTS } from '@/constants/hints';
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
      // Fetch available hints for this image
      const { data: hints, error: hintsError } = await supabase
        .from('hints' as any)
        .select('*')
        .eq('image_id', imageData.id);

      if (hintsError) {
        addLog(`Error fetching hints: ${hintsError.message}`);
        throw hintsError;
      }

      // If no hints found, use sample hints for testing (can be removed in production)
      if (!hints || hints.length === 0) {
        addLog('No hints found for this image, using sample hints');
        const sampleHints = generateSampleHints(imageData.id);
        setAvailableHints(sampleHints);
      } else {
        addLog(`Found ${hints.length} hints for image ${imageData.id}`);
        console.log('Fetched hints from DB:', hints);
        setAvailableHints(hints as unknown as Hint[]);
      }

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
  const HINT_DEPENDENCIES: Record<string, string | null> = {
    continent: null,
    century: null,
    distant_landmark: null,
    distant_distance: 'distant_landmark',
    distant_event: null,
    distant_time_diff: 'distant_event',
    region: null,
    narrow_decade: null,
    nearby_landmark: null,
    nearby_distance: 'nearby_landmark',
    contemporary_event: null,
    close_time_diff: 'contemporary_event',
    where_clues: null,
    when_clues: null
  };

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

// Helper function to generate sample hints for testing
const generateSampleHints = (imageId: string): Hint[] => {
  return [
    // Level 1 Hints
    {
      id: `sample-continent-${imageId}`,
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
};
