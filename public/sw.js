// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Service Worker
// Advanced caching strategies, push notifications, background sync, offline
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'psi-maps-v3';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const FONT_CACHE = `fonts-${CACHE_VERSION}`;

// ── IndexedDB constants (shared with backgroundSync.ts) ──────────────────────
const SYNC_DB_NAME = 'psi-maps-sync';
const SYNC_DB_VERSION = 1;
const SYNC_STORE_NAME = 'pending-actions';
const SYNC_TAG = 'psi-background-sync';

// ── App Shell: critical resources cached immediately on install ───────────────
const APP_SHELL = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.svg',
    '/psi-logo.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/apple-touch-icon.png',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function isNavigationRequest(request) {
    return request.mode === 'navigate' ||
        (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
    return /\.(js|css|woff2?|ttf|eot|svg)(\?.*)?$/i.test(url.pathname);
}

function isImageRequest(url) {
    return /\.(png|jpg|jpeg|gif|webp|avif|ico)(\?.*)?$/i.test(url.pathname);
}

function isFontRequest(url) {
    return url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com' ||
        /\.(woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname);
}

function isAPIRequest(url) {
    return url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('api.mapbox.com') ||
        url.hostname.includes('tiles.mapbox.com') ||
        url.hostname.includes('events.mapbox.com');
}

function isMapTileRequest(url) {
    return url.hostname.includes('tiles.mapbox.com') ||
        url.hostname.includes('api.mapbox.com') && url.pathname.includes('/styles/');
}

// ── INSTALL: Pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log('[SW] Installing PSI Maps Pro Service Worker v2');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Pre-caching app shell');
                return cache.addAll(APP_SHELL);
            })
            .then(() => self.skipWaiting()) // Activate immediately
    );
});

// ── ACTIVATE: Clean old caches ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating PSI Maps Pro Service Worker v2');
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => {
                            // Delete any cache that doesn't match current version
                            return key !== STATIC_CACHE &&
                                key !== DYNAMIC_CACHE &&
                                key !== IMAGE_CACHE &&
                                key !== FONT_CACHE;
                        })
                        .map((key) => {
                            console.log('[SW] Removing old cache:', key);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => self.clients.claim()) // Take control of all pages immediately
    );
});

// ── FETCH: Advanced routing with multiple caching strategies ─────────────────
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests and chrome-extension URLs
    if (event.request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;
    if (url.protocol === 'chrome:') return;

    // ── Strategy 1: Stale-While-Revalidate for Map Tiles ────────────────────
    if (isMapTileRequest(url)) {
        event.respondWith(staleWhileRevalidate(event.request, IMAGE_CACHE, 500));
        return;
    }

    // ── Strategy 2: Cache-First for Fonts (rarely change) ───────────────────
    if (isFontRequest(url)) {
        event.respondWith(cacheFirst(event.request, FONT_CACHE));
        return;
    }

    // ── Strategy 3: Cache-First for Images ──────────────────────────────────
    if (isImageRequest(url)) {
        event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
        return;
    }

    // ── Strategy 4: Network-First for API/Dynamic data ──────────────────────
    if (isAPIRequest(url)) {
        event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
        return;
    }

    // ── Strategy 5: Network-First for JS/CSS (hashed filenames change every deploy) ─
    if (isStaticAsset(url)) {
        event.respondWith(networkFirst(event.request, STATIC_CACHE));
        return;
    }

    // ── Strategy 6: Network-First for navigation (HTML pages) ──────────────
    if (isNavigationRequest(event.request)) {
        event.respondWith(networkFirst(event.request, STATIC_CACHE));
        return;
    }

    // ── Default: Network with cache fallback ────────────────────────────────
    event.respondWith(networkFirst(event.request, DYNAMIC_CACHE));
});

// ═══════════════════════════════════════════════════════════════════════════════
// Caching Strategy Implementations
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache-First: Serve from cache, fallback to network (then cache the response).
 * Best for: static assets, images, fonts that rarely change.
 */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // Return offline fallback for images
        if (isImageRequest(new URL(request.url))) {
            return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect fill="#1e293b" width="200" height="200"/><text fill="#64748b" font-family="system-ui" font-size="14" x="50%" y="50%" text-anchor="middle" dy=".3em">Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
}

/**
 * Network-First: Try network, fallback to cache.
 * Best for: HTML pages, API data that should be fresh.
 */
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        // Navigation fallback: serve cached index.html for SPA routing
        if (isNavigationRequest(request)) {
            const fallback = await caches.match('/index.html');
            if (fallback) return fallback;
        }

        return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PSI Maps — Offline</title><style>*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif}.container{text-align:center;padding:2rem}.icon{font-size:4rem;margin-bottom:1.5rem}h1{font-size:1.5rem;margin-bottom:.75rem;color:#f8fafc}p{color:#94a3b8;max-width:300px;line-height:1.6}button{margin-top:1.5rem;padding:.75rem 2rem;border:none;border-radius:8px;background:#2563eb;color:#fff;font-size:1rem;cursor:pointer}button:hover{background:#1d4ed8}</style></head><body><div class="container"><div class="icon">📍</div><h1>You\'re Offline</h1><p>PSI Maps Pro requires an internet connection for live property data and map tiles.</p><button onclick="location.reload()">Try Again</button></div></body></html>',
            {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            }
        );
    }
}

/**
 * Stale-While-Revalidate: Serve from cache immediately, update cache in background.
 * Best for: map tiles and resources that should be fast but eventually consistent.
 */
async function staleWhileRevalidate(request, cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cached);

    return cached || fetchPromise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS — Full handling with deep linking
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
    if (!event.data) return;

    let data;
    try {
        data = event.data.json();
    } catch {
        // Handle plain text push
        data = { title: 'PSI Maps Pro', body: event.data.text() };
    }

    const options = {
        body: data.body || 'New update available',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/icon-72x72.png',
        image: data.image || undefined,
        tag: data.tag || `psi-push-${Date.now()}`,
        data: {
            url: data.url || '/',
            action: data.action || null,
            projectId: data.projectId || null,
            ...data.data,
        },
        actions: data.actions || [
            { action: 'open', title: 'Open App', icon: '/icons/icon-72x72.png' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
        vibrate: data.silent ? undefined : [100, 50, 100],
        silent: data.silent || false,
        requireInteraction: data.requireInteraction || false,
        renotify: !!data.tag, // Re-notify if same tag
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'PSI Maps Pro', options)
    );
});

// ── Notification Click: Deep Linking ─────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data || {};
    let targetUrl = notifData.url || '/';

    // Handle action buttons
    if (event.action === 'dismiss') return;

    if (event.action === 'view' && notifData.projectId) {
        targetUrl = `/?project=${notifData.projectId}`;
    }

    // Deep link: focus existing window/tab or open a new one
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Try to find an existing app window and navigate to the target URL
                for (const client of clientList) {
                    const clientUrl = new URL(client.url);
                    if (clientUrl.origin === self.location.origin) {
                        // Post a message to the app to navigate to the deep link
                        client.postMessage({
                            type: 'NOTIFICATION_CLICK',
                            url: targetUrl,
                            projectId: notifData.projectId,
                            action: notifData.action,
                        });
                        return client.focus();
                    }
                }
                // No existing window — open a new one
                return self.clients.openWindow(targetUrl);
            })
    );
});

// ── Notification Close: Track dismissals ─────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
    const notifData = event.notification.data || {};
    console.log('[SW] Notification dismissed:', event.notification.tag, notifData);
    // Future: track notification dismissal analytics
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKGROUND SYNC — Process queued offline actions
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('sync', (event) => {
    if (event.tag === SYNC_TAG) {
        console.log('[SW] Background sync triggered:', SYNC_TAG);
        event.waitUntil(processQueuedActions());
    }
});

/**
 * Open the IndexedDB from the service worker context.
 */
function openSyncDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SYNC_STORE_NAME)) {
                const store = db.createObjectStore(SYNC_STORE_NAME, { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

/**
 * Read all pending actions from IndexedDB.
 */
async function readPendingActions() {
    const db = await openSyncDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
        const store = tx.objectStore(SYNC_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

/**
 * Remove a single action from IndexedDB by ID.
 */
async function removePendingAction(db, id) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SYNC_STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update an action in IndexedDB (for retry count increment).
 */
async function updatePendingAction(db, action) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE_NAME, 'readwrite');
        const store = tx.objectStore(SYNC_STORE_NAME);
        const request = store.put(action);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Process all queued actions from IndexedDB.
 * Tries to execute each one; on failure, increments retry count.
 */
async function processQueuedActions() {
    let db;
    try {
        db = await openSyncDB();
    } catch (err) {
        console.error('[SW] Failed to open sync DB:', err);
        return;
    }

    const actions = await new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_STORE_NAME, 'readonly');
        const store = tx.objectStore(SYNC_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });

    if (actions.length === 0) {
        db.close();
        return;
    }

    console.log(`[SW] Processing ${actions.length} queued action(s)...`);
    let successCount = 0;

    for (const action of actions) {
        let success = false;

        try {
            // For custom HTTP actions, try to fetch the endpoint
            if (action.endpoint) {
                const response = await fetch(action.endpoint, {
                    method: action.method || 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(action.payload),
                });
                success = response.ok;
            } else {
                // Non-HTTP actions will be processed by the main thread
                // Remove them from the queue and let the app handle them
                success = true;
            }
        } catch (err) {
            console.error(`[SW] Action ${action.id} failed:`, err);
        }

        if (success) {
            await removePendingAction(db, action.id);
            successCount++;
        } else {
            action.retryCount = (action.retryCount || 0) + 1;
            if (action.retryCount >= (action.maxRetries || 3)) {
                console.warn(`[SW] Action ${action.id} exceeded max retries — discarding`);
                await removePendingAction(db, action.id);
            } else {
                await updatePendingAction(db, action);
            }
        }
    }

    db.close();

    console.log(`[SW] Background sync complete: ${successCount}/${actions.length}`);

    // Notify all clients of sync completion
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
        client.postMessage({
            type: 'SYNC_COMPLETE',
            count: successCount,
            total: actions.length,
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERIODIC BACKGROUND SYNC (if supported)
// Keeps data fresh even when the user hasn't opened the app
// ═══════════════════════════════════════════════════════════════════════════════

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'psi-content-sync') {
        console.log('[SW] Periodic sync triggered');
        event.waitUntil(
            // Pre-fetch fresh data for offline use
            caches.open(DYNAMIC_CACHE).then(async (cache) => {
                try {
                    await cache.add('/');
                    console.log('[SW] Periodic sync: app shell refreshed');
                } catch {
                    console.warn('[SW] Periodic sync fetch failed');
                }
            })
        );
    }
});

// ── Message handler for manual cache control from the app ────────────────────
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data?.type === 'CACHE_URLS') {
        const urls = event.data.urls || [];
        event.waitUntil(
            caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(urls))
        );
    }
    if (event.data?.type === 'CLEAR_CACHES') {
        event.waitUntil(
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        );
    }
    if (event.data?.type === 'PROCESS_SYNC') {
        event.waitUntil(processQueuedActions());
    }
});

console.log('[SW] PSI Maps Pro Service Worker v2 loaded');
