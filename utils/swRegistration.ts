// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Service Worker Registration
// Safe registration with update detection, lifecycle management,
// push notification hooks, and background sync integration
// ═══════════════════════════════════════════════════════════════════════════════

export interface SWRegistrationCallbacks {
    onSuccess?: (registration: ServiceWorkerRegistration) => void;
    onUpdate?: (registration: ServiceWorkerRegistration) => void;
    onError?: (error: Error) => void;
    onOffline?: () => void;
    onOnline?: () => void;
    /** Called when a push notification is clicked and the app navigates */
    onNotificationNavigation?: (data: { url: string; projectId?: string; action?: string }) => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker with proper lifecycle management.
 * Only registers in production or when explicitly enabled.
 */
export function registerServiceWorker(callbacks: SWRegistrationCallbacks = {}): void {
    // Only register SW in production (served over HTTPS or localhost)
    if (!('serviceWorker' in navigator)) {
        console.warn('[PWA] Service Workers not supported in this browser');
        return;
    }

    // Register after window load for better FCP
    window.addEventListener('load', () => {
        const swUrl = '/sw.js';

        navigator.serviceWorker
            .register(swUrl, { scope: '/' })
            .then((registration) => {
                swRegistration = registration;
                console.log('[PWA] Service Worker registered successfully');

                // Check for updates periodically (every 60 minutes)
                setInterval(() => {
                    registration.update().catch(() => { });
                }, 60 * 60 * 1000);

                // Handle SW updates
                registration.onupdatefound = () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) return;

                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                // New content is available — show update prompt
                                console.log('[PWA] New content available, will refresh on next visit');
                                callbacks.onUpdate?.(registration);
                            } else {
                                // Initial install — content cached for offline
                                console.log('[PWA] Content cached for offline use');
                                callbacks.onSuccess?.(registration);
                            }
                        }
                    };
                };
            })
            .catch((error) => {
                console.error('[PWA] Service Worker registration failed:', error);
                callbacks.onError?.(error);
            });
    });

    // ── Listen for messages from the Service Worker ──────────────────────────
    navigator.serviceWorker.addEventListener('message', (event) => {
        const { data } = event;
        if (!data) return;

        // Notification click deep link
        if (data.type === 'NOTIFICATION_CLICK') {
            console.log('[PWA] Notification click deep link:', data.url);
            callbacks.onNotificationNavigation?.({
                url: data.url,
                projectId: data.projectId,
                action: data.action,
            });

            // If the app doesn't handle the navigation, use URL directly
            if (data.url && data.url !== window.location.pathname + window.location.search) {
                // Parse the URL for query params and update app state
                const targetUrl = new URL(data.url, window.location.origin);
                const projectId = targetUrl.searchParams.get('project');
                if (projectId) {
                    // Dispatch an event for the app to handle
                    window.dispatchEvent(new CustomEvent('psi-deep-link', {
                        detail: { projectId, url: data.url },
                    }));
                }
            }
        }

        // Sync completion
        if (data.type === 'SYNC_COMPLETE') {
            console.log(`[PWA] Background sync complete: ${data.count}/${data.total} actions`);
            window.dispatchEvent(new CustomEvent('psi-sync-complete', {
                detail: { count: data.count, total: data.total },
            }));
        }
    });

    // Online/Offline detection
    window.addEventListener('online', () => {
        console.log('[PWA] Connection restored');
        callbacks.onOnline?.();

        // Trigger manual sync processing when back online
        if (swRegistration?.active) {
            swRegistration.active.postMessage({ type: 'PROCESS_SYNC' });
        }
    });

    window.addEventListener('offline', () => {
        console.log('[PWA] Connection lost — using cached data');
        callbacks.onOffline?.();
    });
}

/**
 * Unregister the service worker and clear all caches.
 * Useful for debugging or when the user wants to reset the app.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) return false;

    try {
        const registration = await navigator.serviceWorker.ready;
        const success = await registration.unregister();
        if (success) {
            // Clear all caches too
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
            console.log('[PWA] Service Worker unregistered and caches cleared');
        }
        return success;
    } catch (error) {
        console.error('[PWA] Failed to unregister Service Worker:', error);
        return false;
    }
}

/**
 * Force the waiting service worker to take control immediately.
 */
export function skipWaiting(): void {
    if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
}

/**
 * Get the current registration instance.
 */
export function getRegistration(): ServiceWorkerRegistration | null {
    return swRegistration;
}

/**
 * Register for periodic background sync (if supported).
 * Keeps app data fresh even when the user hasn't opened the app.
 */
export async function registerPeriodicSync(
    tag: string = 'psi-content-sync',
    minIntervalMs: number = 12 * 60 * 60 * 1000 // 12 hours
): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        if ('periodicSync' in registration) {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync' as any,
            });

            if (status.state === 'granted') {
                await (registration as any).periodicSync.register(tag, {
                    minInterval: minIntervalMs,
                });
                console.log(`[PWA] Periodic sync registered: ${tag}`);
                return true;
            }
        }
    } catch (err) {
        console.warn('[PWA] Periodic sync registration failed:', err);
    }
    return false;
}

/**
 * Manually trigger the sync engine (useful after coming back online).
 */
export function triggerSync(): void {
    if (swRegistration?.active) {
        swRegistration.active.postMessage({ type: 'PROCESS_SYNC' });
        console.log('[PWA] Manual sync trigger sent to SW');
    }
}
