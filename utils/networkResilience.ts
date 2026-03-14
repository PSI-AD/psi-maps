// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Network Resilience Engine
// Retry strategies, circuit breaker, request queue, and graceful degradation
// ═══════════════════════════════════════════════════════════════════════════════

// ─── 1. Retry Strategy ──────────────────────────────────────────────────────

export interface RetryOptions {
    /** Maximum number of attempts (including the first) */
    maxAttempts?: number;
    /** Base delay in ms (doubles each retry via exponential backoff) */
    baseDelay?: number;
    /** Maximum delay cap in ms */
    maxDelay?: number;
    /** Whether to add jitter to prevent thundering herd */
    jitter?: boolean;
    /** Optional signal to abort retries */
    signal?: AbortSignal;
    /** Callback on each retry attempt */
    onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void;
    /** Only retry on these HTTP status codes (default: 408, 429, 500, 502, 503, 504) */
    retryableStatuses?: number[];
}

const DEFAULT_RETRYABLE = [408, 429, 500, 502, 503, 504];

/**
 * Execute an async function with exponential backoff retry.
 * 
 * @example
 * const data = await retryWithBackoff(() => fetch('/api/data').then(r => r.json()));
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        baseDelay = 1000,
        maxDelay = 15000,
        jitter = true,
        signal,
        onRetry,
        retryableStatuses = DEFAULT_RETRYABLE,
    } = options;

    let lastError: Error = new Error('Unknown error');

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        // Check abort signal
        if (signal?.aborted) {
            throw new DOMException('Retry aborted', 'AbortError');
        }

        try {
            return await fn();
        } catch (error: any) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry if we've used all attempts
            if (attempt >= maxAttempts) break;

            // Don't retry non-retryable HTTP errors
            if (error?.status && !retryableStatuses.includes(error.status)) {
                break;
            }

            // Don't retry 4xx client errors (except 408 and 429)
            if (error?.status >= 400 && error?.status < 500 && error?.status !== 408 && error?.status !== 429) {
                break;
            }

            // Calculate delay with exponential backoff
            let delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

            // Add jitter (±25%) to prevent thundering herd
            if (jitter) {
                delay = delay * (0.75 + Math.random() * 0.5);
            }

            onRetry?.(attempt, lastError, delay);

            // Wait before retrying
            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(resolve, delay);
                if (signal) {
                    signal.addEventListener('abort', () => {
                        clearTimeout(timer);
                        reject(new DOMException('Retry aborted', 'AbortError'));
                    }, { once: true });
                }
            });
        }
    }

    throw lastError;
}

// ─── 2. Resilient Fetch ─────────────────────────────────────────────────────

export interface ResilientFetchOptions extends RetryOptions {
    /** Timeout in ms for each request attempt */
    timeout?: number;
    /** Cache key — if set, returns cached response when offline */
    cacheKey?: string;
}

/**
 * Fetch with automatic retry, timeout, and offline cache fallback.
 * 
 * @example
 * const data = await resilientFetch('/api/projects', { maxAttempts: 3, timeout: 5000 });
 */
export async function resilientFetch(
    url: string,
    fetchOptions: RequestInit = {},
    resilientOptions: ResilientFetchOptions = {}
): Promise<Response> {
    const { timeout = 10000, cacheKey, ...retryOpts } = resilientOptions;

    return retryWithBackoff(async () => {
        // If offline, try cache immediately
        if (!navigator.onLine && cacheKey) {
            const cached = await getCachedResponse(cacheKey);
            if (cached) return cached;
            throw new NetworkError('No internet connection', 0);
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = new NetworkError(
                    `HTTP ${response.status}: ${response.statusText}`,
                    response.status
                );
                throw error;
            }

            // Cache successful responses for offline use
            if (cacheKey) {
                cacheResponse(cacheKey, response.clone());
            }

            return response;
        } catch (error: any) {
            clearTimeout(timeoutId);

            // Timeout → try cache
            if (error.name === 'AbortError' && cacheKey) {
                const cached = await getCachedResponse(cacheKey);
                if (cached) return cached;
            }

            // Network error → try cache
            if (error instanceof TypeError && error.message.includes('Failed to fetch') && cacheKey) {
                const cached = await getCachedResponse(cacheKey);
                if (cached) return cached;
            }

            throw error;
        }
    }, retryOpts);
}

// ─── 3. Network Error Class ─────────────────────────────────────────────────

export class NetworkError extends Error {
    public status: number;
    public isOffline: boolean;
    public isTimeout: boolean;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'NetworkError';
        this.status = status;
        this.isOffline = !navigator.onLine;
        this.isTimeout = status === 0 || message.includes('timeout');
    }
}

// ─── 4. Response Cache (simple key-value) ───────────────────────────────────

const RESPONSE_CACHE = 'psi-response-cache';

async function getCachedResponse(key: string): Promise<Response | null> {
    try {
        const cache = await caches.open(RESPONSE_CACHE);
        const match = await cache.match(new Request(key));
        if (match) {
            console.log(`[Network] Cache hit for: ${key}`);
        }
        return match || null;
    } catch {
        return null;
    }
}

async function cacheResponse(key: string, response: Response): Promise<void> {
    try {
        const cache = await caches.open(RESPONSE_CACHE);
        await cache.put(new Request(key), response);
    } catch { }
}

// ─── 5. Connection Monitor ──────────────────────────────────────────────────

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'offline';

/**
 * Detect current connection quality.
 * Uses Network Information API when available, falls back to online/offline.
 */
export function getConnectionQuality(): ConnectionQuality {
    if (!navigator.onLine) return 'offline';

    const conn = (navigator as any).connection;
    if (conn) {
        const effectiveType = conn.effectiveType;
        if (effectiveType === '4g') return 'excellent';
        if (effectiveType === '3g') return 'good';
        return 'poor'; // 2g or slow-2g
    }

    return 'good'; // Default assumption
}

/**
 * Subscribe to connection quality changes.
 */
export function onConnectionChange(
    callback: (quality: ConnectionQuality, isOnline: boolean) => void
): () => void {
    const handler = () => {
        callback(getConnectionQuality(), navigator.onLine);
    };

    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);

    const conn = (navigator as any).connection;
    if (conn) {
        conn.addEventListener('change', handler);
    }

    // Call immediately with current state
    handler();

    return () => {
        window.removeEventListener('online', handler);
        window.removeEventListener('offline', handler);
        if (conn) conn.removeEventListener('change', handler);
    };
}

// ─── 6. Request Queue (queue requests while offline) ────────────────────────

interface QueuedRequest {
    url: string;
    options: RequestInit;
    resolve: (value: Response) => void;
    reject: (reason: any) => void;
    timestamp: number;
}

const offlineQueue: QueuedRequest[] = [];
let isProcessing = false;

/**
 * Queue a fetch request that will be executed when back online.
 */
export function queueRequest(url: string, options: RequestInit = {}): Promise<Response> {
    return new Promise((resolve, reject) => {
        if (navigator.onLine) {
            // Online — execute immediately
            fetch(url, options).then(resolve).catch(reject);
        } else {
            // Offline — queue for later
            offlineQueue.push({ url, options, resolve, reject, timestamp: Date.now() });
            console.log(`[Network] Request queued (offline): ${url} (${offlineQueue.length} in queue)`);
        }
    });
}

// Process the queue when coming back online
if (typeof window !== 'undefined') {
    window.addEventListener('online', processQueue);
}

async function processQueue() {
    if (isProcessing || offlineQueue.length === 0) return;
    isProcessing = true;

    console.log(`[Network] Processing ${offlineQueue.length} queued request(s)...`);

    // Process oldest first
    while (offlineQueue.length > 0) {
        const req = offlineQueue.shift()!;

        // Skip requests older than 5 minutes
        if (Date.now() - req.timestamp > 5 * 60 * 1000) {
            req.reject(new Error('Request expired (>5min in queue)'));
            continue;
        }

        try {
            const response = await fetch(req.url, req.options);
            req.resolve(response);
        } catch (error) {
            req.reject(error);
        }
    }

    isProcessing = false;
}
