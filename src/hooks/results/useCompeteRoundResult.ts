import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGame, type GameImage } from '@/contexts/GameContext';
import { makeRoundId } from '@/utils/roomState';
import { HintDebt } from '@/utils/results/types';
import { RoundResult as ContextRoundResult } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { calculateLocationAccuracy, calculateTimeAccuracy, getTimeDifferenceDescription } from '@/utils/gameCalculations';

export interface CompetePlayerSummary {
  distanceKm: number | null;
  guessYear: number | null;
  eventYear: number;
  locationAccuracy: number;
  timeAccuracy: number;
  xpTotal: number;
  xpWhere: number;
  xpWhen: number;
  timeDifferenceDesc: string;
  guessLat: number | null;
  guessLng: number | null;
  eventLat: number;
  eventLng: number;
  locationName: string;
  imageTitle: string;
  imageDescription: string;
  imageUrl: string;
  sourceCitation?: string | null;
  confidence?: number;
  isCorrect: boolean;
}

export interface CompeteRoundResultState {
  isLoading: boolean;
  error: string | null;
  roundIndex: number | null;
  currentImage: GameImage | null;
  contextResult: ContextRoundResult | undefined;
  hintDebts: HintDebt[];
  playerSummary: CompetePlayerSummary | null;
}

type RoundHintRow = {
  hint_id: string;
  xpDebt: number;
  accDebt: number;
  label: string;
  hint_type: string;
  purchased_at: string;
  round_id: string;
  user_id?: string;
};
export function useCompeteRoundResult(roomId: string | null, roundNumber: number | null): CompeteRoundResultState {
  const { user } = useAuth();
  const { images, roundResults, isLoading: contextLoading, error: contextError } = useGame();
  const [hintDebts, setHintDebts] = useState<HintDebt[]>([]);
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [fetchedResult, setFetchedResult] = useState<ContextRoundResult | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);

  const validRound = typeof roundNumber === 'number' && Number.isFinite(roundNumber) ? Math.max(1, Number(roundNumber)) : null;
  const roundIndex = validRound != null ? validRound - 1 : null;

  const currentImage = useMemo<GameImage | null>(() => {
    if (roundIndex == null) return null;
    return images.length > roundIndex ? images[roundIndex] : null;
  }, [images, roundIndex]);

  const contextResult = useMemo<ContextRoundResult | undefined>(() => {
    if (roundIndex == null) return undefined;
    const list = Array.isArray(roundResults) ? (roundResults as Array<ContextRoundResult | null | undefined>) : [];
    // Filter out any null/undefined entries to avoid accessing properties on undefined during render
    const safeList: ContextRoundResult[] = list.filter((r): r is ContextRoundResult => !!r && typeof r === 'object');
    return safeList.find((result) => result.roundIndex === roundIndex);
  }, [roundResults, roundIndex]);

  useEffect(() => {
    if (!user?.id || !roomId || roundIndex == null) {
      setFetchedResult(null);
      setRemoteError(null);
      return;
    }

    if (contextResult) {
      setFetchedResult(null);
      setRemoteError(null);
      return;
    }

    let cancelled = false;

    const fetchResult = async () => {
      setRemoteLoading(true);
      setRemoteError(null);
      try {
        const { data, error } = await supabase
          .from('round_results')
          .select('image_id, score, accuracy, xp_total, xp_where, xp_when, hints_used, distance_km, guess_year, guess_lat, guess_lng, actual_lat, actual_lng, time_accuracy, location_accuracy')
          .eq('room_id', roomId)
          .eq('user_id', user.id)
          .eq('round_index', roundIndex)
          .maybeSingle();

        if (error) {
          if (!cancelled) {
            setFetchedResult(null);
            setRemoteError(error.message ?? 'Failed to fetch round result');
          }
          return;
        }

        if (!data) {
          if (!cancelled) {
            setFetchedResult(null);
          }
          return;
        }

        const mapped: ContextRoundResult = {
          roundIndex,
          imageId: data.image_id,
          guessCoordinates: data.guess_lat != null && data.guess_lng != null
            ? { lat: Number(data.guess_lat), lng: Number(data.guess_lng) }
            : undefined,
          actualCoordinates: data.actual_lat != null && data.actual_lng != null
            ? { lat: Number(data.actual_lat), lng: Number(data.actual_lng) }
            : undefined,
          distanceKm: data.distance_km != null ? Number(data.distance_km) : null,
          score: data.score != null ? Number(data.score) : null,
          guessYear: data.guess_year != null ? Number(data.guess_year) : null,
          xpWhen: data.xp_when != null ? Number(data.xp_when) : undefined,
          xpWhere: data.xp_where != null ? Number(data.xp_where) : undefined,
          accuracy: data.accuracy != null ? Number(data.accuracy) : undefined,
          hintsUsed: data.hints_used != null ? Number(data.hints_used) : undefined,
          xpTotal: data.xp_total != null ? Number(data.xp_total) : undefined,
          timeAccuracy: data.time_accuracy != null ? Number(data.time_accuracy) : undefined,
          locationAccuracy: data.location_accuracy != null ? Number(data.location_accuracy) : undefined,
        };

        if (!cancelled) {
          setFetchedResult(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          setFetchedResult(null);
          setRemoteError(err instanceof Error ? err.message : 'Failed to fetch round result');
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    };

    fetchResult();

    return () => {
      cancelled = true;
    };
  }, [contextResult, roundIndex, roomId, user?.id]);

  const activeResult = contextResult ?? fetchedResult ?? undefined;

  useEffect(() => {
    let cancelled = false;

    const fetchHintDebts = async () => {
      if (!user?.id || !currentImage || !activeResult || !roomId || validRound == null) {
        setHintDebts([]);
        setHintError(null);
        return;
      }

      setHintLoading(true);
      setHintError(null);

      try {
        const roundSessionId = makeRoundId(roomId, validRound);
        const { data, error } = await supabase
          .from('round_hints')
          .select('hint_id, xpDebt, accDebt, label, hint_type, purchased_at, round_id')
          .eq('user_id', user.id)
          .eq('round_id', roundSessionId)
          .order('purchased_at', { ascending: true });

        if (error) {
          throw error;
        }

        if (cancelled) return;

        const rows: RoundHintRow[] = (data ?? []) as RoundHintRow[];
        const processed = rows
          .map<HintDebt>((hint) => ({
            hintId: hint.hint_id,
            xpDebt: Number(hint.xpDebt) || 0,
            accDebt: Number(hint.accDebt) || 0,
            label: hint.label,
            hint_type: hint.hint_type,
          }))
          .filter((hint) => (hint.xpDebt ?? 0) > 0 || (hint.accDebt ?? 0) > 0);

        setHintDebts(processed);
      } catch (err) {
        console.error('[useCompeteRoundResult] Failed to load hint debts', err);
        if (!cancelled) {
          setHintDebts([]);
          setHintError('Failed to load hint penalties');
        }
      } finally {
        if (!cancelled) setHintLoading(false);
      }
    };

    fetchHintDebts();
    return () => {
      cancelled = true;
    };
  }, [user?.id, roomId, validRound, currentImage, activeResult]);

  const playerSummary = useMemo<CompetePlayerSummary | null>(() => {
    if (!activeResult || !currentImage) return null;

    const distanceKm = activeResult.distanceKm ?? null;
    const eventYear = currentImage.year || 1900;
    const guessYear = activeResult.guessYear ?? null;

    const locationAccuracy = distanceKm == null
      ? 0
      : (activeResult.xpWhere !== undefined
          ? Math.round(Number(activeResult.xpWhere))
          : Math.round(calculateLocationAccuracy(distanceKm)));

    const timeAccuracy = guessYear == null
      ? 0
      : (activeResult.xpWhen !== undefined
          ? Math.round(Number(activeResult.xpWhen))
          : Math.round(calculateTimeAccuracy(guessYear, eventYear)));

    const xpWhere = activeResult.xpWhere ?? (distanceKm == null ? 0 : Math.round(calculateLocationAccuracy(distanceKm)));
    const xpWhen = activeResult.xpWhen ?? (guessYear == null ? 0 : Math.round(calculateTimeAccuracy(guessYear, eventYear)));
    const totalXpDebt = hintDebts.reduce((sum, debt) => sum + (debt.xpDebt ?? 0), 0);
    const xpTotal = activeResult.score ?? Math.max(0, xpWhere + xpWhen - totalXpDebt);
    const timeDifferenceDesc = guessYear == null ? 'No guess' : getTimeDifferenceDescription(guessYear, eventYear);
    const isCorrect = locationAccuracy >= 95;

    return {
      distanceKm: distanceKm == null ? null : Math.round(distanceKm),
      guessYear,
      eventYear,
      locationAccuracy,
      timeAccuracy,
      xpTotal,
      xpWhere,
      xpWhen,
      timeDifferenceDesc,
      guessLat: activeResult.guessCoordinates?.lat ?? null,
      guessLng: activeResult.guessCoordinates?.lng ?? null,
      eventLat: activeResult.actualCoordinates?.lat ?? currentImage.latitude,
      eventLng: activeResult.actualCoordinates?.lng ?? currentImage.longitude,
      locationName: currentImage.location_name || 'Unknown Location',
      imageTitle: currentImage.title || 'Untitled',
      imageDescription: currentImage.description || 'No description.',
      imageUrl: currentImage.url || 'placeholder.jpg',
      sourceCitation: currentImage.source_citation,
      confidence: currentImage.confidence ?? 0,
      isCorrect,
    };
  }, [activeResult, currentImage, hintDebts]);

  const derivedError = contextError
    ?? (!activeResult ? (hintError ?? remoteError) : null)
    ?? null;

  const hasActiveResult = Boolean(activeResult && currentImage);
  const loadingState = hasActiveResult
    ? (hintLoading && !playerSummary)
    : (contextLoading || hintLoading || remoteLoading);

  return {
    isLoading: loadingState,
    error: hasActiveResult ? null : derivedError,
    roundIndex,
    currentImage,
    contextResult: activeResult,
    hintDebts,
    playerSummary,
  };
}
