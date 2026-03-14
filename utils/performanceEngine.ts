// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Performance Engine
// State persistence, intelligent prefetching, image preloading, RAF scheduler
// Goal: every screen opens under 200ms
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. State Persistence (sessionStorage + localStorage) ────────────────────

const STATE_KEY = 'psi-maps-state';
const SESSION_KEY = 'psi-maps-session';

export interface PersistedState {
    selectedProjectId: string | null;
    selectedCity: string;
    selectedCommunity: string;
    propertyType: string;
    developerFilter: string;
    statusFilter: string;
    viewState: {
        longitude: number;
        latitude: number;
        zoom: number;
        pitch: number;
        bearing: number;
    };
    mapStyle: string;
    isAnalysisOpen: boolean;
    lastVisit: number;
}

/**
 * Save current app state for instant restore on next open.
 * Uses sessionStorage for tab-lifetime state, localStorage for cross-session.
 */
export function saveAppState(state: Partial<PersistedState>): void {
    try {
        const existing = loadAppState();
        const merged = { ...existing, ...state, lastVisit: Date.now() };
        const serialized = JSON.stringify(merged);

        sessionStorage.setItem(SESSION_KEY, serialized);
        localStorage.setItem(STATE_KEY, serialized);
    } catch {
        // Storage full or blocked — silently fail
    }
}

/**
 * Load persisted app state. Session state takes priority over localStorage.
 * Returns null if no state is saved or state is >24h old.
 */
export function loadAppState(): PersistedState | null {
    try {
        const session = sessionStorage.getItem(SESSION_KEY);
        const local = localStorage.getItem(STATE_KEY);
        const raw = session || local;
        if (!raw) return null;

        const state: PersistedState = JSON.parse(raw);

        // Expire after 24 hours for localStorage
        if (!session && state.lastVisit && Date.now() - state.lastVisit > 24 * 60 * 60 * 1000) {
            localStorage.removeItem(STATE_KEY);
            return null;
        }

        return state;
    } catch {
        return null;
    }
}

/**
 * Clear all persisted state.
 */
export function clearAppState(): void {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(STATE_KEY);
    } catch { }
}

// ─── 2. Data Cache (IndexedDB for project data) ─────────────────────────────

const DATA_CACHE_DB = 'psi-data-cache';
const DATA_CACHE_VERSION = 1;
const PROJECT_STORE = 'projects';
const LANDMARK_STORE = 'landmarks';

function openDataCache(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DATA_CACHE_DB, DATA_CACHE_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(PROJECT_STORE)) {
                db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(LANDMARK_STORE)) {
                db.createObjectStore(LANDMARK_STORE, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Cache project data for instant display on next load.
 */
export async function cacheProjects(projects: any[]): Promise<void> {
    if (projects.length === 0) return;

    try {
        const db = await openDataCache();
        const tx = db.transaction(PROJECT_STORE, 'readwrite');
        const store = tx.objectStore(PROJECT_STORE);

        // Clear old data and write fresh
        store.clear();
        for (const p of projects) {
            store.put(p);
        }

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch {
        // Silently fail — Firestore remains source of truth
    }
}

/**
 * Load cached project data for instant render.
 */
export async function loadCachedProjects(): Promise<any[]> {
    try {
        const db = await openDataCache();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(PROJECT_STORE, 'readonly');
            const store = tx.objectStore(PROJECT_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                db.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db.close();
                resolve([]);
            };
        });
    } catch {
        return [];
    }
}

/**
 * Cache landmark data.
 */
export async function cacheLandmarks(landmarks: any[]): Promise<void> {
    if (landmarks.length === 0) return;

    try {
        const db = await openDataCache();
        const tx = db.transaction(LANDMARK_STORE, 'readwrite');
        const store = tx.objectStore(LANDMARK_STORE);

        store.clear();
        for (const l of landmarks) {
            store.put(l);
        }

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => { db.close(); reject(tx.error); };
        });
    } catch { }
}

/**
 * Load cached landmarks.
 */
export async function loadCachedLandmarks(): Promise<any[]> {
    try {
        const db = await openDataCache();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(LANDMARK_STORE, 'readonly');
            const store = tx.objectStore(LANDMARK_STORE);
            const request = store.getAll();

            request.onsuccess = () => {
                db.close();
                resolve(request.result || []);
            };
            request.onerror = () => {
                db.close();
                resolve([]);
            };
        });
    } catch {
        return [];
    }
}

// ─── 3. Image Prefetching ────────────────────────────────────────────────────

const prefetchedImages = new Set<string>();

/**
 * Prefetch images in the background using Idle callback.
 * Only prefetches images not already in the set.
 */
export function prefetchImages(urls: string[]): void {
    const newUrls = urls.filter(url => url && !prefetchedImages.has(url));
    if (newUrls.length === 0) return;

    const scheduleLoad = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 50);

    scheduleLoad(() => {
        for (const url of newUrls) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.as = 'image';
            link.href = url;
            document.head.appendChild(link);
            prefetchedImages.add(url);
        }
    });
}

/**
 * Eagerly preload the first N project thumbnails (critical above-the-fold).
 */
export function preloadCriticalImages(urls: string[], count = 6): void {
    const critical = urls.slice(0, count).filter(Boolean);
    for (const url of critical) {
        if (prefetchedImages.has(url)) continue;
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        prefetchedImages.add(url);
    }
}

// ─── 4. RAF-based Smooth Scheduler ───────────────────────────────────────────

type TaskPriority = 'high' | 'normal' | 'idle';

interface ScheduledTask {
    fn: () => void;
    priority: TaskPriority;
}

const taskQueue: ScheduledTask[] = [];
let rafId: number | null = null;

/**
 * Schedule a function to run on the next animation frame.
 * High-priority tasks run first; idle tasks use requestIdleCallback.
 */
export function scheduleTask(fn: () => void, priority: TaskPriority = 'normal'): void {
    if (priority === 'idle') {
        const schedule = typeof requestIdleCallback !== 'undefined'
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 100);
        schedule(fn);
        return;
    }

    taskQueue.push({ fn, priority });

    if (rafId === null) {
        rafId = requestAnimationFrame(flushTasks);
    }
}

function flushTasks(): void {
    rafId = null;

    // Sort: high priority first
    taskQueue.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (a.priority !== 'high' && b.priority === 'high') return 1;
        return 0;
    });

    // Process all tasks in this frame
    const tasks = taskQueue.splice(0);
    for (const task of tasks) {
        try {
            task.fn();
        } catch (err) {
            console.error('[Perf] Task error:', err);
        }
    }
}

// ─── 5. Layout Thrash Prevention ─────────────────────────────────────────────

/**
 * Batch DOM reads before DOM writes to avoid forced reflows.
 * Usage: batchDOMUpdate(() => { /* reads */ /* }, () => { */ /* writes */ /* });
*/
export function batchDOMUpdate(
    readPhase: () => void,
    writePhase: () => void
): void {
    // Read phase: execute synchronously (cached by browser)
    readPhase();

    // Write phase: defer to next rAF to avoid layout thrash
    requestAnimationFrame(writePhase);
}

/**
 * Force GPU compositing for an element (avoids paint/layout).
 */
export function promoteToGPU(element: HTMLElement): void {
    element.style.willChange = 'transform';
    element.style.transform = 'translate3d(0, 0, 0)';
    (element.style as any).backfaceVisibility = 'hidden';
}

/**
 * Remove GPU promotion (free VRAM after animation completes).
 */
export function demoteFromGPU(element: HTMLElement): void {
    element.style.willChange = 'auto';
    element.style.transform = '';
    (element.style as any).backfaceVisibility = '';
}

// ─── 6. Component Prefetching ────────────────────────────────────────────────

const prefetchedModules = new Set<string>();

/**
 * Prefetch a lazy component module in the background.
 * Call this when you anticipate the user will navigate to a screen.
 */
export function prefetchComponent(importFn: () => Promise<any>, label?: string): void {
    const key = label || importFn.toString();
    if (prefetchedModules.has(key)) return;

    prefetchedModules.add(key);

    const schedule = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 200);

    schedule(() => {
        importFn().catch(() => {
            // Module may not be available — ignore
            prefetchedModules.delete(key);
        });
    });
}

// ─── 7. Viewport-based Image Loading ─────────────────────────────────────────

/**
 * Create an IntersectionObserver that loads images when they enter the viewport.
 * Returns a ref callback to attach to image containers.
 */
export function createImageObserver(
    rootMargin = '200px' // Start loading 200px before visible
): IntersectionObserver | null {
    if (typeof IntersectionObserver === 'undefined') return null;

    return new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    // Stop observing once loaded
                    observer.unobserve(entry.target);
                }
            });
        },
        { rootMargin }
    );

    // Trick: observer is const so TypeScript can see the variable
    const observer = new IntersectionObserver(() => { }, { rootMargin });
}

// ─── 8. Performance Metrics ──────────────────────────────────────────────────

/**
 * Measure time between two points. Returns a stop function.
 */
export function measurePerf(label: string): () => number {
    const start = performance.now();
    return () => {
        const duration = performance.now() - start;
        if (duration > 200) {
            console.warn(`[Perf] ⚠️ ${label}: ${duration.toFixed(1)}ms (target: <200ms)`);
        } else {
            console.log(`[Perf] ✅ ${label}: ${duration.toFixed(1)}ms`);
        }
        return duration;
    };
}

/**
 * Log Web Vitals (FCP, LCP, FID, CLS) if available.
 */
export function logWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries[entries.length - 1];
            console.log(`[Perf] LCP: ${lcp.startTime.toFixed(0)}ms`);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { }

    // First Input Delay
    try {
        const fidObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                const fid = (entry as any).processingStart - entry.startTime;
                console.log(`[Perf] FID: ${fid.toFixed(0)}ms`);
            }
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
    } catch { }

    // Cumulative Layout Shift
    try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!(entry as any).hadRecentInput) {
                    clsValue += (entry as any).value;
                }
            }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Log CLS after 5s of stability
        setTimeout(() => {
            console.log(`[Perf] CLS: ${clsValue.toFixed(3)}`);
        }, 5000);
    } catch { }
}
