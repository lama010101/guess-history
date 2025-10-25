
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const registerZoomBlockers = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const globalWindow = window as typeof window & { __zoomBlockersRegistered?: boolean };

  if (globalWindow.__zoomBlockersRegistered) {
    return;
  }

  globalWindow.__zoomBlockersRegistered = true;

  const shouldAllowZoom = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return false;
    }

    return target.closest('[data-allow-zoom]') != null;
  };

  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey && !shouldAllowZoom(event.target)) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ['=', '+', '-', '0'].includes(event.key)) {
      if (!shouldAllowZoom(event.target)) {
        event.preventDefault();
      }
    }
  });

  const preventDefault = (event: Event) => event.preventDefault();

  const gestureHandler = (event: Event) => {
    if (!shouldAllowZoom(event.target)) {
      preventDefault(event);
    }
  };

  document.addEventListener('gesturestart' as any, gestureHandler as EventListener, { passive: false });
  document.addEventListener('gesturechange' as any, gestureHandler as EventListener, { passive: false });
  document.addEventListener('gestureend' as any, gestureHandler as EventListener, { passive: false });

  let lastTouchEnd = 0;

  document.addEventListener(
    'touchend',
    (event) => {
      const now = Date.now();

      if (now - lastTouchEnd <= 300 && !shouldAllowZoom(event.target)) {
        event.preventDefault();
      }

      lastTouchEnd = now;
    },
    { passive: false }
  );
};

registerZoomBlockers();

createRoot(document.getElementById('root')!).render(<App />);
