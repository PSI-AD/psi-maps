// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Firebase Cloud Messaging Service Worker
// Handles background push notifications with deep linking support
// ═══════════════════════════════════════════════════════════════════════════════

// Import Firebase scripts for SW
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCt5DngU6nykCcp7Lklm2xUgpzOFLB7KKY",
    authDomain: "psimaps-pro.firebaseapp.com",
    projectId: "psimaps-pro",
    storageBucket: "psimaps-pro.firebasestorage.app",
    messagingSenderId: "618627128805",
    appId: "1:618627128805:web:b9a7a3e475f54f590b230c",
    measurementId: "G-KXCXB3TXNZ"
});

const messaging = firebase.messaging();

// ── Handle background messages (when app is not in foreground) ────────────────
messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Background message:', payload);

    const { title, body, icon, image } = payload.notification || {};
    const data = payload.data || {};

    const notificationOptions = {
        body: body || 'You have a new notification',
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: image || undefined,
        tag: data.tag || `psi-fcm-${Date.now()}`,
        data: {
            url: data.url || '/',
            projectId: data.projectId,
            action: data.action,
            ...data,
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
        requireInteraction: data.requireInteraction === 'true',
        vibrate: [100, 50, 100],
    };

    return self.registration.showNotification(
        title || 'PSI Maps Pro',
        notificationOptions
    );
});

// ── Handle notification click (deep linking) ─────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const data = event.notification.data || {};
    let targetUrl = data.url || '/';

    // Build deep link URL
    if (data.projectId) {
        targetUrl = `/?project=${data.projectId}`;
    } else if (data.action) {
        targetUrl = `/?action=${data.action}`;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If app is already open, focus it and navigate
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.postMessage({
                        type: 'NOTIFICATION_CLICK',
                        url: targetUrl,
                        projectId: data.projectId,
                        action: data.action,
                    });
                    return;
                }
            }
            // Otherwise, open a new window
            return clients.openWindow(targetUrl);
        })
    );
});
