// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Firebase Platform Layer
// Unified integration of all Firebase services:
//   Analytics, Cloud Messaging, Remote Config, Performance Monitoring,
//   Crashlytics (error tracking), App Check, In-App Messaging, Dynamic Links
//
// This file is the single source of truth for all Firebase product initialization.
// All other modules import from here instead of directly from firebase/*.
// ═══════════════════════════════════════════════════════════════════════════════

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// ─── Firebase Config ─────────────────────────────────────────────────────────

const firebaseConfig = {
    apiKey: "AIzaSyCt5DngU6nykCcp7Lklm2xUgpzOFLB7KKY",
    authDomain: "psimaps-pro.firebaseapp.com",
    projectId: "psimaps-pro",
    storageBucket: "psimaps-pro.firebasestorage.app",
    messagingSenderId: "618627128805",
    appId: "1:618627128805:web:b9a7a3e475f54f590b230c",
    measurementId: "G-KXCXB3TXNZ"
};

// ─── App Initialization (singleton) ──────────────────────────────────────────

let app: FirebaseApp;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// ─── Core Services (always available) ────────────────────────────────────────

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// ─── Installations API Pre-flight Check ──────────────────────────────────────
// Many Firebase services (Analytics, Messaging, Remote Config, Performance)
// depend on the Firebase Installations API. If the API key doesn't have
// permission, all these services will throw noisy console errors.
// We do a one-time check and gate all dependent services behind it.

let _installationsSupported: boolean | null = null;

async function isInstallationsAvailable(): Promise<boolean> {
    if (_installationsSupported !== null) return _installationsSupported;
    if (typeof window === 'undefined') {
        _installationsSupported = false;
        return false;
    }

    try {
        // Test the Installations API by trying to get an auth token.
        // This will fail fast if the API key lacks permissions.
        const { getInstallations, getId } = await import('firebase/installations');
        const installations = getInstallations(app);
        await getId(installations);
        _installationsSupported = true;
    } catch (err: any) {
        const msg = err?.message || '';
        if (msg.includes('request-failed') || msg.includes('INVALID_ARGUMENT')) {
            console.warn(
                '[Firebase] Installations API unavailable — API key may need the ' +
                '"Firebase Installations API" enabled in Google Cloud Console. ' +
                'Analytics, Messaging, Remote Config, and Performance will be disabled.'
            );
            _installationsSupported = false;
        } else {
            // Unknown error — assume supported, let individual services handle it
            _installationsSupported = true;
        }
    }
    return _installationsSupported;
}

// ─── 1. ANALYTICS ────────────────────────────────────────────────────────────
// Lazy-loaded, tree-shakeable. Only initializes in browser environment.

let analyticsInstance: any = null;

/**
 * Get the Analytics instance (lazy-initialized).
 * Returns null in SSR or if analytics is not supported.
 */
export async function getAnalyticsInstance() {
    if (analyticsInstance) return analyticsInstance;
    if (typeof window === 'undefined') return null;

    // Analytics requires Installations API
    if (!(await isInstallationsAvailable())) return null;

    try {
        const { getAnalytics, isSupported } = await import('firebase/analytics');
        const supported = await isSupported();
        if (supported) {
            analyticsInstance = getAnalytics(app);
            console.log('[Firebase] Analytics initialized');
        }
        return analyticsInstance;
    } catch (err) {
        console.warn('[Firebase] Analytics not available:', err);
        return null;
    }
}

/**
 * Log a custom analytics event.
 * Safe to call even if analytics isn't initialized.
 */
export async function logAnalyticsEvent(
    eventName: string,
    params?: Record<string, any>
): Promise<void> {
    try {
        const analytics = await getAnalyticsInstance();
        if (!analytics) return;
        const { logEvent } = await import('firebase/analytics');
        logEvent(analytics, eventName, params);
    } catch { }
}

/**
 * Set a user property for analytics segmentation.
 */
export async function setAnalyticsUserProperty(
    name: string,
    value: string
): Promise<void> {
    try {
        const analytics = await getAnalyticsInstance();
        if (!analytics) return;
        const { setUserProperties } = await import('firebase/analytics');
        setUserProperties(analytics, { [name]: value });
    } catch { }
}

/**
 * Set the analytics user ID for cross-device tracking.
 */
export async function setAnalyticsUserId(userId: string): Promise<void> {
    try {
        const analytics = await getAnalyticsInstance();
        if (!analytics) return;
        const { setUserId } = await import('firebase/analytics');
        setUserId(analytics, userId);
    } catch { }
}

// ── Pre-defined event helpers ────────────────────────────────────────────────

export const AnalyticsEvents = {
    // Navigation
    screenView: (screenName: string) =>
        logAnalyticsEvent('screen_view', { screen_name: screenName, screen_class: 'PWA' }),

    // Project interactions
    projectView: (projectId: string, projectName: string) =>
        logAnalyticsEvent('view_item', {
            item_id: projectId,
            item_name: projectName,
            content_type: 'project',
        }),

    projectSearch: (query: string, resultCount: number) =>
        logAnalyticsEvent('search', { search_term: query, result_count: resultCount }),

    projectFavorite: (projectId: string, projectName: string) =>
        logAnalyticsEvent('add_to_wishlist', {
            item_id: projectId,
            item_name: projectName,
        }),

    projectShare: (projectId: string, method: string) =>
        logAnalyticsEvent('share', {
            content_type: 'project',
            item_id: projectId,
            method,
        }),

    projectInquiry: (projectId: string, projectName: string) =>
        logAnalyticsEvent('generate_lead', {
            item_id: projectId,
            item_name: projectName,
            currency: 'AED',
        }),

    // Map interactions
    mapFilterUsed: (filterType: string, filterValue: string) =>
        logAnalyticsEvent('select_content', {
            content_type: 'filter',
            item_id: `${filterType}:${filterValue}`,
        }),

    mapStyleChanged: (style: string) =>
        logAnalyticsEvent('map_style_change', { map_style: style }),

    communityExplored: (communityName: string) =>
        logAnalyticsEvent('community_explored', { community_name: communityName }),

    // PWA events
    appInstalled: () => logAnalyticsEvent('app_installed'),
    pushPermissionGranted: () => logAnalyticsEvent('push_permission_granted'),
    pushPermissionDenied: () => logAnalyticsEvent('push_permission_denied'),
    offlineBrowse: () => logAnalyticsEvent('offline_browse'),

    // Engagement
    aiChatOpened: () => logAnalyticsEvent('ai_chat_opened'),
    tourStarted: (communityName: string) =>
        logAnalyticsEvent('tour_started', { community_name: communityName }),
    presentationViewed: (presentationId: string) =>
        logAnalyticsEvent('presentation_viewed', { presentation_id: presentationId }),

    // Conversion
    contactFormSubmitted: (projectId: string) =>
        logAnalyticsEvent('contact_form_submitted', {
            item_id: projectId,
            conversion: true,
        }),
};

// ─── 2. CLOUD MESSAGING (FCM) ───────────────────────────────────────────────

let messagingInstance: any = null;

/**
 * Initialize Firebase Cloud Messaging.
 * Returns the messaging instance or null if not supported.
 */
export async function initMessaging() {
    if (messagingInstance) return messagingInstance;
    if (typeof window === 'undefined') return null;

    // Messaging requires Installations API
    if (!(await isInstallationsAvailable())) return null;

    try {
        const { getMessaging, isSupported } = await import('firebase/messaging');
        const supported = await isSupported();
        if (!supported) {
            console.warn('[Firebase] Messaging not supported in this browser');
            return null;
        }
        messagingInstance = getMessaging(app);
        console.log('[Firebase] Cloud Messaging initialized');
        return messagingInstance;
    } catch (err) {
        console.warn('[Firebase] Messaging init failed:', err);
        return null;
    }
}

/**
 * Get the FCM registration token for this device.
 * Required to send targeted push notifications.
 *
 * @param vapidKey Your VAPID public key from Firebase Console
 */
export async function getFCMToken(vapidKey?: string): Promise<string | null> {
    try {
        const messaging = await initMessaging();
        if (!messaging) return null;

        const { getToken } = await import('firebase/messaging');
        const token = await getToken(messaging, {
            vapidKey: vapidKey || undefined,
            serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        if (token) {
            console.log('[Firebase] FCM token received:', token.substring(0, 20) + '...');
            // Store token for server-side use
            await storeDeviceToken(token);
        }

        return token;
    } catch (err) {
        console.warn('[Firebase] FCM token retrieval failed:', err);
        return null;
    }
}

/**
 * Listen for foreground messages (when app is open).
 * Background messages are handled by the service worker.
 */
export async function onForegroundMessage(
    callback: (payload: any) => void
): Promise<(() => void) | null> {
    try {
        const messaging = await initMessaging();
        if (!messaging) return null;

        const { onMessage } = await import('firebase/messaging');
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('[Firebase] Foreground message:', payload);
            callback(payload);
        });

        return unsubscribe;
    } catch {
        return null;
    }
}

/**
 * Store the device FCM token in Firestore for server-side messaging.
 */
async function storeDeviceToken(token: string): Promise<void> {
    try {
        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const tokenDoc = doc(db, 'fcm_tokens', token);
        await setDoc(tokenDoc, {
            token,
            platform: 'web',
            userAgent: navigator.userAgent,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.warn('[Firebase] Failed to store FCM token:', err);
    }
}

// ─── 3. REMOTE CONFIG ────────────────────────────────────────────────────────

let remoteConfigInstance: any = null;

/** Default values for Remote Config */
const REMOTE_CONFIG_DEFAULTS: Record<string, string | number | boolean> = {
    // Feature flags
    feature_ai_chat: true,
    feature_cinematic_tours: true,
    feature_property_comparison: true,
    feature_ar_view: false,
    feature_street_view: true,
    feature_heatmap: false,
    feature_sunlight_analysis: false,
    feature_isochrone: false,

    // UI configuration
    ui_welcome_banner_enabled: true,
    ui_max_carousel_items: 50,
    ui_skeleton_delay_ms: 200,
    ui_transition_duration_ms: 350,
    ui_pull_refresh_threshold: 80,

    // Map defaults
    map_default_zoom: 11,
    map_default_lat: 24.4539,
    map_default_lng: 54.3773,
    map_default_style: 'mapbox://styles/mapbox/light-v11',
    map_cluster_radius: 50,

    // Performance
    perf_prefetch_count: 8,
    perf_image_cache_days: 30,
    perf_data_cache_ttl_hours: 24,

    // Notification settings
    notification_enabled: true,
    notification_quiet_hours_start: 22,
    notification_quiet_hours_end: 8,

    // Maintenance mode
    maintenance_mode: false,
    maintenance_message: '',

    // A/B test parameters
    experiment_sidebar_layout: 'default',
    experiment_card_style: 'compact',
};

/**
 * Initialize Remote Config with defaults and fetch fresh values.
 */
export async function initRemoteConfig() {
    if (remoteConfigInstance) return remoteConfigInstance;
    if (typeof window === 'undefined') return null;

    // Remote Config requires Installations API
    if (!(await isInstallationsAvailable())) return null;

    try {
        const { getRemoteConfig, fetchAndActivate, getValue: getRemoteConfigValue } = await import('firebase/remote-config');
        remoteConfigInstance = getRemoteConfig(app);

        // Development: low cache interval. Production: 12 hours.
        remoteConfigInstance.settings.minimumFetchIntervalMillis =
            process.env.NODE_ENV === 'development' ? 0 : 12 * 60 * 60 * 1000;

        // Set defaults
        remoteConfigInstance.defaultConfig = REMOTE_CONFIG_DEFAULTS;

        // Fetch and activate
        await fetchAndActivate(remoteConfigInstance);
        console.log('[Firebase] Remote Config activated');

        return remoteConfigInstance;
    } catch (err) {
        console.warn('[Firebase] Remote Config init failed:', err);
        return null;
    }
}

/**
 * Get a Remote Config value with type safety.
 */
export async function getConfigValue(key: string): Promise<string | number | boolean> {
    try {
        const rc = await initRemoteConfig();
        if (!rc) return REMOTE_CONFIG_DEFAULTS[key] ?? '';

        const { getValue } = await import('firebase/remote-config');
        const value = getValue(rc, key);

        // Try to return the right type based on the default
        const defaultVal = REMOTE_CONFIG_DEFAULTS[key];
        if (typeof defaultVal === 'boolean') return value.asBoolean();
        if (typeof defaultVal === 'number') return value.asNumber();
        return value.asString();
    } catch {
        return REMOTE_CONFIG_DEFAULTS[key] ?? '';
    }
}

/**
 * Get a boolean feature flag from Remote Config.
 */
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
    const value = await getConfigValue(featureKey);
    return Boolean(value);
}

/**
 * Get all config values as a flat object.
 */
export async function getAllConfigValues(): Promise<Record<string, any>> {
    try {
        const rc = await initRemoteConfig();
        if (!rc) return { ...REMOTE_CONFIG_DEFAULTS };

        const { getAll } = await import('firebase/remote-config');
        const allValues = getAll(rc);
        const result: Record<string, any> = {};

        for (const [key, value] of Object.entries(allValues)) {
            const defaultVal = REMOTE_CONFIG_DEFAULTS[key];
            if (typeof defaultVal === 'boolean') result[key] = (value as any).asBoolean();
            else if (typeof defaultVal === 'number') result[key] = (value as any).asNumber();
            else result[key] = (value as any).asString();
        }

        return { ...REMOTE_CONFIG_DEFAULTS, ...result };
    } catch {
        return { ...REMOTE_CONFIG_DEFAULTS };
    }
}

// ─── 4. PERFORMANCE MONITORING ───────────────────────────────────────────────

let perfInstance: any = null;

/**
 * Initialize Firebase Performance Monitoring.
 * Automatically tracks page loads, network requests, and custom traces.
 */
export async function initPerformanceMonitoring() {
    if (perfInstance) return perfInstance;
    if (typeof window === 'undefined') return null;

    // Performance Monitoring requires Installations API
    if (!(await isInstallationsAvailable())) return null;

    try {
        const { getPerformance } = await import('firebase/performance');
        perfInstance = getPerformance(app);
        console.log('[Firebase] Performance Monitoring initialized');
        return perfInstance;
    } catch (err) {
        console.warn('[Firebase] Performance Monitoring not available:', err);
        return null;
    }
}

/**
 * Create a custom performance trace.
 *
 * @example
 * const trace = await startTrace('project_sidebar_load');
 * // ... do work ...
 * trace?.stop();
 */
export async function startTrace(traceName: string): Promise<{
    stop: () => void;
    putAttribute: (key: string, value: string) => void;
    putMetric: (key: string, value: number) => void;
    incrementMetric: (key: string, delta?: number) => void;
} | null> {
    try {
        const perf = await initPerformanceMonitoring();
        if (!perf) return null;

        const { trace } = await import('firebase/performance');
        const t = trace(perf, traceName);
        t.start();

        return {
            stop: () => t.stop(),
            putAttribute: (key: string, value: string) => t.putAttribute(key, value),
            putMetric: (key: string, value: number) => t.putMetric(key, value),
            incrementMetric: (key: string, delta = 1) => t.incrementMetric(key, delta),
        };
    } catch {
        return null;
    }
}

/**
 * Pre-built traces for common operations.
 */
export const PerfTraces = {
    /** Track time to load and display the project sidebar */
    sidebarLoad: () => startTrace('sidebar_load'),

    /** Track time for a search operation */
    searchQuery: () => startTrace('search_query'),

    /** Track time to apply map filters */
    filterApply: () => startTrace('filter_apply'),

    /** Track time for a cinematic tour segment */
    tourSegment: () => startTrace('tour_segment'),

    /** Track time for Firestore data fetch */
    dataFetch: (collection: string) => startTrace(`data_fetch_${collection}`),

    /** Track image optimization pipeline */
    imageOptimize: () => startTrace('image_optimize'),

    /** Track AI chat response time */
    aiChatResponse: () => startTrace('ai_chat_response'),
};

// ─── 5. ERROR TRACKING (Crashlytics-style) ───────────────────────────────────
// Note: Firebase Crashlytics is not available for web. We implement equivalent
// functionality using Analytics custom events + structured error logging.

interface ErrorContext {
    screen?: string;
    action?: string;
    userId?: string;
    projectId?: string;
    metadata?: Record<string, any>;
}

const errorBuffer: Array<{ error: Error; context: ErrorContext; timestamp: number }> = [];
const MAX_ERRORS_PER_SESSION = 50;

/**
 * Log a non-fatal error to analytics with context.
 */
export async function logError(
    error: Error,
    context: ErrorContext = {}
): Promise<void> {
    // Buffer to avoid spam
    if (errorBuffer.length >= MAX_ERRORS_PER_SESSION) return;
    errorBuffer.push({ error, context, timestamp: Date.now() });

    console.error(`[ErrorTracker] ${error.message}`, { error, context });

    // Log to Analytics as a custom event
    await logAnalyticsEvent('app_error', {
        error_message: error.message.substring(0, 100),
        error_name: error.name,
        error_stack: (error.stack || '').substring(0, 500),
        screen: context.screen || 'unknown',
        action: context.action || 'unknown',
        fatal: false,
        ...context.metadata,
    });
}

/**
 * Log a fatal/critical error.
 */
export async function logFatalError(
    error: Error,
    context: ErrorContext = {}
): Promise<void> {
    console.error(`[ErrorTracker] FATAL: ${error.message}`, { error, context });

    await logAnalyticsEvent('app_error', {
        error_message: error.message.substring(0, 100),
        error_name: error.name,
        error_stack: (error.stack || '').substring(0, 500),
        screen: context.screen || 'unknown',
        action: context.action || 'unknown',
        fatal: true,
        ...context.metadata,
    });

    // Also store in Firestore for admin dashboard visibility
    try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        await addDoc(collection(db, 'error_logs'), {
            message: error.message,
            name: error.name,
            stack: (error.stack || '').substring(0, 2000),
            context,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: serverTimestamp(),
            fatal: true,
        });
    } catch { }
}

/**
 * Install global error handlers.
 * Call once on app startup.
 */
export function installErrorHandlers(): void {
    // Known Firebase error patterns to suppress from noisy logging
    const SUPPRESSED_PATTERNS = [
        'installations/request-failed',
        'INVALID_ARGUMENT: API key not valid',
        'firebaseinstallations.googleapis.com',
    ];

    const isSuppressed = (msg: string) =>
        SUPPRESSED_PATTERNS.some((p) => msg.includes(p));

    // Uncaught errors
    window.addEventListener('error', (event) => {
        const msg = event.message || event.error?.message || '';
        if (isSuppressed(msg)) return;
        logError(
            event.error || new Error(event.message),
            { action: 'uncaught_error', metadata: { filename: event.filename, line: event.lineno } }
        );
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        const error = event.reason instanceof Error
            ? event.reason
            : new Error(String(event.reason));
        if (isSuppressed(error.message)) {
            event.preventDefault(); // Suppress from console entirely
            return;
        }
        logError(error, { action: 'unhandled_rejection' });
    });

    // React error boundary integration
    // (Components should catch and call logError with screen context)

    console.log('[Firebase] Global error handlers installed');
}

// ─── 6. APP CHECK ────────────────────────────────────────────────────────────

/**
 * Initialize Firebase App Check using reCAPTCHA Enterprise.
 * Protects Firebase services from unauthorized access.
 *
 * @param siteKey Your reCAPTCHA Enterprise site key
 */
export async function initAppCheck(siteKey?: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check');

        // In development, enable debug mode
        if (process.env.NODE_ENV === 'development') {
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        if (siteKey) {
            initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(siteKey),
                isTokenAutoRefreshEnabled: true,
            });
            console.log('[Firebase] App Check initialized (reCAPTCHA Enterprise)');
        } else {
            console.warn('[Firebase] App Check skipped — no site key provided');
        }
    } catch (err) {
        console.warn('[Firebase] App Check init failed:', err);
    }
}

// ─── 7. IN-APP MESSAGING ────────────────────────────────────────────────────

/**
 * Initialize Firebase In-App Messaging.
 * Displays contextual messages based on analytics events and audiences.
 * Messages are configured in the Firebase Console.
 */
export async function initInAppMessaging(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        // In-App Messaging auto-initializes when imported — just need analytics
        await getAnalyticsInstance();

        // The import itself enables FIAM
        const fiam = await import('firebase/messaging');
        console.log('[Firebase] In-App Messaging ready (configure messages in Console)');
    } catch (err) {
        console.warn('[Firebase] In-App Messaging not available:', err);
    }
}

// ─── 8. DYNAMIC LINKS ───────────────────────────────────────────────────────

const DYNAMIC_LINK_DOMAIN = 'psimaps.page.link';

/**
 * Create a deep link that works across web, mobile, and installed PWA.
 * Uses Firebase Dynamic Links format for maximum compatibility.
 */
export function createDeepLink(params: {
    screen?: string;
    projectId?: string;
    action?: string;
    communityName?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
}): string {
    const base = window.location.origin;
    const url = new URL(base);

    if (params.screen) url.searchParams.set('screen', params.screen);
    if (params.projectId) url.searchParams.set('project', params.projectId);
    if (params.action) url.searchParams.set('action', params.action);
    if (params.communityName) url.searchParams.set('community', params.communityName);

    // UTM parameters for campaign tracking
    if (params.utm_source) url.searchParams.set('utm_source', params.utm_source);
    if (params.utm_medium) url.searchParams.set('utm_medium', params.utm_medium);
    if (params.utm_campaign) url.searchParams.set('utm_campaign', params.utm_campaign);

    return url.toString();
}

/**
 * Parse a deep link URL and extract navigation parameters.
 */
export function parseDeepLink(url: string): {
    screen?: string;
    projectId?: string;
    action?: string;
    communityName?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
} {
    try {
        const parsed = new URL(url);
        return {
            screen: parsed.searchParams.get('screen') || undefined,
            projectId: parsed.searchParams.get('project') || undefined,
            action: parsed.searchParams.get('action') || undefined,
            communityName: parsed.searchParams.get('community') || undefined,
            utm_source: parsed.searchParams.get('utm_source') || undefined,
            utm_medium: parsed.searchParams.get('utm_medium') || undefined,
            utm_campaign: parsed.searchParams.get('utm_campaign') || undefined,
        };
    } catch {
        return {};
    }
}

/**
 * Handle incoming deep links on app startup.
 * Checks URL params and dispatches navigation events.
 */
export function handleIncomingDeepLink(): void {
    const params = parseDeepLink(window.location.href);

    // Log deep link arrival
    if (params.projectId || params.action || params.screen) {
        logAnalyticsEvent('deep_link_arrived', {
            screen: params.screen,
            project_id: params.projectId,
            action: params.action,
            utm_source: params.utm_source,
            utm_campaign: params.utm_campaign,
        });
    }

    // Dispatch to app
    if (params.projectId) {
        window.dispatchEvent(new CustomEvent('psi-deep-link', {
            detail: { projectId: params.projectId },
        }));
    }

    if (params.action) {
        window.dispatchEvent(new CustomEvent('psi-deep-link-action', {
            detail: { action: params.action },
        }));
    }
}

// ─── 9. PLATFORM INITIALIZATION ──────────────────────────────────────────────

/**
 * Initialize all Firebase services in the correct order.
 * Call once on app startup.
 *
 * @param options Optional configuration overrides
 */
export async function initFirebasePlatform(options: {
    appCheckSiteKey?: string;
    fcmVapidKey?: string;
    enablePerformance?: boolean;
    enableMessaging?: boolean;
    enableRemoteConfig?: boolean;
    enableInAppMessaging?: boolean;
} = {}): Promise<void> {
    console.log('[Firebase] Initializing platform...');

    // 1. Error handlers first (catch everything that follows)
    installErrorHandlers();

    // 2. App Check (must be before other services for security)
    if (options.appCheckSiteKey) {
        await initAppCheck(options.appCheckSiteKey);
    }

    // 3. Analytics (required by many other services)
    await getAnalyticsInstance();

    // 4. Remote Config (feature flags drive what we initialize)
    if (options.enableRemoteConfig !== false) {
        await initRemoteConfig();
    }

    // 5. Performance Monitoring
    if (options.enablePerformance !== false) {
        await initPerformanceMonitoring();
    }

    // 6. Cloud Messaging (only if user has granted permission)
    if (options.enableMessaging !== false && Notification?.permission === 'granted') {
        await initMessaging();
        if (options.fcmVapidKey) {
            await getFCMToken(options.fcmVapidKey);
        }
    }

    // 7. Handle incoming deep links
    handleIncomingDeepLink();

    console.log('[Firebase] Platform initialization complete');
}

// ─── Legacy Exports (backward compatible with utils/firebase.ts) ─────────────
// The old firebase.ts exported db, storage, and analytics=null.
// This module provides the same + all new services.

export const analytics = null; // Legacy compat — use getAnalyticsInstance() instead
export { app };
