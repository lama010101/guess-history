import React, { useMemo, useCallback } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Progress } from '@/components/ui/progress';
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

  const percent = useMemo(() => {
    const { loaded = 0, total = 0 } = prepProgress || { loaded: 0, total: 0 };
    if (total > 0) return Math.round((loaded / total) * 100);
    // During preloading but unknown total, show an indeterminate low fill
    if (prepStatus === 'preloading') return 5;
    return 0;
  }, [prepProgress, prepStatus]);

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
    navigate('/test', { replace: true });
  }, [abortPreparation, navigate]);

  if (!isActive && !isError) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-xl border border-white/10 bg-white/90 p-6 shadow-xl dark:bg-zinc-900/90"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          {isError ? (
            <TriangleAlert className="h-6 w-6 text-red-500" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-history-primary" />
          )}
          <h2 className="text-xl font-semibold">{isError ? 'Preparation failed' : 'Preparing game…'}</h2>
        </div>

        {/* Body */}
        <div className="mt-4 space-y-3" aria-live="polite" role="status">
          <p className="text-sm text-muted-foreground">{subtext}</p>

          {!isError && (
            <>
              <Progress value={percent} className="h-2" />
              {prepProgress?.total ? (
                <p className="text-xs text-muted-foreground">
                  {prepProgress.loaded} / {prepProgress.total}
                </p>
              ) : null}
            </>
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
