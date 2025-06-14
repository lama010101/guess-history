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
  const [purchasedHints, setPurchasedHints] = useState<Hint[]>([]);
  const [purchasedHintIds, setPurchasedHintIds] = useState<string[]>([]);
  const [xpDebt, setXpDebt] = useState(0);
  const [accDebt, setAccDebt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHintLoading, setIsHintLoading] = useState(false);
  
  const imageIdRef = useRef<string | null>(null);

  // Group hints by level for the modal UI
  const hintsByLevel = availableHints.reduce((acc, hint) => {
    if (!acc[hint.level]) {
      acc[hint.level] = [];
    }
    acc[hint.level].push(hint);
    return acc;
  }, {} as Record<number, Hint[]>);

  // Fetch available hints for the current image
  const fetchHints = useCallback(async (imageId: string) => {
    if (!imageId) {
      addLog('error', 'fetchHints called without imageId');
      setIsLoading(false);
      return;
    }

    setIsHintLoading(true);
    addLog('info', `Fetching hints for image: ${imageId}`);

    try {
      const { data, error } = await supabase
        .from('hints')
        .select('*')
        .eq('image_id', imageId)
        .order('level', { ascending: true });

      if (error) {
        throw new Error(`Error fetching hints: ${error.message}`);
      }

      if (data) {
        console.log(`[useHintV2] Successfully fetched ${data.length} hints.`, data);
        
        // If we're in development mode and no hints were found, use sample hints
        if (data.length === 0 && process.env.NODE_ENV === 'development') {
          console.warn('DEV: No hints found in database. Loading sample hints.');
          setAvailableHints(getSampleHints(imageId));
        } else {
          setAvailableHints(data as Hint[]);
        }
        
        addLog('success', `Successfully fetched ${data.length} hints`);
      } else {
        addLog('warn', 'No hints found for this image');
        setAvailableHints([]);
      }
    } catch (error) {
      addLog('error', `Hint fetch failed: ${error instanceof Error ? error.message : String(error)}`);
      console.error(`[useHintV2] Hint fetch failed:`, error);
      // In development, load sample hints on failure
      if (process.env.NODE_ENV === 'development') {
        console.warn('DEV: Loading sample hints due to fetch failure.');
        setAvailableHints(getSampleHints(imageId));
      }
    } finally {
      setIsHintLoading(false);
      setIsLoading(false);
    }
  }, [addLog]);

  // Effect to fetch hints when image data changes
  useEffect(() => {
    console.log('[useHintV2] Effect triggered. imageData:', imageData);
    if (imageData?.id && imageData.id !== imageIdRef.current) {
      console.log(`[useHintV2] New image detected. Old: ${imageIdRef.current}, New: ${imageData.id}. Fetching hints.`);
      imageIdRef.current = imageData.id;
      // Reset state for new round
      setPurchasedHints([]);
      setPurchasedHintIds([]);
      setXpDebt(0);
      setAccDebt(0);
      fetchHints(imageData.id);
    }
  }, [imageData, fetchHints]);

  // Purchase a hint and update state
  const purchaseHint = useCallback(async (hintId: string) => {
    const hintToPurchase = availableHints.find(h => h.id === hintId);

    if (!hintToPurchase) {
      addLog('error', `Attempted to purchase non-existent hint with ID: ${hintId}`);
      return;
    }
    
    if (purchasedHintIds.includes(hintId)) {
      addLog('warn', `Hint ${hintId} has already been purchased.`);
      return;
    }

    addLog('info', `Purchasing hint: ${hintToPurchase.type} (ID: ${hintId})`);

    setXpDebt(prev => prev + (hintToPurchase.xp_cost || 0));
    setAccDebt(prev => prev + (hintToPurchase.accuracy_penalty || 0));
    
    setPurchasedHints(prev => [...prev, hintToPurchase]);
    setPurchasedHintIds(prev => [...prev, hintId]);

    // Optional: Log purchase to Supabase (if needed for analytics)
    if (user && imageData?.id) {
      try {
        await supabase.from('hint_purchases').insert({
          user_id: user.id,
          hint_id: hintId,
          image_id: imageData.id,
          xp_cost: hintToPurchase.xp_cost,
          accuracy_penalty: hintToPurchase.accuracy_penalty
        });
        addLog('success', 'Hint purchase logged to database.');
      } catch (error) {
        addLog('error', `Failed to log hint purchase: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }, [availableHints, purchasedHintIds, addLog, user, imageData?.id]);

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

// Sample data for development and testing
const getSampleHints = (imageId: string): Hint[] => {
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
      text: 'Distance > 500km',
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
      text: 'Time Difference > 20 years',
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
    }
  ];
};
