// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Background Sync Engine
// Queues offline actions in IndexedDB and replays them when connection returns.
// Integrates with the Service Worker Background Sync API.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncActionType =
    | 'favorite-add'
    | 'favorite-remove'
    | 'inquiry-send'
    | 'feedback-submit'
    | 'view-track'
    | 'custom';

export interface SyncAction {
    id: string;
    type: SyncActionType;
    payload: Record<string, any>;
    timestamp: number;
    retryCount: number;
    maxRetries: number;
    /** HTTP method and endpoint for replaying the action */
    endpoint?: string;
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DB_NAME = 'psi-maps-sync';
const DB_VERSION = 1;
const STORE_NAME = 'pending-actions';
const SYNC_TAG = 'psi-background-sync';

// ─── IndexedDB Helpers ───────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// ─── Queue Operations ────────────────────────────────────────────────────────

/**
 * Generate a unique ID for a sync action.
 */
function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Queue an action for background sync.
 * If online, executes immediately; if offline, stores in IndexedDB and
 * registers a background sync event.
 */
export async function queueSyncAction(
    type: SyncActionType,
    payload: Record<string, any>,
    options: {
        endpoint?: string;
        method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
        maxRetries?: number;
        /** Execute immediately if online (default: true) */
        immediate?: boolean;
    } = {}
): Promise<string> {
    const action: SyncAction = {
        id: generateId(),
        type,
        payload,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: options.maxRetries ?? 3,
        endpoint: options.endpoint,
        method: options.method || 'POST',
    };

    const isOnline = navigator.onLine;
    const immediate = options.immediate ?? true;

    if (isOnline && immediate) {
        // Try to execute immediately
        const success = await executeAction(action);
        if (success) {
            console.log(`[Sync] Action ${action.type} executed immediately`);
            return action.id;
        }
        // If immediate execution fails, fall through to queue
    }

    // Store in IndexedDB
    await storeAction(action);
    console.log(`[Sync] Action ${action.type} queued (offline or retry)`, action.id);

    // Register a background sync (if SW supports it)
    await registerBackgroundSync();

    return action.id;
}

/**
 * Store an action in IndexedDB.
 */
async function storeAction(action: SyncAction): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(action);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get all pending actions from IndexedDB.
 */
export async function getPendingActions(): Promise<SyncAction[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

/**
 * Get the count of pending actions.
 */
export async function getPendingCount(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

/**
 * Remove a completed action from IndexedDB.
 */
async function removeAction(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

/**
 * Clear all pending actions.
 */
export async function clearAllPending(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
    });
}

// ─── Action Execution ────────────────────────────────────────────────────────

/**
 * Execute a single sync action.
 * This is a dispatcher that routes to the appropriate handler.
 */
async function executeAction(action: SyncAction): Promise<boolean> {
    try {
        switch (action.type) {
            case 'favorite-add':
            case 'favorite-remove':
                return await executeFavoriteAction(action);

            case 'inquiry-send':
                return await executeInquiryAction(action);

            case 'feedback-submit':
                return await executeFeedbackAction(action);

            case 'view-track':
                return await executeViewTrackAction(action);

            case 'custom':
                return await executeCustomAction(action);

            default:
                console.warn(`[Sync] Unknown action type: ${action.type}`);
                return false;
        }
    } catch (err) {
        console.error(`[Sync] Action ${action.id} (${action.type}) failed:`, err);
        return false;
    }
}

/**
 * Execute a favorites sync action.
 */
async function executeFavoriteAction(action: SyncAction): Promise<boolean> {
    // Import Firebase lazily to avoid circular dependencies
    const { doc, setDoc, deleteDoc } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    const { projectId, userId } = action.payload;
    if (!projectId) return false;

    const favRef = doc(db, 'favorites', `${userId || 'anonymous'}_${projectId}`);

    if (action.type === 'favorite-add') {
        await setDoc(favRef, {
            projectId,
            userId: userId || 'anonymous',
            createdAt: new Date(action.timestamp).toISOString(),
        });
    } else {
        await deleteDoc(favRef);
    }

    console.log(`[Sync] Favorite ${action.type} synced for project: ${projectId}`);
    return true;
}

/**
 * Execute an inquiry (lead) sync action.
 */
async function executeInquiryAction(action: SyncAction): Promise<boolean> {
    const { addDoc, collection, Timestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    await addDoc(collection(db, 'inquiries'), {
        ...action.payload,
        submittedAt: Timestamp.fromMillis(action.timestamp),
        syncedFromOffline: true,
    });

    console.log('[Sync] Inquiry synced:', action.payload.projectId);
    return true;
}

/**
 * Execute a feedback sync action.
 */
async function executeFeedbackAction(action: SyncAction): Promise<boolean> {
    const { addDoc, collection, Timestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    await addDoc(collection(db, 'feedback'), {
        ...action.payload,
        submittedAt: Timestamp.fromMillis(action.timestamp),
        syncedFromOffline: true,
    });

    console.log('[Sync] Feedback synced');
    return true;
}

/**
 * Execute a view tracking action.
 */
async function executeViewTrackAction(action: SyncAction): Promise<boolean> {
    // View tracking — write to analytics collection
    const { addDoc, collection, Timestamp } = await import('firebase/firestore');
    const { db } = await import('./firebase');

    await addDoc(collection(db, 'analytics'), {
        type: 'property_view',
        ...action.payload,
        viewedAt: Timestamp.fromMillis(action.timestamp),
        syncedFromOffline: true,
    });

    return true;
}

/**
 * Execute a custom action with HTTP endpoint.
 */
async function executeCustomAction(action: SyncAction): Promise<boolean> {
    if (!action.endpoint) return false;

    const response = await fetch(action.endpoint, {
        method: action.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action.payload),
    });

    return response.ok;
}

// ─── Background Sync Registration ────────────────────────────────────────────

/**
 * Register a one-off background sync with the Service Worker.
 */
async function registerBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
        console.warn('[Sync] Background Sync not supported — will retry on next online event');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register(SYNC_TAG);
        console.log('[Sync] Background sync registered');
    } catch (err) {
        console.warn('[Sync] Background sync registration failed:', err);
    }
}

// ─── Replay Engine (called by SW or online event) ────────────────────────────

/**
 * Process all pending sync actions.
 * Called when connection is restored (online event or SW background sync).
 * Returns the number of successfully processed actions.
 */
export async function processPendingActions(): Promise<number> {
    const actions = await getPendingActions();
    if (actions.length === 0) return 0;

    console.log(`[Sync] Processing ${actions.length} pending action(s)...`);
    let successCount = 0;

    for (const action of actions) {
        const success = await executeAction(action);

        if (success) {
            await removeAction(action.id);
            successCount++;
        } else {
            // Increment retry count
            action.retryCount++;

            if (action.retryCount >= action.maxRetries) {
                console.warn(`[Sync] Action ${action.id} exceeded max retries — discarding`);
                await removeAction(action.id);
            } else {
                // Update in DB with incremented retry count
                await storeAction(action);
            }
        }
    }

    console.log(`[Sync] Processed: ${successCount}/${actions.length} succeeded`);
    return successCount;
}

// ─── Online Event Listener ───────────────────────────────────────────────────

/**
 * Initialize the sync engine.
 * Sets up an online event listener to replay queued actions.
 */
export function initSyncEngine(): void {
    // Process pending actions when connection is restored
    window.addEventListener('online', async () => {
        console.log('[Sync] Connection restored — processing pending actions');
        const count = await processPendingActions();
        if (count > 0) {
            console.log(`[Sync] ${count} action(s) synced after reconnection`);
        }
    });

    // Listen for SW messages about completed syncs
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'SYNC_COMPLETE') {
                console.log('[Sync] Background sync completed by SW');
                window.dispatchEvent(new CustomEvent('psi-sync-complete', {
                    detail: { count: event.data.count },
                }));
            }
        });
    }

    console.log('[Sync] Sync engine initialized');
}
