// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — useDeviceCapabilities Hook
// React hook exposing native device APIs with reactive permission tracking
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    deviceSupport,
    getCurrentPosition,
    watchPosition,
    clearPositionWatch,
    copyToClipboard,
    nativeShare,
    shareProject,
    shareMapView,
    requestWakeLock,
    releaseWakeLock,
    isWakeLockActive,
    requestOrientationPermission,
    watchOrientation,
    type GeolocationResult,
    type OrientationData,
} from '../utils/deviceCapabilities';
import {
    getNotificationPermission,
    requestNotificationPermission,
    subscribeToPush,
    isPushSupported,
    showLocalNotification,
    type NotificationPermission,
    type PushNotificationPayload,
} from '../utils/pushNotifications';
import { initSyncEngine, queueSyncAction, getPendingCount, type SyncActionType } from '../utils/backgroundSync';
import haptic from '../utils/haptics';

interface DeviceCapabilities {
    // ── Feature Support Flags ──────────────────────────────────────────────
    support: typeof deviceSupport;

    // ── Geolocation ────────────────────────────────────────────────────────
    location: GeolocationResult | null;
    locationLoading: boolean;
    locationError: string | null;
    getLocation: () => Promise<GeolocationResult | null>;
    startWatchingLocation: () => void;
    stopWatchingLocation: () => void;

    // ── Notifications ──────────────────────────────────────────────────────
    notificationPermission: NotificationPermission;
    requestNotifications: () => Promise<boolean>;
    showNotification: (payload: PushNotificationPayload) => Promise<boolean>;

    // ── Clipboard ──────────────────────────────────────────────────────────
    copyText: (text: string) => Promise<boolean>;

    // ── Share ──────────────────────────────────────────────────────────────
    share: (data: { title?: string; text?: string; url?: string }) => Promise<boolean>;
    shareProperty: (project: { name: string; community?: string; city?: string; id: string }) => Promise<boolean>;
    shareMap: (lat: number, lng: number, zoom: number) => Promise<boolean>;

    // ── Wake Lock ──────────────────────────────────────────────────────────
    wakeLockActive: boolean;
    requestLock: () => Promise<boolean>;
    releaseLock: () => Promise<void>;

    // ── Orientation ────────────────────────────────────────────────────────
    orientation: OrientationData | null;
    startOrientation: () => Promise<boolean>;
    stopOrientation: () => void;

    // ── Background Sync ────────────────────────────────────────────────────
    pendingSyncCount: number;
    queueAction: (type: SyncActionType, payload: Record<string, any>) => Promise<string>;
    isOnline: boolean;
}

export function useDeviceCapabilities(): DeviceCapabilities {
    // ── Geolocation State ──────────────────────────────────────────────────
    const [location, setLocation] = useState<GeolocationResult | null>(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);
    const watchIdRef = useRef<number | null>(null);

    // ── Notification State ─────────────────────────────────────────────────
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window
            ? (Notification.permission as NotificationPermission)
            : 'denied'
    );

    // ── Wake Lock State ────────────────────────────────────────────────────
    const [wakeLockActive, setWakeLockActive] = useState(false);

    // ── Orientation State ──────────────────────────────────────────────────
    const [orientation, setOrientation] = useState<OrientationData | null>(null);
    const orientationCleanupRef = useRef<(() => void) | null>(null);

    // ── Online/Offline State ───────────────────────────────────────────────
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);

    // ── Initialize sync engine & online listeners ──────────────────────────
    useEffect(() => {
        initSyncEngine();

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Update pending count
        getPendingCount().then(setPendingSyncCount).catch(() => { });

        // Listen for sync completions
        const syncHandler = () => {
            getPendingCount().then(setPendingSyncCount).catch(() => { });
        };
        window.addEventListener('psi-sync-complete', syncHandler);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('psi-sync-complete', syncHandler);
        };
    }, []);

    // ── Cleanup on unmount ─────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                clearPositionWatch(watchIdRef.current);
            }
            orientationCleanupRef.current?.();
        };
    }, []);

    // ── Geolocation Methods ────────────────────────────────────────────────
    const getLocation = useCallback(async (): Promise<GeolocationResult | null> => {
        setLocationLoading(true);
        setLocationError(null);
        try {
            const pos = await getCurrentPosition();
            setLocation(pos);
            haptic.success();
            return pos;
        } catch (err: any) {
            setLocationError(err.message);
            haptic.error();
            return null;
        } finally {
            setLocationLoading(false);
        }
    }, []);

    const startWatchingLocation = useCallback(() => {
        if (watchIdRef.current !== null) return; // Already watching
        const id = watchPosition(
            (pos) => setLocation(pos),
            (err) => setLocationError(err.message)
        );
        watchIdRef.current = id;
    }, []);

    const stopWatchingLocation = useCallback(() => {
        clearPositionWatch(watchIdRef.current);
        watchIdRef.current = null;
    }, []);

    // ── Notification Methods ───────────────────────────────────────────────
    const requestNotifications = useCallback(async (): Promise<boolean> => {
        const perm = await requestNotificationPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
            haptic.success();
            // Auto-subscribe to push if possible
            await subscribeToPush();
            return true;
        }
        return false;
    }, []);

    const showNotificationWrapped = useCallback(
        async (payload: PushNotificationPayload): Promise<boolean> => {
            return showLocalNotification(payload);
        },
        []
    );

    // ── Clipboard Methods ──────────────────────────────────────────────────
    const copyText = useCallback(async (text: string): Promise<boolean> => {
        const success = await copyToClipboard(text);
        if (success) {
            haptic.success();
        }
        return success;
    }, []);

    // ── Share Methods ──────────────────────────────────────────────────────
    const share = useCallback(
        async (data: { title?: string; text?: string; url?: string }): Promise<boolean> => {
            haptic.tap();
            return nativeShare(data);
        },
        []
    );

    const sharePropertyWrapped = useCallback(
        async (project: { name: string; community?: string; city?: string; id: string }): Promise<boolean> => {
            haptic.tap();
            return shareProject(project);
        },
        []
    );

    const shareMapWrapped = useCallback(
        async (lat: number, lng: number, zoom: number): Promise<boolean> => {
            haptic.tap();
            return shareMapView(lat, lng, zoom);
        },
        []
    );

    // ── Wake Lock Methods ──────────────────────────────────────────────────
    const requestLock = useCallback(async (): Promise<boolean> => {
        const success = await requestWakeLock();
        setWakeLockActive(success);
        return success;
    }, []);

    const releaseLock = useCallback(async (): Promise<void> => {
        await releaseWakeLock();
        setWakeLockActive(false);
    }, []);

    // ── Orientation Methods ────────────────────────────────────────────────
    const startOrientation = useCallback(async (): Promise<boolean> => {
        const granted = await requestOrientationPermission();
        if (!granted) return false;

        const cleanup = watchOrientation((data) => setOrientation(data));
        orientationCleanupRef.current = cleanup;
        return true;
    }, []);

    const stopOrientation = useCallback(() => {
        orientationCleanupRef.current?.();
        orientationCleanupRef.current = null;
        setOrientation(null);
    }, []);

    // ── Background Sync Methods ────────────────────────────────────────────
    const queueAction = useCallback(
        async (type: SyncActionType, payload: Record<string, any>): Promise<string> => {
            const id = await queueSyncAction(type, payload);
            // Update pending count
            const count = await getPendingCount();
            setPendingSyncCount(count);
            return id;
        },
        []
    );

    return {
        support: deviceSupport,
        location,
        locationLoading,
        locationError,
        getLocation,
        startWatchingLocation,
        stopWatchingLocation,
        notificationPermission,
        requestNotifications,
        showNotification: showNotificationWrapped,
        copyText,
        share,
        shareProperty: sharePropertyWrapped,
        shareMap: shareMapWrapped,
        wakeLockActive,
        requestLock,
        releaseLock,
        orientation,
        startOrientation,
        stopOrientation,
        pendingSyncCount,
        queueAction,
        isOnline,
    };
}

export default useDeviceCapabilities;
