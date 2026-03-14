// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Predictive Screen Preloader
// Preloads screens and data before the user navigates, achieving <100ms transition
//
// Strategy:
//   1. Hover/touch intent detection → preload destination screen
//   2. Viewport proximity → prefetch nearby project data
//   3. Navigation pattern prediction → pre-warm likely next screens
//   4. Idle-time component loading → pre-import lazy chunks
// ═══════════════════════════════════════════════════════════════════════════════

import { prefetchImages, prefetchComponent } from './performanceEngine';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PreloadedScreen {
    /** The screen identifier */
    screen: string;
    /** Associated project/entity ID */
    entityId?: string;
    /** Preloaded data (images, API responses) */
    data: Map<string, any>;
    /** When this was preloaded */
    timestamp: number;
    /** Component module reference (if lazy) */
    module?: any;
}

interface PredictionEntry {
    /** Screen ID */
    screen: string;
    /** Entity ID */
    entityId?: string;
    /** How many times this transition has been observed */
    count: number;
    /** Last observed timestamp */
    lastSeen: number;
}

type PreloadPriority = 'immediate' | 'eager' | 'idle';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max screens to keep preloaded in memory */
const MAX_PRELOADED = 8;

/** Max prediction entries to track */
const MAX_PREDICTIONS = 30;

/** How long preloaded data stays valid (2 minutes) */
const PRELOAD_TTL = 2 * 60 * 1000;

/** Hover duration before triggering preload (ms) */
const HOVER_THRESHOLD = 80;

/** Touch-start triggers preload immediately (0ms) — user intent is clear */
const TOUCH_THRESHOLD = 0;

/** Key for persisting navigation patterns */
const PATTERNS_KEY = 'psi-nav-patterns';

// ─── Preload Cache ───────────────────────────────────────────────────────────

const preloadCache = new Map<string, PreloadedScreen>();
const pendingPreloads = new Set<string>();
const navPatterns: PredictionEntry[] = [];

// ─── Lazy Component Registry ─────────────────────────────────────────────────

const componentRegistry: Record<string, () => Promise<any>> = {
    ProjectSidebar: () => import('../components/ProjectSidebar'),
    AdminDashboard: () => import('../components/AdminDashboard'),
};

const loadedComponents = new Set<string>();

// ─── Core Preload Functions ──────────────────────────────────────────────────

/**
 * Preload a screen's assets and data before navigation.
 * This is the main entry point — call when hover/touch intent is detected.
 */
export function preloadScreen(
    screen: string,
    entityId?: string,
    data?: Record<string, any>,
    priority: PreloadPriority = 'eager'
): void {
    const cacheKey = getCacheKey(screen, entityId);

    // Already preloaded and still fresh
    if (preloadCache.has(cacheKey)) {
        const cached = preloadCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < PRELOAD_TTL) return;
    }

    // Already in flight
    if (pendingPreloads.has(cacheKey)) return;
    pendingPreloads.add(cacheKey);

    const execute = () => {
        const entry: PreloadedScreen = {
            screen,
            entityId,
            data: new Map(Object.entries(data || {})),
            timestamp: Date.now(),
        };

        // 1. Preload the component module (if lazy)
        const componentName = screenToComponent(screen);
        if (componentName && componentRegistry[componentName] && !loadedComponents.has(componentName)) {
            const importFn = componentRegistry[componentName];
            importFn().then(mod => {
                entry.module = mod;
                loadedComponents.add(componentName);
            }).catch(() => { });
        }

        // 2. Preload images associated with this screen
        if (data) {
            const imagesToPrefetch: string[] = [];

            if (data.thumbnailUrl) imagesToPrefetch.push(data.thumbnailUrl);
            if (data.images && Array.isArray(data.images)) {
                imagesToPrefetch.push(...data.images.slice(0, 5));
            }
            if (data.developerLogo) imagesToPrefetch.push(data.developerLogo);

            if (imagesToPrefetch.length > 0) {
                prefetchImages(imagesToPrefetch);
            }
        }

        // 3. Store in cache
        preloadCache.set(cacheKey, entry);
        pendingPreloads.delete(cacheKey);

        // 4. Evict old entries if cache is full
        evictStaleEntries();
    };

    // Schedule based on priority
    if (priority === 'immediate') {
        execute();
    } else if (priority === 'eager') {
        // Use microtask for near-immediate execution without blocking
        queueMicrotask(execute);
    } else {
        // Idle: use requestIdleCallback
        const schedule = typeof requestIdleCallback !== 'undefined'
            ? requestIdleCallback
            : (cb: () => void) => setTimeout(cb, 150);
        schedule(execute);
    }
}

/**
 * Check if a screen is already preloaded and return its data.
 */
export function getPreloadedScreen(
    screen: string,
    entityId?: string
): PreloadedScreen | null {
    const cacheKey = getCacheKey(screen, entityId);
    const cached = preloadCache.get(cacheKey);

    if (!cached) return null;
    if (Date.now() - cached.timestamp > PRELOAD_TTL) {
        preloadCache.delete(cacheKey);
        return null;
    }

    return cached;
}

/**
 * Check if a screen's component and data are ready for instant display.
 */
export function isScreenReady(screen: string, entityId?: string): boolean {
    const cached = getPreloadedScreen(screen, entityId);
    if (!cached) return false;

    // Check component is loaded
    const componentName = screenToComponent(screen);
    if (componentName && !loadedComponents.has(componentName)) return false;

    return true;
}

// ─── Intent Detection ────────────────────────────────────────────────────────

/** Timer for hover-based preloading */
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let lastHoveredId: string | null = null;

/**
 * Call when the user hovers over an interactive element (desktop).
 * Waits HOVER_THRESHOLD ms before preloading to avoid wasted work on fast mouse movements.
 */
export function onHoverIntent(
    screen: string,
    entityId?: string,
    data?: Record<string, any>
): void {
    const key = getCacheKey(screen, entityId);

    // Skip if same as last hover
    if (key === lastHoveredId) return;
    lastHoveredId = key;

    // Cancel previous hover timer
    if (hoverTimer) clearTimeout(hoverTimer);

    hoverTimer = setTimeout(() => {
        preloadScreen(screen, entityId, data, 'eager');
    }, HOVER_THRESHOLD);
}

/**
 * Call when hover ends (mouse leaves the element).
 */
export function onHoverCancel(): void {
    if (hoverTimer) {
        clearTimeout(hoverTimer);
        hoverTimer = null;
    }
    lastHoveredId = null;
}

/**
 * Call when the user touches an interactive element (mobile).
 * Touch intent is much stronger than hover — preload immediately.
 */
export function onTouchIntent(
    screen: string,
    entityId?: string,
    data?: Record<string, any>
): void {
    preloadScreen(screen, entityId, data, 'immediate');
}

// ─── Project-Specific Preloading ─────────────────────────────────────────────

/**
 * Preload everything needed to instantly display a project sidebar.
 * Call on hover/touch of a project card or map marker.
 */
export function preloadProjectScreen(project: {
    id: string;
    name?: string;
    thumbnailUrl?: string;
    images?: string[];
    developerLogo?: string;
    developerName?: string;
    community?: string;
    city?: string;
    [key: string]: any;
}): void {
    // Ensure ProjectSidebar chunk is loaded
    if (!loadedComponents.has('ProjectSidebar')) {
        prefetchComponent(
            componentRegistry.ProjectSidebar,
            'ProjectSidebar'
        );
        loadedComponents.add('ProjectSidebar');
    }

    preloadScreen('project', project.id, {
        thumbnailUrl: project.thumbnailUrl,
        images: project.images || [],
        developerLogo: project.developerLogo,
        name: project.name,
        developerName: project.developerName,
        community: project.community,
        city: project.city,
    }, 'immediate');
}

/**
 * Preload multiple projects' images in advance (e.g., projects visible in the carousel).
 * Uses idle priority to avoid blocking the UI.
 */
export function preloadVisibleProjects(projects: Array<{
    id: string;
    thumbnailUrl?: string;
    images?: string[];
}>): void {
    const schedule = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 200);

    schedule(() => {
        // Preload thumbnails for visible projects
        const urls = projects
            .slice(0, 12)
            .map(p => p.thumbnailUrl)
            .filter(Boolean) as string[];

        if (urls.length > 0) {
            prefetchImages(urls);
        }

        // Pre-warm the ProjectSidebar component
        if (!loadedComponents.has('ProjectSidebar')) {
            prefetchComponent(
                componentRegistry.ProjectSidebar,
                'ProjectSidebar'
            );
            loadedComponents.add('ProjectSidebar');
        }
    });
}

// ─── Navigation Pattern Prediction ───────────────────────────────────────────

/**
 * Record a navigation event for pattern learning.
 * Call every time the user navigates to a screen.
 */
export function recordNavigation(
    fromScreen: string,
    toScreen: string,
    toEntityId?: string
): void {
    const existing = navPatterns.find(
        p => p.screen === toScreen && p.entityId === toEntityId
    );

    if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
    } else {
        navPatterns.push({
            screen: toScreen,
            entityId: toEntityId,
            count: 1,
            lastSeen: Date.now(),
        });
    }

    // Trim old entries
    if (navPatterns.length > MAX_PREDICTIONS) {
        navPatterns.sort((a, b) => b.count - a.count);
        navPatterns.splice(MAX_PREDICTIONS);
    }

    // Persist patterns
    persistPatterns();
}

/**
 * Get predicted next screens based on navigation history.
 * Returns the most likely screens the user will navigate to.
 */
export function getPredictedScreens(
    currentScreen: string,
    limit = 3
): PredictionEntry[] {
    return navPatterns
        .filter(p => p.screen !== currentScreen)
        .sort((a, b) => {
            // Score = frequency * recency
            const scoreA = a.count * (1 / (1 + (Date.now() - a.lastSeen) / 3600000));
            const scoreB = b.count * (1 / (1 + (Date.now() - b.lastSeen) / 3600000));
            return scoreB - scoreA;
        })
        .slice(0, limit);
}

/**
 * Preload predicted next screens during idle time.
 * Call after each navigation completes.
 */
export function preloadPredictedScreens(currentScreen: string): void {
    const predictions = getPredictedScreens(currentScreen, 2);

    for (const prediction of predictions) {
        const componentName = screenToComponent(prediction.screen);
        if (componentName && componentRegistry[componentName] && !loadedComponents.has(componentName)) {
            prefetchComponent(componentRegistry[componentName], componentName);
            loadedComponents.add(componentName);
        }
    }
}

// ─── Viewport Proximity Preloading ───────────────────────────────────────────

let proximityObserver: IntersectionObserver | null = null;

/**
 * Create an IntersectionObserver that preloads project data when the card
 * enters the viewport (200px margin). Attach via data-preload-project="id".
 */
export function initProximityPreloader(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    if (proximityObserver) return; // Already initialized

    proximityObserver = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;

                const el = entry.target as HTMLElement;
                const projectId = el.dataset.preloadProject;
                const thumbnail = el.dataset.preloadThumbnail;

                if (projectId && thumbnail) {
                    // This project card is about to be visible — preload its data
                    preloadScreen('project', projectId, { thumbnailUrl: thumbnail }, 'idle');
                }

                // Stop observing — one preload per element is enough
                proximityObserver?.unobserve(el);
            }
        },
        {
            rootMargin: '200px', // Start preloading 200px before the card is visible
            threshold: 0,
        }
    );
}

/**
 * Observe an element for proximity-based preloading.
 */
export function observeForPreload(element: HTMLElement): void {
    if (!proximityObserver) initProximityPreloader();
    proximityObserver?.observe(element);
}

// ─── React Integration Helpers ───────────────────────────────────────────────

/**
 * Returns event handlers for a project card that trigger predictive preloading.
 * Spread these onto any interactive project element.
 *
 * @example
 * <div {...getPreloadHandlers(project)}>
 *   ...card content...
 * </div>
 */
export function getPreloadHandlers(project: {
    id: string;
    name?: string;
    thumbnailUrl?: string;
    images?: string[];
    developerLogo?: string;
    [key: string]: any;
}) {
    return {
        onMouseEnter: () => {
            onHoverIntent('project', project.id, {
                thumbnailUrl: project.thumbnailUrl,
                images: project.images || [],
                developerLogo: project.developerLogo,
            });
        },
        onMouseLeave: () => {
            onHoverCancel();
        },
        onTouchStart: () => {
            // Touch intent is strong — preload immediately
            preloadProjectScreen(project);
        },
        onPointerDown: () => {
            // Pointer down (before click) — preload immediately
            preloadProjectScreen(project);
        },
    };
}

/**
 * Hook-compatible: returns a ref callback that sets up proximity preloading.
 */
export function getProximityRef(projectId: string, thumbnailUrl?: string) {
    return (element: HTMLElement | null) => {
        if (!element) return;
        element.dataset.preloadProject = projectId;
        if (thumbnailUrl) element.dataset.preloadThumbnail = thumbnailUrl;
        observeForPreload(element);
    };
}

// ─── Warm-Up Functions ───────────────────────────────────────────────────────

/**
 * Call on app startup to warm up the preloading system.
 * Loads saved navigation patterns and pre-imports likely components.
 */
export function warmUpPreloader(): void {
    // 1. Load saved navigation patterns
    loadPatterns();

    // 2. Initialize proximity observer
    initProximityPreloader();

    // 3. Pre-import the most-used component
    const schedule = typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback
        : (cb: () => void) => setTimeout(cb, 300);

    schedule(() => {
        // ProjectSidebar is by far the most navigated-to screen
        if (!loadedComponents.has('ProjectSidebar')) {
            prefetchComponent(componentRegistry.ProjectSidebar, 'ProjectSidebar');
            loadedComponents.add('ProjectSidebar');
        }
    });
}

/**
 * Preload the admin dashboard if the user has admin access.
 * Call when admin indicator is visible.
 */
export function warmUpAdmin(): void {
    if (!loadedComponents.has('AdminDashboard')) {
        prefetchComponent(componentRegistry.AdminDashboard, 'AdminDashboard');
        loadedComponents.add('AdminDashboard');
    }
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function getCacheKey(screen: string, entityId?: string): string {
    return entityId ? `${screen}:${entityId}` : screen;
}

function screenToComponent(screen: string): string | null {
    switch (screen) {
        case 'project': return 'ProjectSidebar';
        case 'admin': return 'AdminDashboard';
        default: return null;
    }
}

function evictStaleEntries(): void {
    if (preloadCache.size <= MAX_PRELOADED) return;

    // Remove oldest entries first
    const entries = Array.from(preloadCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);

    while (preloadCache.size > MAX_PRELOADED && entries.length > 0) {
        const [key] = entries.shift()!;
        preloadCache.delete(key);
    }
}

function persistPatterns(): void {
    try {
        localStorage.setItem(PATTERNS_KEY, JSON.stringify(navPatterns));
    } catch { }
}

function loadPatterns(): void {
    try {
        const saved = localStorage.getItem(PATTERNS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                navPatterns.push(...parsed);
            }
        }
    } catch { }
}
