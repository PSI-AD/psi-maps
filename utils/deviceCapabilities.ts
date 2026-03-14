// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Device Capabilities API
// Unified access to native device APIs with graceful permission handling
// Camera, Geolocation, Clipboard, Orientation, Share, Wake Lock
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Feature Detection ───────────────────────────────────────────────────────

export const deviceSupport = {
    camera: typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
    geolocation: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    clipboard: typeof navigator !== 'undefined' && !!navigator.clipboard,
    orientation: typeof window !== 'undefined' && ('DeviceOrientationEvent' in window),
    share: typeof navigator !== 'undefined' && !!navigator.share,
    wakeLock: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    vibration: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    notifications: typeof window !== 'undefined' && 'Notification' in window,
    bluetooth: typeof navigator !== 'undefined' && 'bluetooth' in navigator,
    usb: typeof navigator !== 'undefined' && 'usb' in navigator,
};

// ─── 1. Camera API ───────────────────────────────────────────────────────────

export interface CameraOptions {
    facingMode?: 'user' | 'environment';
    width?: number;
    height?: number;
    audio?: boolean;
}

/**
 * Request camera access and return the MediaStream.
 * Caller is responsible for stopping the stream when done.
 */
export async function requestCamera(options: CameraOptions = {}): Promise<MediaStream> {
    if (!deviceSupport.camera) {
        throw new Error('Camera API not supported on this device');
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: options.facingMode || 'environment',
                width: options.width ? { ideal: options.width } : undefined,
                height: options.height ? { ideal: options.height } : undefined,
            },
            audio: options.audio ?? false,
        });
        console.log('[Device] Camera access granted');
        return stream;
    } catch (err: any) {
        if (err.name === 'NotAllowedError') {
            throw new Error('Camera permission denied. Please enable camera access in your device settings.');
        }
        if (err.name === 'NotFoundError') {
            throw new Error('No camera found on this device.');
        }
        throw new Error(`Camera error: ${err.message}`);
    }
}

/**
 * Stop all tracks in a media stream (cleanup helper).
 */
export function stopCamera(stream: MediaStream | null): void {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
}

/**
 * Capture a still photo from a video element as a data URL.
 */
export function capturePhoto(
    videoElement: HTMLVideoElement,
    format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/jpeg',
    quality = 0.92
): string {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create canvas context');
    ctx.drawImage(videoElement, 0, 0);
    return canvas.toDataURL(format, quality);
}

// ─── 2. Geolocation API ─────────────────────────────────────────────────────

export interface GeolocationResult {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude: number | null;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

/**
 * Get the user's current geographic position.
 */
export function getCurrentPosition(
    options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
): Promise<GeolocationResult> {
    return new Promise((resolve, reject) => {
        if (!deviceSupport.geolocation) {
            return reject(new Error('Geolocation not supported on this device'));
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const result: GeolocationResult = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    altitude: position.coords.altitude,
                    heading: position.coords.heading,
                    speed: position.coords.speed,
                    timestamp: position.timestamp,
                };
                console.log('[Device] Geolocation acquired', result.latitude, result.longitude);
                resolve(result);
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        reject(new Error('Location permission denied. Enable location access in settings.'));
                        break;
                    case error.POSITION_UNAVAILABLE:
                        reject(new Error('Location information unavailable.'));
                        break;
                    case error.TIMEOUT:
                        reject(new Error('Location request timed out. Try again.'));
                        break;
                    default:
                        reject(new Error(`Geolocation error: ${error.message}`));
                }
            },
            options
        );
    });
}

/**
 * Watch the user's position continuously. Returns the watch ID for cleanup.
 */
export function watchPosition(
    callback: (position: GeolocationResult) => void,
    errorCallback?: (error: Error) => void,
    options: PositionOptions = { enableHighAccuracy: true, maximumAge: 5000 }
): number | null {
    if (!deviceSupport.geolocation) {
        errorCallback?.(new Error('Geolocation not supported'));
        return null;
    }

    return navigator.geolocation.watchPosition(
        (position) => {
            callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                altitude: position.coords.altitude,
                heading: position.coords.heading,
                speed: position.coords.speed,
                timestamp: position.timestamp,
            });
        },
        (error) => {
            errorCallback?.(new Error(error.message));
        },
        options
    );
}

/**
 * Stop watching position.
 */
export function clearPositionWatch(watchId: number | null): void {
    if (watchId !== null && deviceSupport.geolocation) {
        navigator.geolocation.clearWatch(watchId);
    }
}

// ─── 3. Clipboard API ───────────────────────────────────────────────────────

/**
 * Copy text to the clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    if (!deviceSupport.clipboard) {
        // Fallback for older browsers
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch {
            return false;
        }
    }

    try {
        await navigator.clipboard.writeText(text);
        console.log('[Device] Text copied to clipboard');
        return true;
    } catch (err) {
        console.error('[Device] Clipboard write failed:', err);
        return false;
    }
}

/**
 * Read text from the clipboard.
 */
export async function readFromClipboard(): Promise<string | null> {
    if (!deviceSupport.clipboard) return null;

    try {
        const text = await navigator.clipboard.readText();
        return text;
    } catch (err) {
        console.error('[Device] Clipboard read failed (permission denied?):', err);
        return null;
    }
}

/**
 * Copy an image blob to the clipboard.
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
    if (!deviceSupport.clipboard || !('ClipboardItem' in window)) return false;

    try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        console.log('[Device] Image copied to clipboard');
        return true;
    } catch (err) {
        console.error('[Device] Image clipboard write failed:', err);
        return false;
    }
}

// ─── 4. Device Orientation API ───────────────────────────────────────────────

export interface OrientationData {
    alpha: number | null;  // Compass direction (0-360)
    beta: number | null;   // Front-to-back tilt (-180 to 180)
    gamma: number | null;  // Left-to-right tilt (-90 to 90)
    absolute: boolean;
}

/**
 * Request permission for device orientation (required on iOS 13+).
 */
export async function requestOrientationPermission(): Promise<boolean> {
    if (!deviceSupport.orientation) return false;

    // iOS 13+ requires explicit permission request
    const DeviceOrientationEventTyped = DeviceOrientationEvent as any;
    if (typeof DeviceOrientationEventTyped.requestPermission === 'function') {
        try {
            const result = await DeviceOrientationEventTyped.requestPermission();
            return result === 'granted';
        } catch {
            return false;
        }
    }

    // Non-iOS: permission is automatic
    return true;
}

/**
 * Start listening for device orientation changes.
 * Returns a cleanup function to stop listening.
 */
export function watchOrientation(
    callback: (data: OrientationData) => void
): (() => void) | null {
    if (!deviceSupport.orientation) return null;

    const handler = (event: DeviceOrientationEvent) => {
        callback({
            alpha: event.alpha,
            beta: event.beta,
            gamma: event.gamma,
            absolute: event.absolute,
        });
    };

    window.addEventListener('deviceorientation', handler);
    return () => window.removeEventListener('deviceorientation', handler);
}

// ─── 5. Native Share API ─────────────────────────────────────────────────────

export interface ShareData {
    title?: string;
    text?: string;
    url?: string;
    files?: File[];
}

/**
 * Open the native OS share dialog.
 * Returns true if shared successfully, false if cancelled or unsupported.
 */
export async function nativeShare(data: ShareData): Promise<boolean> {
    if (!deviceSupport.share) {
        // Fallback: copy URL to clipboard
        if (data.url) {
            const copied = await copyToClipboard(data.url);
            if (copied) {
                console.log('[Device] Share fallback: URL copied to clipboard');
            }
            return copied;
        }
        return false;
    }

    try {
        // Validate file sharing support if files are included
        if (data.files && data.files.length > 0) {
            if (!(navigator as any).canShare?.({ files: data.files })) {
                // Files not shareable, fall back to share without files
                await navigator.share({ title: data.title, text: data.text, url: data.url });
                return true;
            }
        }

        await navigator.share(data as any);
        console.log('[Device] Content shared successfully');
        return true;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            console.log('[Device] Share cancelled by user');
            return false;
        }
        console.error('[Device] Share failed:', err);
        return false;
    }
}

/**
 * Share a specific property/project.
 */
export async function shareProject(project: {
    name: string;
    community?: string;
    city?: string;
    id: string;
}): Promise<boolean> {
    const url = `${window.location.origin}/?project=${project.id}`;
    const location = [project.community, project.city].filter(Boolean).join(', ');
    return nativeShare({
        title: `${project.name} — PSI Maps Pro`,
        text: `Check out ${project.name}${location ? ` in ${location}` : ''} on PSI Maps Pro`,
        url,
    });
}

/**
 * Share the current map view.
 */
export async function shareMapView(lat: number, lng: number, zoom: number): Promise<boolean> {
    const url = `${window.location.origin}/?lat=${lat}&lng=${lng}&z=${zoom}`;
    return nativeShare({
        title: 'PSI Maps Pro — Map View',
        text: 'Check out this location on PSI Maps Pro',
        url,
    });
}

// ─── 6. Wake Lock API ────────────────────────────────────────────────────────

let wakeLockSentinel: any = null;

/**
 * Request a screen wake lock to prevent the device from sleeping.
 * Useful during navigation, tours, or video playback.
 */
export async function requestWakeLock(): Promise<boolean> {
    if (!deviceSupport.wakeLock) {
        console.warn('[Device] Wake Lock API not supported');
        return false;
    }

    try {
        wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        console.log('[Device] Wake Lock acquired — screen will stay on');

        // Re-acquire lock if released due to visibility change
        wakeLockSentinel.addEventListener('release', () => {
            console.log('[Device] Wake Lock released');
            wakeLockSentinel = null;
        });

        // Re-acquire on page visibility recovery
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && !wakeLockSentinel) {
                try {
                    wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
                    console.log('[Device] Wake Lock re-acquired after visibility change');
                } catch {
                    // Silently fail — user may have navigated away
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return true;
    } catch (err: any) {
        console.warn('[Device] Wake Lock request failed:', err.message);
        return false;
    }
}

/**
 * Release the current wake lock.
 */
export async function releaseWakeLock(): Promise<void> {
    if (wakeLockSentinel) {
        try {
            await wakeLockSentinel.release();
            wakeLockSentinel = null;
            console.log('[Device] Wake Lock released manually');
        } catch {
            wakeLockSentinel = null;
        }
    }
}

/**
 * Check if a wake lock is currently active.
 */
export function isWakeLockActive(): boolean {
    return wakeLockSentinel !== null;
}

// ─── 7. Permission Helpers ───────────────────────────────────────────────────

export type PermissionName =
    | 'camera'
    | 'microphone'
    | 'geolocation'
    | 'notifications'
    | 'clipboard-read'
    | 'clipboard-write';

/**
 * Query the current status of a permission.
 */
export async function queryPermission(
    name: PermissionName
): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    if (!('permissions' in navigator)) return 'unknown';

    try {
        const status = await navigator.permissions.query({ name: name as any });
        return status.state as 'granted' | 'denied' | 'prompt';
    } catch {
        return 'unknown';
    }
}

/**
 * Get a summary of all device capabilities and their permission states.
 */
export async function getCapabilitiesSummary(): Promise<Record<string, { supported: boolean; permission?: string }>> {
    const summary: Record<string, { supported: boolean; permission?: string }> = {};

    for (const [key, supported] of Object.entries(deviceSupport)) {
        summary[key] = { supported };
    }

    // Query permissions for supported APIs
    if (deviceSupport.camera) {
        summary.camera.permission = await queryPermission('camera');
    }
    if (deviceSupport.geolocation) {
        summary.geolocation.permission = await queryPermission('geolocation');
    }
    if (deviceSupport.notifications) {
        summary.notifications.permission = Notification.permission;
    }

    return summary;
}
