
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[SW] registration failed', err);
    });
  });
}

createRoot(rootElement).render(<App />);
