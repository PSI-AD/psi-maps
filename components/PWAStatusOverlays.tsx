// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — PWA Status Overlays
// Offline banner, update prompt, connection quality indicator, deep link toast
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Wifi, WifiOff, RefreshCw, Download, X, CloudOff, CheckCircle2,
    Signal, SignalLow, SignalMedium, AlertTriangle,
} from 'lucide-react';
import { getConnectionQuality, type ConnectionQuality } from '../utils/networkResilience';
import { skipWaiting } from '../utils/swRegistration';
import haptic from '../utils/haptics';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. OFFLINE BANNER — Slides in from top when connection drops
// ═══════════════════════════════════════════════════════════════════════════════

export const OfflineBanner: React.FC = () => {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [wasOffline, setWasOffline] = useState(false);
    const [showRestored, setShowRestored] = useState(false);

    useEffect(() => {
        const goOffline = () => {
            setIsOffline(true);
            setWasOffline(true);
            haptic.error();
        };

        const goOnline = () => {
            setIsOffline(false);
            if (wasOffline) {
                setShowRestored(true);
                haptic.success();
                // Auto-dismiss "connection restored" after 3s
                setTimeout(() => setShowRestored(false), 3000);
            }
        };

        window.addEventListener('offline', goOffline);
        window.addEventListener('online', goOnline);

        return () => {
            window.removeEventListener('offline', goOffline);
            window.removeEventListener('online', goOnline);
        };
    }, [wasOffline]);

    // Nothing to show
    if (!isOffline && !showRestored) return null;

    return (
        <div
            className={`
        fixed top-0 left-0 right-0 z-[15000] px-4
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isOffline || showRestored ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
            style={{ paddingTop: 'max(env(safe-area-inset-top, 8px), 8px)' }}
        >
            {isOffline ? (
                /* ── Offline State ── */
                <div className="bg-amber-600 text-white rounded-2xl shadow-2xl shadow-amber-900/40 px-4 py-3 flex items-center gap-3 max-w-lg mx-auto backdrop-blur-xl">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <WifiOff className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight">You're Offline</p>
                        <p className="text-[11px] text-white/80 leading-tight mt-0.5">
                            Viewing cached data — some features may be limited
                        </p>
                    </div>
                    <CloudOff className="w-4 h-4 text-white/60 shrink-0" />
                </div>
            ) : showRestored ? (
                /* ── Connection Restored State ── */
                <div className="bg-emerald-600 text-white rounded-2xl shadow-2xl shadow-emerald-900/40 px-4 py-3 flex items-center gap-3 max-w-lg mx-auto backdrop-blur-xl">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <Wifi className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold leading-tight">Back Online</p>
                        <p className="text-[11px] text-white/80 leading-tight mt-0.5">
                            Connection restored — syncing latest data
                        </p>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-white/60 shrink-0" />
                </div>
            ) : null}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. APP UPDATE PROMPT — Non-intrusive bottom toast when new version detected
// ═══════════════════════════════════════════════════════════════════════════════

export const AppUpdatePrompt: React.FC = () => {
    const [showUpdate, setShowUpdate] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            setShowUpdate(true);
            haptic.tap();
        };

        // Listen for update event dispatched from index.tsx
        window.addEventListener('psi-sw-update-available', handler);
        return () => window.removeEventListener('psi-sw-update-available', handler);
    }, []);

    const handleUpdate = useCallback(() => {
        setIsUpdating(true);
        haptic.success();

        // Tell the waiting SW to take over
        skipWaiting();

        // Reload after a brief delay to let SW activate
        setTimeout(() => {
            window.location.reload();
        }, 800);
    }, []);

    const handleDismiss = useCallback(() => {
        setShowUpdate(false);
    }, []);

    if (!showUpdate) return null;

    return (
        <div
            className={`
        fixed bottom-24 left-4 right-4 z-[15000]
        transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${showUpdate ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      `}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-black/50 px-4 py-3.5 flex items-center gap-3 max-w-lg mx-auto border border-slate-700/50">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">Update Available</p>
                    <p className="text-[11px] text-white/60 leading-tight mt-0.5">
                        A new version of PSI Maps is ready
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDismiss}
                        className="p-1.5 text-white/40 hover:text-white/70 transition-colors rounded-lg"
                        aria-label="Dismiss update"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={isUpdating}
                        className={`
              px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider
              transition-all
              ${isUpdating
                                ? 'bg-blue-500/50 text-white/60 cursor-wait'
                                : 'bg-blue-500 text-white hover:bg-blue-400 active:scale-95 shadow-lg shadow-blue-500/30'
                            }
            `}
                    >
                        {isUpdating ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            'Update'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CONNECTION QUALITY INDICATOR — Subtle indicator in corner
// ═══════════════════════════════════════════════════════════════════════════════

export const ConnectionIndicator: React.FC = () => {
    const [quality, setQuality] = useState<ConnectionQuality>('good');
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const check = () => {
            const q = getConnectionQuality();
            setQuality(q);
            // Only show indicator when connection is poor or offline
            setVisible(q === 'poor' || q === 'offline');
        };

        check();

        window.addEventListener('online', check);
        window.addEventListener('offline', check);
        const conn = (navigator as any).connection;
        if (conn) conn.addEventListener('change', check);

        return () => {
            window.removeEventListener('online', check);
            window.removeEventListener('offline', check);
            if (conn) conn.removeEventListener('change', check);
        };
    }, []);

    if (!visible) return null;

    const icon = quality === 'offline' ? (
        <WifiOff className="w-3 h-3" />
    ) : quality === 'poor' ? (
        <SignalLow className="w-3 h-3" />
    ) : null;

    const color = quality === 'offline' ? 'bg-red-500' : 'bg-amber-500';

    return (
        <div
            className={`
        fixed top-20 right-3 z-[14000]
        ${color} text-white rounded-full
        w-7 h-7 flex items-center justify-center
        shadow-lg animate-pulse
      `}
            title={`Connection: ${quality}`}
        >
            {icon}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4. NETWORK ERROR TOAST — Shown when an API request fails
// ═══════════════════════════════════════════════════════════════════════════════

interface NetworkToast {
    id: string;
    message: string;
    type: 'error' | 'warning' | 'retry';
    timestamp: number;
}

export const NetworkErrorToasts: React.FC = () => {
    const [toasts, setToasts] = useState<NetworkToast[]>([]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            const toast: NetworkToast = {
                id: `toast-${Date.now()}`,
                message: detail?.message || 'Network request failed',
                type: detail?.type || 'error',
                timestamp: Date.now(),
            };

            setToasts(prev => [...prev.slice(-2), toast]); // Max 3 toasts

            // Auto-dismiss after 4s
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 4000);
        };

        window.addEventListener('psi-network-error', handler);
        return () => window.removeEventListener('psi-network-error', handler);
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-28 left-4 right-4 z-[13000] flex flex-col gap-2 max-w-lg mx-auto pointer-events-none">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`
            px-4 py-3 rounded-xl shadow-xl flex items-center gap-3
            pointer-events-auto animate-in slide-in-from-bottom-4 duration-300
            ${toast.type === 'error'
                            ? 'bg-red-50 border border-red-200 text-red-800'
                            : toast.type === 'warning'
                                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                                : 'bg-blue-50 border border-blue-200 text-blue-800'
                        }
          `}
                >
                    {toast.type === 'error' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : toast.type === 'retry' ? (
                        <RefreshCw className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <p className="text-xs font-medium flex-1">{toast.message}</p>
                    <button
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        className="p-1 hover:bg-black/5 rounded-full transition-colors shrink-0"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DEEP LINK HANDLER — Shows brief toast when navigating via deep link
// ═══════════════════════════════════════════════════════════════════════════════

export const DeepLinkToast: React.FC = () => {
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.projectId) {
                setMessage('Opening project…');
                setTimeout(() => setMessage(null), 2000);
            }
        };

        // Listen for deep links from shortcuts and notifications
        window.addEventListener('psi-deep-link', handler);

        // Also check URL on mount
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        if (action) {
            const labels: Record<string, string> = {
                search: 'Opening Search…',
                favorites: 'Opening Favorites…',
                chat: 'Opening AI Assistant…',
                map: 'Opening Map…',
            };
            setMessage(labels[action] || 'Loading…');
            setTimeout(() => setMessage(null), 2000);
        }

        return () => window.removeEventListener('psi-deep-link', handler);
    }, []);

    if (!message) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[15000] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-slate-900/90 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl backdrop-blur-md border border-white/10">
                {message}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 6. COMBINED OVERLAY — Single component to add all status overlays
// ═══════════════════════════════════════════════════════════════════════════════

export const PWAStatusOverlays: React.FC = () => (
    <>
        <OfflineBanner />
        <AppUpdatePrompt />
        <ConnectionIndicator />
        <NetworkErrorToasts />
        <DeepLinkToast />
    </>
);

export default PWAStatusOverlays;
