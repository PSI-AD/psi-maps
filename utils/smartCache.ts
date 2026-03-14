// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Smart Local Cache Engine
// Unified IndexedDB caching with stale-while-revalidate strategy
// Caches: projects, landmarks, searches, favorites, recently viewed, map state
// Goal: instant app feel even on slow/offline networks
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CacheEntry<T = any> {
    key: string;
    data: T;
    timestamp: number;
    /** Time-to-live in ms. Null = never expires, but still revalidates in background */
    ttl: number | null;
    /** Cache version — bump to invalidate all entries of a store */
    version: number;
}

export interface CacheMeta {
    key: string;
    timestamp: number;
    size: number;
    version: number;
}

export interface CacheStats {
    projectCount: number;
    landmarkCount: number;
    searchCount: number;
    recentlyViewedCount: number;
    totalSize: string;
    lastSync: number | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const DB_NAME = 'psi-smart-cache';
const DB_VERSION = 2;
const CACHE_VERSION = 1;

/** Store definitions with their default TTLs */
const STORES = {
    projects: { name: 'projects', keyPath: 'key', ttl: 30 * 60 * 1000 },  // 30 min
    landmarks: { name: 'landmarks', keyPath: 'key', ttl: 60 * 60 * 1000 },  // 1 hour
    searches: { name: 'searches', keyPath: 'key', ttl: 24 * 60 * 60 * 1000 },  // 24 hours
    recentlyViewed: { name: 'recentlyViewed', keyPath: 'key', ttl: 7 * 24 * 60 * 60 * 1000 },  // 7 days
    mapState: { name: 'mapState', keyPath: 'key', ttl: null },  // never expires
    favorites: { name: 'favorites', keyPath: 'key', ttl: null },  // never expires
    meta: { name: 'meta', keyPath: 'key', ttl: null },  // internal metadata
} as const;

type StoreName = keyof typeof STORES;

// Max items per store (prevents unbounded growth)
const MAX_ITEMS: Record<StoreName, number> = {
    projects: 1,        // Single bulk entry
    landmarks: 1,       // Single bulk entry
    searches: 50,       // Last 50 search queries
    recentlyViewed: 30, // Last 30 viewed projects
    mapState: 5,        // A few map positions
    favorites: 1,       // Single entry (array of IDs)
    meta: 10,           // Internal
};

// ─── IndexedDB Connection Pool ───────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
    if (dbInstance && dbInstance.name) {
        return Promise.resolve(dbInstance);
    }

    if (dbPromise) return dbPromise;

    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };

            request.onsuccess = () => {
                dbInstance = request.result;

                // Handle unexpected close (e.g. quota exceeded)
                dbInstance.onclose = () => {
                    dbInstance = null;
                    dbPromise = null;
                };

                resolve(dbInstance);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                for (const store of Object.values(STORES)) {
                    if (!db.objectStoreNames.contains(store.name)) {
                        const objStore = db.createObjectStore(store.name, { keyPath: store.keyPath });
                        objStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                }
            };
        } catch (err) {
            dbPromise = null;
            reject(err);
        }
    });

    return dbPromise;
}

// ─── Core Cache Operations ───────────────────────────────────────────────────

/**
 * Write data to a cache store.
 * Wraps data in a CacheEntry with timestamp, TTL, and version.
 */
async function cacheSet<T>(
    storeName: StoreName,
    key: string,
    data: T,
    ttl?: number | null
): Promise<void> {
    try {
        const db = await getDB();
        const entry: CacheEntry<T> = {
            key,
            data,
            timestamp: Date.now(),
            ttl: ttl !== undefined ? ttl : STORES[storeName].ttl,
            version: CACHE_VERSION,
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (err) {
        console.warn(`[Cache] Write failed for ${storeName}/${key}:`, err);
    }
}

/**
 * Read data from a cache store.
 * Returns { data, isStale } — caller decides whether to revalidate.
 */
async function cacheGet<T>(
    storeName: StoreName,
    key: string
): Promise<{ data: T | null; isStale: boolean; age: number }> {
    try {
        const db = await getDB();

        return new Promise((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => {
                const entry = request.result as CacheEntry<T> | undefined;
                if (!entry || entry.version !== CACHE_VERSION) {
                    resolve({ data: null, isStale: true, age: Infinity });
                    return;
                }

                const age = Date.now() - entry.timestamp;
                const isStale = entry.ttl !== null && age > entry.ttl;

                resolve({ data: entry.data, isStale, age });
            };

            request.onerror = () => resolve({ data: null, isStale: true, age: Infinity });
        });
    } catch {
        return { data: null, isStale: true, age: Infinity };
    }
}

/**
 * Delete a specific entry from a store.
 */
async function cacheDelete(storeName: StoreName, key: string): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { }
}

/**
 * Clear all entries in a store.
 */
async function cacheClear(storeName: StoreName): Promise<void> {
    try {
        const db = await getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch { }
}

/**
 * Evict oldest entries when a store exceeds its max items.
 */
async function evictOldest(storeName: StoreName): Promise<void> {
    try {
        const maxItems = MAX_ITEMS[storeName];
        const db = await getDB();

        const count = await new Promise<number>((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const req = tx.objectStore(storeName).count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(0);
        });

        if (count <= maxItems) return;

        // Get all entries sorted by timestamp, delete oldest
        const entries = await new Promise<CacheEntry[]>((resolve) => {
            const tx = db.transaction(storeName, 'readonly');
            const index = tx.objectStore(storeName).index('timestamp');
            const req = index.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
        });

        entries.sort((a, b) => a.timestamp - b.timestamp);
        const toDelete = entries.slice(0, count - maxItems);

        if (toDelete.length > 0) {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            for (const entry of toDelete) {
                store.delete(entry.key);
            }
            await new Promise<void>((resolve) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            });
        }
    } catch { }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API — Domain-specific cache operations
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Project Data Cache ───────────────────────────────────────────────────

const PROJECTS_KEY = 'all-projects';
const LANDMARKS_KEY = 'all-landmarks';

/**
 * Cache all projects for instant next-load.
 * Called after Firestore snapshot resolves.
 */
export async function cacheProjectData(projects: any[]): Promise<void> {
    if (projects.length === 0) return;
    await cacheSet('projects', PROJECTS_KEY, projects);
    await updateSyncTimestamp('projects');
    console.log(`[Cache] 💾 ${projects.length} projects cached`);
}

/**
 * Load cached projects instantly.
 * Returns { projects, isStale } — use stale data while revalidating from Firestore.
 */
export async function loadCachedProjectData(): Promise<{
    projects: any[];
    isStale: boolean;
    age: number;
}> {
    const result = await cacheGet<any[]>('projects', PROJECTS_KEY);
    return {
        projects: result.data || [],
        isStale: result.isStale,
        age: result.age,
    };
}

/**
 * Cache landmark data.
 */
export async function cacheLandmarkData(landmarks: any[]): Promise<void> {
    if (landmarks.length === 0) return;
    await cacheSet('landmarks', LANDMARKS_KEY, landmarks);
    await updateSyncTimestamp('landmarks');
    console.log(`[Cache] 💾 ${landmarks.length} landmarks cached`);
}

/**
 * Load cached landmarks.
 */
export async function loadCachedLandmarkData(): Promise<{
    landmarks: any[];
    isStale: boolean;
}> {
    const result = await cacheGet<any[]>('landmarks', LANDMARKS_KEY);
    return { landmarks: result.data || [], isStale: result.isStale };
}

// ─── 2. Search Results Cache ─────────────────────────────────────────────────

export interface CachedSearch {
    query: string;
    resultIds: string[];
    resultCount: number;
    filters: {
        city?: string;
        community?: string;
        developer?: string;
        propertyType?: string;
        status?: string;
    };
}

/**
 * Cache a search query + its result project IDs.
 * Allows instant replay of previous searches offline.
 */
export async function cacheSearchResult(search: CachedSearch): Promise<void> {
    const key = normalizeSearchKey(search.query, search.filters);
    await cacheSet('searches', key, search);
    await evictOldest('searches');
}

/**
 * Look up a cached search result.
 */
export async function getCachedSearch(
    query: string,
    filters: CachedSearch['filters'] = {}
): Promise<CachedSearch | null> {
    const key = normalizeSearchKey(query, filters);
    const result = await cacheGet<CachedSearch>('searches', key);
    return result.data;
}

/**
 * Get all cached search queries (for search history dropdown).
 */
export async function getSearchHistory(): Promise<CachedSearch[]> {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction('searches', 'readonly');
            const index = tx.objectStore('searches').index('timestamp');
            const req = index.getAll();
            req.onsuccess = () => {
                const entries = (req.result || []) as CacheEntry<CachedSearch>[];
                // Sort newest first and return just the search data
                entries.sort((a, b) => b.timestamp - a.timestamp);
                resolve(entries.map(e => e.data));
            };
            req.onerror = () => resolve([]);
        });
    } catch {
        return [];
    }
}

/**
 * Clear search history.
 */
export async function clearSearchHistory(): Promise<void> {
    await cacheClear('searches');
}

function normalizeSearchKey(query: string, filters: CachedSearch['filters']): string {
    const q = query.toLowerCase().trim();
    const f = [filters.city, filters.community, filters.developer, filters.propertyType, filters.status]
        .filter(Boolean)
        .map(s => s!.toLowerCase().trim())
        .join('|');
    return `search:${q}:${f}`;
}

// ─── 3. Recently Viewed Projects ─────────────────────────────────────────────

export interface RecentlyViewedEntry {
    projectId: string;
    projectName: string;
    thumbnailUrl: string;
    community: string;
    city: string;
    viewedAt: number;
}

/**
 * Record a project view. Maintains the last 30 unique views.
 */
export async function recordProjectView(project: {
    id: string;
    name: string;
    thumbnailUrl?: string;
    community?: string;
    city?: string;
}): Promise<void> {
    const entry: RecentlyViewedEntry = {
        projectId: project.id,
        projectName: project.name,
        thumbnailUrl: project.thumbnailUrl || '',
        community: project.community || '',
        city: project.city || '',
        viewedAt: Date.now(),
    };

    // Use project ID as key so re-views update the timestamp
    await cacheSet('recentlyViewed', `recent:${project.id}`, entry, null);
    await evictOldest('recentlyViewed');
}

/**
 * Get recently viewed projects, sorted by most recent.
 */
export async function getRecentlyViewed(): Promise<RecentlyViewedEntry[]> {
    try {
        const db = await getDB();
        return new Promise((resolve) => {
            const tx = db.transaction('recentlyViewed', 'readonly');
            const req = tx.objectStore('recentlyViewed').getAll();
            req.onsuccess = () => {
                const entries = (req.result || []) as CacheEntry<RecentlyViewedEntry>[];
                entries.sort((a, b) => b.data.viewedAt - a.data.viewedAt);
                resolve(entries.map(e => e.data));
            };
            req.onerror = () => resolve([]);
        });
    } catch {
        return [];
    }
}

/**
 * Clear recently viewed history.
 */
export async function clearRecentlyViewed(): Promise<void> {
    await cacheClear('recentlyViewed');
}

// ─── 4. Favorites Cache (IndexedDB mirror of localStorage) ───────────────────

const FAVORITES_CACHE_KEY = 'user-favorites';
const COMPARE_CACHE_KEY = 'user-compare';

/**
 * Cache favorite IDs to IndexedDB (backup of localStorage).
 * Called whenever favorites change.
 */
export async function cacheFavorites(ids: string[]): Promise<void> {
    await cacheSet('favorites', FAVORITES_CACHE_KEY, ids, null);
}

/**
 * Load cached favorites from IndexedDB.
 * Fallback when localStorage is cleared or unavailable.
 */
export async function loadCachedFavorites(): Promise<string[]> {
    const result = await cacheGet<string[]>('favorites', FAVORITES_CACHE_KEY);
    return result.data || [];
}

/**
 * Cache compare IDs to IndexedDB.
 */
export async function cacheCompareIds(ids: string[]): Promise<void> {
    await cacheSet('favorites', COMPARE_CACHE_KEY, ids, null);
}

/**
 * Load cached compare IDs.
 */
export async function loadCachedCompareIds(): Promise<string[]> {
    const result = await cacheGet<string[]>('favorites', COMPARE_CACHE_KEY);
    return result.data || [];
}

// ─── 5. Map State Cache ──────────────────────────────────────────────────────

export interface MapViewState {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
    mapStyle: string;
}

/**
 * Cache the current map viewport for instant restore.
 */
export async function cacheMapState(state: MapViewState): Promise<void> {
    await cacheSet('mapState', 'last-viewport', state, null);
}

/**
 * Load cached map viewport.
 */
export async function loadCachedMapState(): Promise<MapViewState | null> {
    const result = await cacheGet<MapViewState>('mapState', 'last-viewport');
    return result.data;
}

// ─── 6. Stale-While-Revalidate Pattern ───────────────────────────────────────

interface SWROptions<T> {
    /** Cache store to use */
    store: StoreName;
    /** Cache key */
    key: string;
    /** Async function that fetches fresh data */
    fetcher: () => Promise<T>;
    /** Called with cached data (possibly stale) for instant render */
    onCachedData?: (data: T) => void;
    /** Called when fresh data arrives from the fetcher */
    onFreshData?: (data: T) => void;
    /** Custom TTL override */
    ttl?: number | null;
}

/**
 * Stale-While-Revalidate: return cached data instantly, then fetch fresh
 * data in the background and update the cache + call onFreshData.
 *
 * Usage:
 * ```ts
 * const data = await swr({
 *   store: 'projects',
 *   key: 'all',
 *   fetcher: () => fetchFromFirestore(),
 *   onCachedData: (projects) => setProjects(projects),
 *   onFreshData: (projects) => setProjects(projects),
 * });
 * ```
 */
export async function swr<T>(options: SWROptions<T>): Promise<T | null> {
    const { store, key, fetcher, onCachedData, onFreshData, ttl } = options;

    // Step 1: Serve from cache (instant)
    const cached = await cacheGet<T>(store, key);
    if (cached.data !== null) {
        onCachedData?.(cached.data);
        console.log(`[Cache] SWR hit for ${store}/${key} — age: ${formatAge(cached.age)}, stale: ${cached.isStale}`);
    }

    // Step 2: Revalidate in background (if stale or no cached data)
    if (cached.isStale || cached.data === null) {
        try {
            const fresh = await fetcher();
            await cacheSet(store, key, fresh, ttl);
            onFreshData?.(fresh);
            return fresh;
        } catch (err) {
            console.warn(`[Cache] SWR revalidation failed for ${store}/${key}:`, err);
            // Return stale data if available
            return cached.data;
        }
    }

    return cached.data;
}

// ─── 7. Background Sync Timestamp ────────────────────────────────────────────

async function updateSyncTimestamp(label: string): Promise<void> {
    await cacheSet('meta', `sync:${label}`, { timestamp: Date.now(), label }, null);
}

async function getLastSyncTime(label: string): Promise<number | null> {
    const result = await cacheGet<{ timestamp: number }>('meta', `sync:${label}`);
    return result.data?.timestamp ?? null;
}

// ─── 8. Cache Stats & Maintenance ────────────────────────────────────────────

/**
 * Get cache statistics for debugging / admin panel.
 */
export async function getCacheStats(): Promise<CacheStats> {
    try {
        const db = await getDB();

        const countStore = (storeName: string): Promise<number> => {
            return new Promise((resolve) => {
                const tx = db.transaction(storeName, 'readonly');
                const req = tx.objectStore(storeName).count();
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(0);
            });
        };

        const [projectCount, landmarkCount, searchCount, recentlyViewedCount] = await Promise.all([
            countStore('projects'),
            countStore('landmarks'),
            countStore('searches'),
            countStore('recentlyViewed'),
        ]);

        const lastSync = await getLastSyncTime('projects');

        // Estimate storage usage
        let totalSize = '—';
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(1);
            const quotaMB = ((estimate.quota || 0) / (1024 * 1024)).toFixed(0);
            totalSize = `${usedMB} MB / ${quotaMB} MB`;
        }

        return { projectCount, landmarkCount, searchCount, recentlyViewedCount, totalSize, lastSync };
    } catch {
        return { projectCount: 0, landmarkCount: 0, searchCount: 0, recentlyViewedCount: 0, totalSize: '—', lastSync: null };
    }
}

/**
 * Purge all caches. Use with caution — clears everything.
 */
export async function purgeAllCaches(): Promise<void> {
    for (const storeName of Object.keys(STORES) as StoreName[]) {
        await cacheClear(storeName);
    }
    console.log('[Cache] All caches purged');
}

/**
 * Prune expired entries from all stores.
 * Called periodically (e.g. on app startup) to keep DB lean.
 */
export async function pruneExpiredEntries(): Promise<number> {
    let pruned = 0;

    try {
        const db = await getDB();

        for (const [name, config] of Object.entries(STORES)) {
            if (!config.ttl) continue; // Skip stores with no TTL

            const entries = await new Promise<CacheEntry[]>((resolve) => {
                const tx = db.transaction(name, 'readonly');
                const req = tx.objectStore(name).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            });

            const now = Date.now();
            const expired = entries.filter(e => {
                const entryTtl = e.ttl ?? config.ttl;
                return entryTtl !== null && (now - e.timestamp) > entryTtl * 2; // 2× TTL = hard expiry
            });

            if (expired.length > 0) {
                const tx = db.transaction(name, 'readwrite');
                const store = tx.objectStore(name);
                for (const e of expired) {
                    store.delete(e.key);
                }
                await new Promise<void>((resolve) => {
                    tx.oncomplete = () => resolve();
                    tx.onerror = () => resolve();
                });
                pruned += expired.length;
            }
        }

        if (pruned > 0) {
            console.log(`[Cache] 🧹 Pruned ${pruned} expired entries`);
        }
    } catch { }

    return pruned;
}

// ─── 9. Cache Initialization ─────────────────────────────────────────────────

let isInitialized = false;

/**
 * Initialize the smart cache engine.
 * Call once at app startup. Prunes expired entries and logs stats.
 */
export async function initSmartCache(): Promise<void> {
    if (isInitialized) return;
    isInitialized = true;

    try {
        // Ensure DB is open
        await getDB();
        console.log('[Cache] Smart cache initialized');

        // Prune in idle time
        const schedule = typeof requestIdleCallback !== 'undefined'
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 1000);

        schedule(async () => {
            await pruneExpiredEntries();
            const stats = await getCacheStats();
            console.log('[Cache] Stats:', stats);
        });
    } catch (err) {
        console.warn('[Cache] Initialization failed — running without cache:', err);
    }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatAge(ms: number): string {
    if (ms === Infinity) return 'miss';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
}
