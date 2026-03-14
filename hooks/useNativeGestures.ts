/**
 * ─── Native Gesture Handler ─────────────────────────────────────────────────
 * Provides native-like gesture interactions:
 *  • Swipe left/right to navigate between screens
 *  • Pull-to-refresh with visual indicator
 *  • Edge swipe (from left edge = back navigation)
 *  • Smooth inertia-based gesture tracking
 *
 * Designed for touch-first PWA interactions.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import haptic from '../utils/haptics';

interface GestureConfig {
    /** Callback for swipe-left (e.g. navigate forward) */
    onSwipeLeft?: () => void;
    /** Callback for swipe-right (e.g. navigate back) */
    onSwipeRight?: () => void;
    /** Callback for pull-to-refresh */
    onPullRefresh?: () => void;
    /** Callback when edge-swiping from left (iOS back gesture) */
    onEdgeSwipeBack?: () => void;
    /** Minimum swipe distance in px to trigger action (default: 80) */
    threshold?: number;
    /** Edge zone width in px for edge-swipe detection (default: 24) */
    edgeZone?: number;
    /** Enable/disable the hook (default: true) */
    enabled?: boolean;
}

interface GestureState {
    /** Whether a pull-to-refresh is currently active/animating */
    isPulling: boolean;
    /** Current pull distance (0 to ~150px) */
    pullDistance: number;
    /** Whether a horizontal swipe gesture is in progress */
    isSwiping: boolean;
    /** Current swipe delta (negative = left, positive = right) */
    swipeDelta: number;
    /** Whether the touch started in the edge zone */
    isEdgeSwipe: boolean;
}

export function useNativeGestures(
    ref: React.RefObject<HTMLElement | null>,
    config: GestureConfig = {}
): GestureState {
    const {
        onSwipeLeft,
        onSwipeRight,
        onPullRefresh,
        onEdgeSwipeBack,
        threshold = 80,
        edgeZone = 24,
        enabled = true,
    } = config;

    const [state, setState] = useState<GestureState>({
        isPulling: false,
        pullDistance: 0,
        isSwiping: false,
        swipeDelta: 0,
        isEdgeSwipe: false,
    });

    // Touch tracking refs (avoid re-renders during gesture)
    const startX = useRef(0);
    const startY = useRef(0);
    const currentX = useRef(0);
    const currentY = useRef(0);
    const isTracking = useRef(false);
    const gestureAxis = useRef<'none' | 'horizontal' | 'vertical'>('none');
    const isEdge = useRef(false);
    const startTime = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!enabled) return;
        const touch = e.touches[0];
        startX.current = touch.clientX;
        startY.current = touch.clientY;
        currentX.current = touch.clientX;
        currentY.current = touch.clientY;
        isTracking.current = true;
        gestureAxis.current = 'none';
        startTime.current = Date.now();

        // Detect edge swipe (touch starts within edgeZone from left edge)
        isEdge.current = touch.clientX <= edgeZone;

        setState(prev => ({ ...prev, isEdgeSwipe: isEdge.current }));
    }, [enabled, edgeZone]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isTracking.current || !enabled) return;

        const touch = e.touches[0];
        const dx = touch.clientX - startX.current;
        const dy = touch.clientY - startY.current;
        currentX.current = touch.clientX;
        currentY.current = touch.clientY;

        // Lock axis on first significant movement
        if (gestureAxis.current === 'none') {
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);
            if (absDx < 10 && absDy < 10) return; // Dead zone

            gestureAxis.current = absDx > absDy ? 'horizontal' : 'vertical';
        }

        if (gestureAxis.current === 'horizontal') {
            // Prevent vertical scroll during horizontal swipe
            e.preventDefault();

            // Apply rubber-band resistance past threshold
            const resistance = Math.abs(dx) > threshold ? 0.3 : 1;
            const clampedDelta = dx * resistance;

            setState(prev => ({
                ...prev,
                isSwiping: true,
                swipeDelta: clampedDelta,
            }));
        }

        if (gestureAxis.current === 'vertical' && dy > 0) {
            // Pull-to-refresh: only when at scroll top
            const el = ref.current;
            const scrollTop = el ? el.scrollTop : 0;

            if (scrollTop <= 0 && onPullRefresh) {
                e.preventDefault();
                // Apply elastic resistance
                const pull = Math.min(dy * 0.5, 150);
                setState(prev => ({
                    ...prev,
                    isPulling: true,
                    pullDistance: pull,
                }));
            }
        }
    }, [enabled, threshold, onPullRefresh, ref]);

    const handleTouchEnd = useCallback(() => {
        if (!isTracking.current || !enabled) return;
        isTracking.current = false;

        const dx = currentX.current - startX.current;
        const dy = currentY.current - startY.current;
        const elapsed = Date.now() - startTime.current;

        // Calculate velocity for inertia (px/ms)
        const velocityX = Math.abs(dx) / Math.max(elapsed, 1);

        if (gestureAxis.current === 'horizontal') {
            // Trigger swipe if distance OR velocity is sufficient
            const isSwipeTriggered = Math.abs(dx) > threshold || velocityX > 0.5;

            if (isSwipeTriggered) {
                if (dx < 0 && onSwipeLeft) {
                    haptic.nav();
                    onSwipeLeft();
                } else if (dx > 0) {
                    if (isEdge.current && onEdgeSwipeBack) {
                        haptic.nav();
                        onEdgeSwipeBack();
                    } else if (onSwipeRight) {
                        haptic.nav();
                        onSwipeRight();
                    }
                }
            }
        }

        if (gestureAxis.current === 'vertical' && state.isPulling) {
            if (state.pullDistance > 60 && onPullRefresh) {
                haptic.success();
                onPullRefresh();
            }
        }

        // Reset all gesture state with a brief delay for animation
        requestAnimationFrame(() => {
            setState({
                isPulling: false,
                pullDistance: 0,
                isSwiping: false,
                swipeDelta: 0,
                isEdgeSwipe: false,
            });
        });

        gestureAxis.current = 'none';
        isEdge.current = false;
    }, [enabled, threshold, state.isPulling, state.pullDistance, onSwipeLeft, onSwipeRight, onPullRefresh, onEdgeSwipeBack]);

    useEffect(() => {
        const el = ref.current;
        if (!el || !enabled) return;

        const opts: AddEventListenerOptions = { passive: false };

        el.addEventListener('touchstart', handleTouchStart, { passive: true });
        el.addEventListener('touchmove', handleTouchMove, opts);
        el.addEventListener('touchend', handleTouchEnd, { passive: true });
        el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener('touchstart', handleTouchStart);
            el.removeEventListener('touchmove', handleTouchMove);
            el.removeEventListener('touchend', handleTouchEnd);
            el.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [ref, enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

    return state;
}

export default useNativeGestures;
