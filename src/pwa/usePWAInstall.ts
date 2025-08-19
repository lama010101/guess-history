import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Local storage key for UX persistence
const LS_KEY = 'gh_pwa_install_state';
const COOLDOWN_DAYS = 14;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

// Extend types for beforeinstallprompt
declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms?: string[];
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
  interface Navigator {
    standalone?: boolean; // iOS Safari
  }
}

export type InstallEvent = BeforeInstallPromptEvent | null;

export type InstallState = {
  isStandalone: boolean;
  canPrompt: boolean;
  prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  lastDismissedAt?: number;
  dismissedCount: number;
  installedAt?: number;
};

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { dismissedCount: 0 } as Partial<InstallState>;
    const parsed = JSON.parse(raw);
    return parsed as Partial<InstallState>;
  } catch {
    return { dismissedCount: 0 } as Partial<InstallState>;
  }
}

function savePersisted(partial: Partial<InstallState>) {
  const prev = loadPersisted();
  const next = { ...prev, ...partial };
  localStorage.setItem(LS_KEY, JSON.stringify(next));
}

function getPlatform(): InstallState['platform'] {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Chrome|Edg|Brave|Chromium|OPR/.test(ua)) return 'desktop';
  return 'unknown';
}

function getStandalone(): boolean {
  const mql = window.matchMedia('(display-mode: standalone)');
  const standaloneMedia = mql && mql.matches;
  const standaloneIOS = (navigator as any).standalone === true;
  return Boolean(standaloneMedia || standaloneIOS);
}

export function usePWAInstall(): InstallState {
  const deferredPromptRef = useRef<InstallEvent>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(getStandalone());
  const [platform, setPlatform] = useState<InstallState['platform']>(getPlatform());
  const persisted = useMemo(() => loadPersisted(), []);
  const [dismissedCount, setDismissedCount] = useState<number>(persisted.dismissedCount ?? 0);
  const [lastDismissedAt, setLastDismissedAt] = useState<number | undefined>(persisted.lastDismissedAt);
  const [installedAt, setInstalledAt] = useState<number | undefined>(persisted.installedAt);

  useEffect(() => {
    const onBIP = (e: BeforeInstallPromptEvent) => {
      // Chrome/Edge: capture and defer native prompt
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanPrompt(true);
      window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'prompt_captured' } }));
    };
    const onInstalled = () => {
      const ts = Date.now();
      setInstalledAt(ts);
      savePersisted({ installedAt: ts });
      setCanPrompt(false);
      deferredPromptRef.current = null;
      window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'installed' } }));
    };

    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);

    const onVis = () => setIsStandalone(getStandalone());
    document.addEventListener('visibilitychange', onVis);
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setIsStandalone(getStandalone());
    mql.addEventListener?.('change', onChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
      document.removeEventListener('visibilitychange', onVis);
      mql.removeEventListener?.('change', onChange);
    };
  }, []);

  const prompt = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const ev = deferredPromptRef.current;
    const isIOS = platform === 'ios';
    if (ev) {
      try {
        await ev.prompt();
        const choice = await ev.userChoice;
        if (choice.outcome === 'accepted') {
          deferredPromptRef.current = null; // cannot reuse after accept
          setCanPrompt(false);
          const ts = Date.now();
          setInstalledAt(ts);
          savePersisted({ installedAt: ts });
          window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'accepted' } }));
          return 'accepted';
        } else {
          const ts = Date.now();
          setDismissedCount((c) => {
            const next = (c ?? 0) + 1;
            savePersisted({ dismissedCount: next, lastDismissedAt: ts });
            return next;
          });
          setLastDismissedAt(ts);
          window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'dismissed' } }));
          return 'dismissed';
        }
      } catch {
        return 'dismissed';
      }
    }
    if (isIOS) {
      // iOS has no beforeinstallprompt; caller should show instructions
      window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'instructions_needed' } }));
      return 'unavailable';
    }
    return 'unavailable';
  }, [platform]);

  return {
    isStandalone,
    canPrompt,
    prompt,
    platform,
    lastDismissedAt,
    dismissedCount,
    installedAt,
  };
}

export function shouldAutoShowInstall(state: InstallState): boolean {
  if (state.isStandalone) return false;
  const now = Date.now();
  const last = state.lastDismissedAt ?? 0;
  if (last && now - last < COOLDOWN_MS) return false;
  const hasSessionShown = sessionStorage.getItem('gh_pwa_auto_shown') === '1';
  if (hasSessionShown) return false;
  // Show if we can prompt or on iOS where we show instructions
  return state.canPrompt || state.platform === 'ios';
}

export function markAutoShown() {
  try { sessionStorage.setItem('gh_pwa_auto_shown', '1'); } catch {}
}
