import React, { useEffect, useRef, useState } from 'react';
import { usePWAInstall, shouldAutoShowInstall, markAutoShown } from '@/pwa/usePWAInstall';

// Non-blocking PWA install prompt and iOS instructions modal
// - Mobile: bottom card; Desktop: bottom-right card
// - iOS: accessible instructional modal with steps

type Props = {
  auto?: boolean; // when true, decides on its own whether to show
  onClose?: () => void;
};

export default function InstallPrompt({ auto, onClose }: Props) {
  const state = usePWAInstall();
  const [open, setOpen] = useState<boolean>(!auto);
  const [status, setStatus] = useState<string>(''); // for aria-live
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (!auto) return;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
    }
    if (shouldAutoShowInstall(state)) {
      setOpen(true);
      markAutoShown();
      window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'prompt_shown' } }));
    }
  }, [auto, state]);

  useEffect(() => {
    // Hide automatically if app becomes standalone or installed event fired
    if (state.isStandalone || state.installedAt) {
      setOpen(false);
    }
  }, [state.isStandalone, state.installedAt]);

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  const handleInstall = async () => {
    const outcome = await state.prompt();
    if (outcome === 'accepted') {
      setStatus('App installed successfully.');
      close();
    } else if (outcome === 'dismissed') {
      setStatus('Install dismissed. You can add it later from Account.');
      close();
    } else {
      // iOS path -> show instructions modal; if not iOS, just close
      if (state.platform !== 'ios') close();
    }
  };

  const handleNotNow = () => {
    const ts = Date.now();
    window.localStorage.setItem('gh_pwa_install_state', JSON.stringify({
      ...(state.lastDismissedAt ? { lastDismissedAt: state.lastDismissedAt } : {}),
      dismissedCount: (state.dismissedCount ?? 0) + 1,
      lastDismissedAt: ts,
      installedAt: state.installedAt,
    }));
    window.dispatchEvent(new CustomEvent('telemetry', { detail: { type: 'pwa_install', action: 'dismissed' } }));
    close();
  };

  if (!open) return null;
  if (state.isStandalone) return null;

  // iOS: show instructions modal when no native prompt
  if (!state.canPrompt && state.platform === 'ios') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={close} />
        <div role="dialog" aria-modal="true" aria-labelledby="gh-ios-install-title" aria-describedby="gh-ios-install-desc" className="relative bg-zinc-900 text-white rounded-xl shadow-xl w-[92%] max-w-md p-5">
          <h2 id="gh-ios-install-title" className="text-lg font-semibold mb-2">Install Guess History</h2>
          <p id="gh-ios-install-desc" className="text-sm text-zinc-300 mb-4">Add Guess History to your Home Screen for faster access and full-screen play.</p>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Tap the <span aria-label="Share">Share</span> button in Safari.</li>
            <li>Select <strong>Add to Home Screen</strong>.</li>
            <li>Confirm the name "Guess History" and tap <strong>Add</strong>.</li>
          </ol>
          <div className="mt-5 flex gap-2 justify-end">
            <button onClick={close} className="px-3 py-2 rounded-md bg-zinc-700 hover:bg-zinc-600">Close</button>
            <button onClick={handleNotNow} className="px-3 py-2 rounded-md bg-zinc-100 text-black hover:bg-white">Got it</button>
          </div>
          <div aria-live="polite" className="sr-only">{status}</div>
        </div>
      </div>
    );
  }

  // Default: Chrome/Edge mobile & desktop card
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-4 md:translate-x-0 z-[9999]">
      <div className="max-w-sm w-[calc(100vw-2rem)] md:w-80 rounded-xl shadow-lg bg-zinc-900/95 backdrop-blur text-white border border-zinc-800 p-4">
        <div className="flex items-start gap-3">
          <img src="/icons/logo.webp" alt="Guess History" className="w-10 h-10 rounded-md object-contain" />
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold">Install Guess History</div>
            <div className="text-sm text-zinc-300">Get faster access and full-screen play.</div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleInstall} className="px-3 py-2 rounded-md bg-[linear-gradient(45deg,_#c4b5fd_0%,_#f9a8d4_20%,_#fdba74_45%,_#fde68a_70%,_#86efac_100%)] text-black hover:opacity-90">Install</button>
              <button onClick={handleNotNow} className="px-3 py-2 rounded-md bg-transparent border border-zinc-700 hover:bg-zinc-800">Not now</button>
            </div>
          </div>
        </div>
        <div aria-live="polite" className="sr-only">{status}</div>
      </div>
    </div>
  );
}
