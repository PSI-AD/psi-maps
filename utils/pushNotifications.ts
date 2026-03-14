// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Push Notifications
// Full Web Push API integration with permission flow & deep linking
// ═══════════════════════════════════════════════════════════════════════════════

import { getRegistration } from './swRegistration';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    image?: string;
    tag?: string;
    /** Deep link URL to open when user taps the notification */
    url?: string;
    /** Custom data payload */
    data?: Record<string, any>;
    /** Actions (max 2 for most platforms) */
    actions?: Array<{ action: string; title: string; icon?: string }>;
    /** Silent notification (no sound/vibration) */
    silent?: boolean;
    /** Require interaction (don't auto-dismiss) */
    requireInteraction?: boolean;
}

export type NotificationPermission = 'default' | 'granted' | 'denied';

// ─── Feature Detection ───────────────────────────────────────────────────────

export function isPushSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator &&
        'PushManager' in window
    );
}

// ─── Permission Flow ─────────────────────────────────────────────────────────

/**
 * Get the current notification permission status.
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission as NotificationPermission;
}

/**
 * Request notification permission from the user.
 * Returns the resulting permission state.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('[Push] Notifications not supported');
        return 'denied';
    }

    // Already granted
    if (Notification.permission === 'granted') return 'granted';

    // Already denied (can't re-ask, user must enable in settings)
    if (Notification.permission === 'denied') {
        console.warn('[Push] Notifications blocked. User must enable in browser/device settings.');
        return 'denied';
    }

    try {
        const result = await Notification.requestPermission();
        console.log('[Push] Permission result:', result);
        return result as NotificationPermission;
    } catch (err) {
        console.error('[Push] Permission request failed:', err);
        return 'denied';
    }
}

// ─── Push Subscription ───────────────────────────────────────────────────────

/**
 * Subscribe the user to push notifications.
 * Returns the PushSubscription object (contains endpoint + keys).
 * 
 * @param vapidPublicKey - Your VAPID public key (base64url encoded)
 */
export async function subscribeToPush(
    vapidPublicKey?: string
): Promise<PushSubscription | null> {
    if (!isPushSupported()) {
        console.warn('[Push] Push notifications not supported');
        return null;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return null;

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            console.log('[Push] Already subscribed');
            return existing;
        }

        // Create new subscription
        const subscribeOptions: PushSubscriptionOptionsInit = {
            userVisibleOnly: true,
        };

        // Add VAPID key if provided
        if (vapidPublicKey) {
            subscribeOptions.applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        }

        const subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('[Push] Successfully subscribed:', subscription.endpoint);

        return subscription;
    } catch (err: any) {
        console.error('[Push] Subscription failed:', err);

        if (err.name === 'NotAllowedError') {
            console.warn('[Push] Permission was revoked — user blocked notifications');
        }

        return null;
    }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const success = await subscription.unsubscribe();
            console.log('[Push] Unsubscribed:', success);
            return success;
        }

        return true; // Already unsubscribed
    } catch (err) {
        console.error('[Push] Unsubscribe failed:', err);
        return false;
    }
}

/**
 * Get the current push subscription, if any.
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
    try {
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    } catch {
        return null;
    }
}

// ─── Local / App Notifications ───────────────────────────────────────────────

/**
 * Show a local notification (without server push).
 * Useful for in-app alerts, action confirmations, etc.
 */
export async function showLocalNotification(
    payload: PushNotificationPayload
): Promise<boolean> {
    if (getNotificationPermission() !== 'granted') {
        const perm = await requestNotificationPermission();
        if (perm !== 'granted') return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.png',
            badge: payload.badge || '/icons/icon-72x72.png',
            image: payload.image,
            tag: payload.tag || `psi-notification-${Date.now()}`,
            data: { url: payload.url || '/', ...payload.data },
            actions: payload.actions,
            silent: payload.silent,
            requireInteraction: payload.requireInteraction,
            vibrate: payload.silent ? undefined : [100, 50, 100],
        } as any);

        console.log('[Push] Local notification shown:', payload.title);
        return true;
    } catch (err) {
        console.error('[Push] Failed to show notification:', err);
        return false;
    }
}

/**
 * Convenience: show a property update notification.
 */
export function notifyPropertyUpdate(
    projectName: string,
    projectId: string,
    message?: string
): Promise<boolean> {
    return showLocalNotification({
        title: `${projectName} — Update`,
        body: message || 'New information available for this property',
        url: `/?project=${projectId}`,
        tag: `property-${projectId}`,
        actions: [
            { action: 'view', title: 'View Property' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    });
}

/**
 * Convenience: show a favorites sync notification.
 */
export function notifyFavoritesSync(count: number): Promise<boolean> {
    return showLocalNotification({
        title: 'Favorites Synced',
        body: `${count} favorite${count !== 1 ? 's' : ''} synced across your devices`,
        tag: 'favorites-sync',
        silent: true,
    });
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/**
 * Convert a VAPID public key from base64url to Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

/**
 * Serialize a PushSubscription for sending to your server.
 */
export function serializeSubscription(subscription: PushSubscription): object {
    const json = subscription.toJSON();
    return {
        endpoint: subscription.endpoint,
        keys: {
            p256dh: json.keys?.p256dh || '',
            auth: json.keys?.auth || '',
        },
        expirationTime: subscription.expirationTime,
    };
}
