/**
 * ─── Haptic Feedback Engine ──────────────────────────────────────────────────
 * Provides native-style vibration feedback using Capacitor Haptics.
 * Falls back to the Web Vibration API for PWA / desktop where applicable.
 *
 * Usage:
 *   haptic.tap()       — light button tap
 *   haptic.nav()       — navigation action (swipe, page change)
 *   haptic.success()   — success confirmation
 *   haptic.error()     — error / warning shake
 *   haptic.heavy()     — heavy impact (long press, drag end)
 *   haptic.selection() — ultra-light selection change
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const canVibrateWeb = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const vibrateWeb = (pattern: number | number[]) => {
    if (canVibrateWeb) {
        try {
            navigator.vibrate(pattern);
        } catch {
            // Silently fail if blocked by browser policy
        }
    }
};

export const haptic = {
    /** Light tap — 10ms impulse */
    tap: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Light });
        } else {
            vibrateWeb(10);
        }
    },

    /** Navigation — slightly longer bump */
    nav: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Medium });
        } else {
            vibrateWeb(15);
        }
    },

    /** Success — double-pulse celebration pattern */
    success: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.notification({ type: NotificationType.Success });
        } else {
            vibrateWeb([10, 50, 10]);
        }
    },

    /** Error — sharp triple-pulse warning */
    error: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.notification({ type: NotificationType.Error });
        } else {
            vibrateWeb([30, 50, 30, 50, 30]);
        }
    },

    /** Heavy impact — 25ms single thud */
    heavy: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.impact({ style: ImpactStyle.Heavy });
        } else {
            vibrateWeb(25);
        }
    },

    /** Ultra-light selection tick */
    selection: async () => {
        if (Capacitor.isNativePlatform()) {
            await Haptics.selectionChanged();
        } else {
            vibrateWeb(5);
        }
    },

    /** Cancel active vibration */
    cancel: async () => {
        if (!Capacitor.isNativePlatform()) {
            vibrateWeb(0);
        }
    },
};

export default haptic;
