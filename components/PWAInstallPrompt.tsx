// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — PWA Install Prompt
// Custom "Add to Home Screen" banner for iOS, Android & Desktop
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

function detectPlatform(): Platform {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);

    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    if (typeof window !== 'undefined') return 'desktop';
    return 'unknown';
}

function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://')
    );
}

const DISMISS_KEY = 'psi_maps_pwa_install_dismissed';
const DISMISS_EXPIRY_DAYS = 7;

function wasDismissedRecently(): boolean {
    try {
        const ts = localStorage.getItem(DISMISS_KEY);
        if (!ts) return false;
        const elapsed = Date.now() - parseInt(ts, 10);
        return elapsed < DISMISS_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    } catch {
        return false;
    }
}

function setDismissed(): void {
    try {
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch { }
}

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [platform, setPlatform] = useState<Platform>('unknown');
    const [isInstalled, setIsInstalled] = useState(false);
    const [installing, setInstalling] = useState(false);

    useEffect(() => {
        // Don't show if already installed as PWA
        if (isStandalone()) {
            setIsInstalled(true);
            return;
        }

        // Don't show if recently dismissed
        if (wasDismissedRecently()) return;

        const detected = detectPlatform();
        setPlatform(detected);

        // For iOS: show custom instructions (no beforeinstallprompt)
        if (detected === 'ios') {
            const timer = setTimeout(() => setShowBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        // For Android/Desktop: listen for beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            // Show banner after a short delay for better UX
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Track successful installs
        const installHandler = () => {
            setIsInstalled(true);
            setShowBanner(false);
            console.log('[PWA] App installed successfully');
        };
        window.addEventListener('appinstalled', installHandler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            window.removeEventListener('appinstalled', installHandler);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return;
        setInstalling(true);

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === 'accepted') {
                setIsInstalled(true);
                console.log('[PWA] Install accepted');
            } else {
                console.log('[PWA] Install dismissed');
            }
        } catch (err) {
            console.error('[PWA] Install error:', err);
        } finally {
            setDeferredPrompt(null);
            setInstalling(false);
            setShowBanner(false);
        }
    }, [deferredPrompt]);

    const handleDismiss = useCallback(() => {
        setShowBanner(false);
        setDismissed();
    }, []);

    // Don't render if installed, not showing, or conditions not met
    if (isInstalled || !showBanner) return null;

    return (
        <div
            id="pwa-install-banner"
            style={{
                position: 'fixed',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10000,
                width: 'calc(100% - 32px)',
                maxWidth: '420px',
                animation: 'pwaSlideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
        >
            <div
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss install banner"
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '4px',
                        lineHeight: 1,
                    }}
                >
                    ✕
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* App Icon */}
                    <div
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        }}
                    >
                        <img
                            src="/icons/icon-96x96.png"
                            alt="PSI Maps"
                            width={52}
                            height={52}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                            style={{
                                margin: '0 0 2px 0',
                                color: '#f8fafc',
                                fontSize: '15px',
                                fontWeight: 700,
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                            }}
                        >
                            Install PSI Maps Pro
                        </h3>
                        <p
                            style={{
                                margin: 0,
                                color: '#94a3b8',
                                fontSize: '12.5px',
                                lineHeight: 1.4,
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                            }}
                        >
                            {platform === 'ios'
                                ? 'Add to Home Screen for the full app experience'
                                : 'Install for instant access & offline maps'}
                        </p>
                    </div>
                </div>

                {/* Install Action */}
                <div style={{ marginTop: '14px' }}>
                    {platform === 'ios' ? (
                        // iOS: Show manual instructions
                        <div
                            style={{
                                background: 'rgba(37, 99, 235, 0.1)',
                                borderRadius: '10px',
                                padding: '12px 14px',
                                border: '1px solid rgba(37, 99, 235, 0.2)',
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    color: '#93c5fd',
                                    fontSize: '12.5px',
                                    lineHeight: 1.6,
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                }}
                            >
                                Tap{' '}
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        background: 'rgba(255,255,255,0.12)',
                                        borderRadius: '4px',
                                        padding: '1px 6px',
                                        fontSize: '16px',
                                    }}
                                >
                                    ⬆
                                </span>{' '}
                                then <strong style={{ color: '#e2e8f0' }}>"Add to Home Screen"</strong>
                            </p>
                        </div>
                    ) : (
                        // Android / Desktop: Show install button
                        <button
                            id="pwa-install-button"
                            onClick={handleInstall}
                            disabled={installing || !deferredPrompt}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: 'none',
                                borderRadius: '10px',
                                background: installing
                                    ? '#1e40af'
                                    : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: 600,
                                cursor: installing ? 'wait' : 'pointer',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                transition: 'all 0.2s ease',
                                opacity: installing ? 0.8 : 1,
                                letterSpacing: '0.3px',
                            }}
                        >
                            {installing ? '⏳ Installing…' : '📲 Install App'}
                        </button>
                    )}
                </div>
            </div>

            {/* Keyframe animation injected inline */}
            <style>{`
        @keyframes pwaSlideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
        </div>
    );
}
