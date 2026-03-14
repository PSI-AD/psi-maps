/**
 * ─── Haptic Feedback Engine ──────────────────────────────────────────────────
 * Provides native-style vibration feedback using the Web Vibration API.
 * Falls back silently on devices that don't support it (desktop, older iOS).
 *
 * Usage:
 *   haptic.tap()       — light button tap
 *   haptic.nav()       — navigation action (swipe, page change)
 *   haptic.success()   — success confirmation
 *   haptic.error()     — error / warning shake
 *   haptic.heavy()     — heavy impact (long press, drag end)
 *   haptic.selection() — ultra-light selection change
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

const vibrate = (pattern: number | number[]) => {
    if (canVibrate) {
        try {
            navigator.vibrate(pattern);
        } catch {
            // Silently fail — some browsers block vibrate in certain contexts
        }
    }
};

export const haptic = {
    /** Light tap — 10ms impulse */
    tap: () => vibrate(10),

    /** Navigation — slightly longer 15ms buzz */
    nav: () => vibrate(15),

    /** Success — double-pulse celebration pattern */
    success: () => vibrate([10, 50, 10]),

    /** Error — sharp triple-pulse warning */
    error: () => vibrate([30, 50, 30, 50, 30]),

    /** Heavy impact — 25ms single thud */
    heavy: () => vibrate(25),

    /** Ultra-light selection tick */
    selection: () => vibrate(5),

    /** Cancel active vibration */
    cancel: () => vibrate(0),
};

export default haptic;
