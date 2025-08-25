export type GameMode = 'solo' | 'compete_sync' | 'compete_async';

export type GameModeConfig = {
  mode: GameMode;
  isCompete: boolean;
  isSync: boolean;
  isAsync: boolean;
  // Behavior flags, no UI enforced here
  roundTimerRequired: boolean; // true in compete_sync, false otherwise
  nextTimerEnabled: boolean; // true in compete_sync results, false otherwise
};

export function deriveGameModeFromPath(pathname: string): GameMode {
  const p = pathname.toLowerCase();
  if (p.includes('/compete/') && p.includes('/sync')) return 'compete_sync';
  if (p.includes('/compete/') && p.includes('/async')) return 'compete_async';
  // default to solo if not clearly compete sync/async
  return 'solo';
}

export function getGameModeConfig(explicitMode?: GameMode): GameModeConfig {
  const mode: GameMode = explicitMode ?? (typeof window !== 'undefined'
    ? deriveGameModeFromPath(window.location.pathname)
    : 'solo');

  const isSync = mode === 'compete_sync';
  const isAsync = mode === 'compete_async';
  const isCompete = isSync || isAsync;

  return {
    mode,
    isCompete,
    isSync,
    isAsync,
    roundTimerRequired: isSync,
    nextTimerEnabled: isSync,
  };
}
