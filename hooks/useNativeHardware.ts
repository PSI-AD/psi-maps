import { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Network } from '@capacitor/network';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useNativeHardware = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // 1. Status Bar Setup (Dark overlays webview for immersive map look)
    try {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setOverlaysWebView({ overlay: true });
    } catch (e) {
      console.warn("Status bar config failed", e);
    }

    // 2. Network State Handling
    const networkListener = Network.addListener('networkStatusChange', status => {
      if (!status.connected) {
        // Tie into existing PWA offline notifications system
        window.dispatchEvent(new Event('offline'));
      } else {
        window.dispatchEvent(new Event('online'));
      }
    });

    // 3. Deep Linking (App Links / Universal Links)
    const appUrlListener = CapacitorApp.addListener('appUrlOpen', data => {
      try {
        const url = new URL(data.url);
        const action = url.searchParams.get('action');
        const project = url.searchParams.get('project');
        
        // Emulate the behavior already programmed into App.tsx for web
        if (action) {
          if (action === 'search') window.dispatchEvent(new CustomEvent('open-mobile-search'));
          if (action === 'favorites') window.dispatchEvent(new CustomEvent('open-favorites-panel'));
          if (action === 'chat') window.dispatchEvent(new CustomEvent('open-ai-chat'));
        }
        
        if (project) {
          // Trigger the 'psi-deep-link' event from App.tsx
          window.dispatchEvent(new CustomEvent('psi-deep-link', { detail: { projectId: project } }));
        }
      } catch (e) {
        console.warn('Deep link parsing failed:', e);
      }
    });

    return () => {
      networkListener.then(l => l.remove());
      appUrlListener.then(l => l.remove());
    };
  }, []);
};
