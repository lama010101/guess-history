
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { inject } from '@vercel/analytics';

// This ensures we have a valid DOM element before rendering
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');
 
// Vercel Web Analytics (prod-only)
if (import.meta.env.PROD) {
  inject();
}

// Register service worker (prod-only)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const buildId = import.meta.env.VITE_BUILD_ID ?? 'dev';

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        `/sw.js?build=${encodeURIComponent(buildId)}`
      );

      const requestActivation = () => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      requestActivation();

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (err) {
      console.error('[SW] registration failed', err);
    }
  };

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    registerServiceWorker().catch((err) => {
      console.error('[SW] registration failed', err);
    });
  });
}

createRoot(rootElement).render(<App />);
