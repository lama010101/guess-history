import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from '@/components/ui/button';
import { Loader2, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const activeStatuses = new Set(['selecting', 'fetching', 'preloading']);

export default function PreparationOverlay() {
  const {
    prepStatus,
    prepProgress,
    prepError,
    abortPreparation,
    startGame,
    roundTimerSec,
    hintsAllowed,
    timerEnabled,
    preparedImages,
    preparedLoadedIndices,
  } = useGame();

  const navigate = useNavigate();

  const isActive = activeStatuses.has(prepStatus as any);
  const isError = prepStatus === 'error';

  const subtext = useMemo(() => {
    switch (prepStatus) {
      case 'selecting':
        return 'Selecting images…';
      case 'fetching':
        return 'Fetching image metadata…';
      case 'preloading':
        return 'Preloading images…';
      case 'done':
        return 'Ready';
      case 'error':
        return prepError || 'An error occurred during preparation.';
      default:
        return '';
    }
  }, [prepStatus, prepError]);

  const { loaded = 0, total = 0 } = prepProgress || { loaded: 0, total: 0 };
  const filledSegments = useMemo(() => {
    const segments = 5;
    if (total > 0) {
      const ratio = Math.max(0, Math.min(1, loaded / total));
      return Math.round(ratio * segments);
    }
    return 0;
  }, [loaded, total]);

  const liveAnnouncement = useMemo(() => {
    if (isError) return `Preparation failed. ${prepError ?? ''}`.trim();
    if (total > 0) return `You're about to be dropped into history... guess which year and location you've landed in. ${loaded} of ${total} images ready.`;
    switch (prepStatus) {
      case 'selecting':
        return 'Selecting images.';
      case 'fetching':
        return 'Fetching image metadata.';
      case 'preloading':
        return 'Preloading images.';
      case 'done':
        return 'Preparation complete.';
      default:
        return 'Preparing.';
    }
  }, [isError, prepError, prepStatus, loaded, total]);

  // Hold visibility for 500ms after the 5th image segment fills so users can see it
  const [holdVisible, setHoldVisible] = useState(false);
  const prevSegmentsRef = useRef(filledSegments);
  const holdTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevSegmentsRef.current !== filledSegments && filledSegments === 5) {
      setHoldVisible(true);
      if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = window.setTimeout(() => {
        setHoldVisible(false);
        holdTimeoutRef.current = null;
      }, 500);
    }
    prevSegmentsRef.current = filledSegments;
  }, [filledSegments]);

  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) window.clearTimeout(holdTimeoutRef.current);
    };
  }, []);

  const hasLoaded = useCallback(
    (collection: Set<number> | number[] | undefined, index: number): boolean => {
      if (!collection) return false;
      return collection instanceof Set
        ? collection.has(index)
        : Array.isArray(collection)
        ? (collection as number[]).includes(index)
        : false;
    },
    []
  );

  const handleRetry = useCallback(() => {
    // Re-run start flow with current settings; omit roomId to create a new session
    startGame({
      timerSeconds: roundTimerSec,
      hintsPerGame: hintsAllowed,
      timerEnabled,
    }).catch(() => {
      /* GameContext handles errors */
    });
  }, [startGame, roundTimerSec, hintsAllowed, timerEnabled]);

  const handleCancel = useCallback(() => {
    abortPreparation();
    // Navigate to a safe page
    navigate('/home', { replace: true });
  }, [abortPreparation, navigate]);

  const shouldShow = isError || isActive || holdVisible;
  if (!shouldShow) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game preparation"
        className="relative z-10 w-[min(92vw,520px)] rounded-xl border border-white/10 bg-white/90 p-5 shadow-xl dark:bg-zinc-900/90"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          {isError ? (
            <TriangleAlert className="h-6 w-6 text-red-500" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-history-primary" />
          )}
          <h2 className="text-xl font-semibold">{isError ? 'Preparation failed' : "You're about to be dropped into history…"}</h2>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-4">
          {/* Subtext and live region */}
          <p className="text-sm text-muted-foreground">{subtext}</p>
          <p className="sr-only" aria-live="polite" role="status">{liveAnnouncement}</p>

          {/* Segmented progress bar (always 5 segments) */}
          {!isError && (
            <div className="flex gap-1" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={
                    'h-2 flex-1 rounded-sm transition-colors duration-300 ' +
                    (i < filledSegments ? 'bg-history-primary' : 'bg-zinc-300 dark:bg-zinc-700')
                  }
                />
              ))}
            </div>
          )}

          {/* Mini-cards row: 5 fixed-size items to avoid layout shift */}
          {!isError && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => {
                const img = preparedImages?.[i];
                const isLoaded = hasLoaded(preparedLoadedIndices as any, i);
                return (
                  <div
                    key={i}
                    className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800"
                  >
                    {/* Skeleton shimmer */}
                    {!isLoaded && (
                      <div className="h-full w-full animate-pulse bg-gradient-to-r from-zinc-200 via-zinc-300 to-zinc-200 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800" />
                    )}
                    {/* Image preview */}
                    {isLoaded && img?.url && (
                      <img
                        src={img.url}
                        alt={img.title || 'Prepared image'}
                        className="h-full w-full object-cover"
                        decoding="async"
                        loading="eager"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isError && (
            <p className="text-sm text-red-600 dark:text-red-400 break-words">{prepError}</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-3">
          {isError ? (
            <>
              <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleRetry}>Retry</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          )}
        </div>
      </div>
    </div>
  );
}
