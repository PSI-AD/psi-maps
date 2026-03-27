
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import { registerServiceWorker } from './utils/swRegistration';
import { initSyncEngine } from './utils/backgroundSync';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Register PWA Service Worker ──────────────────────────────────────────────
registerServiceWorker({
  onSuccess: (reg) => {
    console.log('[PWA] Content cached for offline use');
  },
  onUpdate: (reg) => {
    console.log('[PWA] New version available');
    // Dispatch event for AppUpdatePrompt to show the update UI
    // (instead of silently reloading, which would lose user state)
    window.dispatchEvent(new CustomEvent('psi-sw-update-available', {
      detail: { registration: reg },
    }));
  },
  onOffline: () => {
    console.log('[PWA] App is running offline');
  },
  onOnline: () => {
    console.log('[PWA] Connection restored');
  },
  onNotificationNavigation: (data) => {
    console.log('[PWA] Notification deep link:', data);
    // Navigate to the target — App.tsx listens for 'psi-deep-link' events
    if (data.projectId) {
      window.dispatchEvent(new CustomEvent('psi-deep-link', {
        detail: { projectId: data.projectId, url: data.url },
      }));
    }
    if (data.action) {
      // Handle action-based deep links (search, favorites, chat)
      window.dispatchEvent(new CustomEvent('psi-deep-link-action', {
        detail: { action: data.action, url: data.url },
      }));
    }
  },
});

// ── Initialize Background Sync Engine ────────────────────────────────────────
initSyncEngine();

// ── Initialize Firebase Platform (deferred — after first paint) ──────────────
import { initFirebasePlatform, onForegroundMessage, AnalyticsEvents } from './utils/firebasePlatform';

// Defer non-critical Firebase services to after the browser is idle.
// This prevents Analytics, Remote Config, Performance, and Messaging init
// from contributing to Total Blocking Time (TBT) during startup.
const deferInit = typeof requestIdleCallback === 'function'
  ? requestIdleCallback
  : (cb: () => void) => setTimeout(cb, 2000);

deferInit(() => {
  initFirebasePlatform({
    enablePerformance: false,   // Disabled — API not enabled in Google Cloud Console (403)
    enableMessaging: true,
    enableRemoteConfig: false,  // Disabled — API not enabled in Google Cloud Console (403)
  }).then(() => {
    // Listen for FCM foreground messages → show in-app notification
    onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        // Show a native notification even in foreground
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: body || '',
            icon: '/icons/icon-192x192.png',
          });
        }
      }
    });

    // Log app opened event
    AnalyticsEvents.screenView('map');
  });
});
