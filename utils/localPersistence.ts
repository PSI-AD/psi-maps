// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Local Persistence Layer
// User settings, search history, recent views, and cached search results
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Keys ────────────────────────────────────────────────────────────────────
const KEYS = {
    SETTINGS: 'psi-user-settings',
    SEARCH_HISTORY: 'psi-search-history',
    SEARCH_CACHE: 'psi-search-cache',
    RECENT_VIEWS: 'psi-recent-views',
    MAP_STYLE: 'psi-map-style',
    ONBOARDING: 'psi-onboarding-done',
    NOTIFICATION_PREF: 'psi-notification-pref',
    MAP_REGION: 'psi-map-region',          // §10 — cache last map viewport
} as const;

// ─── Offline Mode Feature Matrix (§10) ────────────────────────────────────────────────────────────
// Defines which features are available when the user is offline.
export const OFFLINE_FEATURES = {
    available: [
        'Map rendering (cached tiles)',
        'Recently viewed projects (cached)',
        'Saved favorites',
        'Search history',
        'Project cards (cached data)',
        'PWA install / home screen',
        'Background sync queue (favorites, inquiries, feedback)',
    ],
    disabled: [
        'Live Firestore data updates',
        'AI Chat Assistant',
        'New project inquiries (queued for retry)',
        'Map style changes requiring fresh tiles',
        'Street View panel',
        'Time Machine satellite imagery',
        'Push notification registration',
    ],
} as const;

// ─── 1. User Settings ───────────────────────────────────────────────────────

export interface UserSettings {
    /** Map style preference */
    mapStyle: string;
    /** Default city */
    defaultCity: string;
    /** Default amenity categories */
    amenityCategories: string[];
    /** Whether to show welcome banner */
    showWelcomeBanner: boolean;
    /** Camera movement duration (ms) */
    cameraDuration: number;
    /** Whether onboarding has been completed */
    onboardingDone: boolean;
    /** Notification preference */
    notificationsEnabled: boolean;
    /** Preferred language */
    language: string;
    /** Units preference (metric/imperial) */
    units: 'metric' | 'imperial';
}

const DEFAULT_SETTINGS: UserSettings = {
    mapStyle: 'mapbox://styles/mapbox/streets-v12',
    defaultCity: '',
    amenityCategories: [
        'schools', 'hospitals', 'retail', 'leisure', 'hotels', 'culture',
        'airports', 'ports', 'parks', 'beaches', 'hypermarkets'
    ],
    showWelcomeBanner: true,
    cameraDuration: 2000,
    onboardingDone: false,
    notificationsEnabled: false,
    language: 'en',
    units: 'metric',
};

/**
 * Get all user settings (merged with defaults).
 */
export function getUserSettings(): UserSettings {
    try {
        const raw = localStorage.getItem(KEYS.SETTINGS);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

/**
 * Update one or more user settings.
 */
export function updateUserSettings(updates: Partial<UserSettings>): UserSettings {
    const current = getUserSettings();
    const merged = { ...current, ...updates };
    try {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(merged));
    } catch { }
    return merged;
}

/**
 * Get a single setting.
 */
export function getSetting<K extends keyof UserSettings>(key: K): UserSettings[K] {
    return getUserSettings()[key];
}

/**
 * Reset settings to defaults.
 */
export function resetSettings(): void {
    try {
        localStorage.setItem(KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    } catch { }
}

// ─── 2. Search History ───────────────────────────────────────────────────────

export interface SearchEntry {
    query: string;
    timestamp: number;
    type: 'text' | 'location' | 'developer' | 'community';
    resultCount?: number;
}

/**
 * Get recent search history (max 20 entries, newest first).
 */
export function getSearchHistory(): SearchEntry[] {
    try {
        const raw = localStorage.getItem(KEYS.SEARCH_HISTORY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Add a search to history. Deduplicates and caps at 20.
 */
export function addSearchEntry(entry: Omit<SearchEntry, 'timestamp'>): void {
    try {
        const history = getSearchHistory();

        // Remove duplicates (same query + type)
        const filtered = history.filter(
            h => !(h.query.toLowerCase() === entry.query.toLowerCase() && h.type === entry.type)
        );

        // Add new entry at the beginning
        filtered.unshift({ ...entry, timestamp: Date.now() });

        // Cap at 20
        const capped = filtered.slice(0, 20);
        localStorage.setItem(KEYS.SEARCH_HISTORY, JSON.stringify(capped));
    } catch { }
}

/**
 * Clear all search history.
 */
export function clearSearchHistory(): void {
    try {
        localStorage.removeItem(KEYS.SEARCH_HISTORY);
    } catch { }
}

// ─── 3. Search Results Cache ─────────────────────────────────────────────────

interface CachedSearch {
    query: string;
    results: string[]; // Project IDs
    timestamp: number;
    filters: {
        city?: string;
        community?: string;
        propertyType?: string;
        developer?: string;
        status?: string;
    };
}

/**
 * Cache search results (project IDs) for a given query + filters.
 * Max 10 cached searches, oldest evicted first.
 */
export function cacheSearchResults(
    query: string,
    projectIds: string[],
    filters: CachedSearch['filters'] = {}
): void {
    try {
        const cacheRaw = localStorage.getItem(KEYS.SEARCH_CACHE);
        const cache: CachedSearch[] = cacheRaw ? JSON.parse(cacheRaw) : [];

        // Remove existing entry for this query + filters combo
        const key = buildSearchKey(query, filters);
        const filtered = cache.filter(c => buildSearchKey(c.query, c.filters) !== key);

        // Add new entry
        filtered.unshift({ query, results: projectIds, timestamp: Date.now(), filters });

        // Cap at 10
        localStorage.setItem(KEYS.SEARCH_CACHE, JSON.stringify(filtered.slice(0, 10)));
    } catch { }
}

/**
 * Get cached search results for a query + filters.
 * Returns null if no cached results or cache is older than 1 hour.
 */
export function getCachedSearchResults(
    query: string,
    filters: CachedSearch['filters'] = {}
): string[] | null {
    try {
        const cacheRaw = localStorage.getItem(KEYS.SEARCH_CACHE);
        if (!cacheRaw) return null;

        const cache: CachedSearch[] = JSON.parse(cacheRaw);
        const key = buildSearchKey(query, filters);
        const match = cache.find(c => buildSearchKey(c.query, c.filters) === key);

        if (!match) return null;

        // Expire after 1 hour
        if (Date.now() - match.timestamp > 60 * 60 * 1000) return null;

        return match.results;
    } catch {
        return null;
    }
}

function buildSearchKey(query: string, filters: CachedSearch['filters']): string {
    return `${query.toLowerCase().trim()}|${filters.city || ''}|${filters.community || ''}|${filters.propertyType || ''}|${filters.developer || ''}|${filters.status || ''}`;
}

// ─── 4. Recent Views (recently viewed projects) ─────────────────────────────

export interface RecentView {
    projectId: string;
    projectName: string;
    thumbnail?: string;
    timestamp: number;
}

/**
 * Get recently viewed projects (max 15, newest first).
 */
export function getRecentViews(): RecentView[] {
    try {
        const raw = localStorage.getItem(KEYS.RECENT_VIEWS);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

/**
 * Record a project view. Deduplicates (moves to front if re-viewed).
 */
export function recordRecentView(
    projectId: string,
    projectName: string,
    thumbnail?: string
): void {
    try {
        const views = getRecentViews();

        // Remove existing entry for this project
        const filtered = views.filter(v => v.projectId !== projectId);

        // Add at the beginning
        filtered.unshift({ projectId, projectName, thumbnail, timestamp: Date.now() });

        // Cap at 15
        localStorage.setItem(KEYS.RECENT_VIEWS, JSON.stringify(filtered.slice(0, 15)));
    } catch { }
}

/**
 * Clear recent views.
 */
export function clearRecentViews(): void {
    try {
        localStorage.removeItem(KEYS.RECENT_VIEWS);
    } catch { }
}

// ─── 5. Persistence Health Check ─────────────────────────────────────────────

/**
 * Check if localStorage is available and has space.
 */
export function isStorageAvailable(): boolean {
    try {
        const test = '__psi_storage_test__';
        localStorage.setItem(test, 'test');
        localStorage.removeItem(test);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get approximate storage usage in bytes.
 */
export function getStorageUsage(): number {
    let total = 0;
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('psi-')) {
                total += (localStorage.getItem(key) || '').length * 2; // UTF-16
            }
        }
    } catch { }
    return total;
}

/**
 * Clear all PSI-related storage (nuclear option).
 */
export function clearAllPersistence(): void {
    try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('psi-') || key?.startsWith('psi_')) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
        console.log(`[Storage] Cleared ${keysToDelete.length} persisted items`);
    } catch { }
}

// ─── 6. Map Region Cache (§10) ────────────────────────────────────

export interface MapRegion {
    longitude: number;
    latitude: number;
    zoom: number;
    pitch: number;
    bearing: number;
    /** ISO timestamp of when this region was saved */
    savedAt: string;
}

/**
 * Persist the current Mapbox viewport so the map can restore it
 * instantly on next app launch without waiting for remote data.
 * Call this on map `moveend` events (debounced).
 */
export function saveMapRegion(region: Omit<MapRegion, 'savedAt'>): void {
    try {
        localStorage.setItem(
            KEYS.MAP_REGION,
            JSON.stringify({ ...region, savedAt: new Date().toISOString() })
        );
    } catch { }
}

/**
 * Load the last persisted map region.
 * Returns null if no region has been saved yet or it is >7 days old.
 */
export function loadMapRegion(): MapRegion | null {
    try {
        const raw = localStorage.getItem(KEYS.MAP_REGION);
        if (!raw) return null;
        const region: MapRegion = JSON.parse(raw);
        // Expire stale viewports after 7 days
        const age = Date.now() - new Date(region.savedAt).getTime();
        if (age > 7 * 24 * 60 * 60 * 1000) {
            localStorage.removeItem(KEYS.MAP_REGION);
            return null;
        }
        return region;
    } catch {
        return null;
    }
}
