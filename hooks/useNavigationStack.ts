// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Native Navigation Stack
// iOS/Android-style navigation stack with history, scroll preservation,
// GPU-accelerated transitions, and swipe-back support
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import haptic from '../utils/haptics';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Screen identifiers — each represents a navigable view in the app */
export type ScreenId =
    | 'map'
    | 'project'
    | 'admin'
    | 'favorites'
    | 'compare'
    | 'chat'
    | 'nearby'
    | 'list'
    | 'settings'
    | 'street-view'
    | 'ar';

export type TransitionDirection = 'forward' | 'back' | 'none';

export interface NavEntry {
    /** Screen identifier */
    screen: ScreenId;
    /** Arbitrary data associated with this screen (e.g. projectId) */
    params: Record<string, any>;
    /** Preserved scroll position (restored on back-navigation) */
    scrollY: number;
    /** Preserved scroll positions for nested scrollable containers */
    scrollPositions: Map<string, number>;
    /** Timestamp when this entry was pushed */
    timestamp: number;
}

export interface NavigationState {
    /** Current navigation stack */
    stack: NavEntry[];
    /** Current (top) screen */
    current: NavEntry;
    /** Direction of the last transition */
    direction: TransitionDirection;
    /** Whether a transition animation is in progress */
    isTransitioning: boolean;
    /** Whether back navigation is possible */
    canGoBack: boolean;
    /** Stack depth (1+ ) */
    depth: number;
}

export interface NavigationActions {
    /** Push a new screen onto the stack (forward navigation) */
    push: (screen: ScreenId, params?: Record<string, any>) => void;
    /** Pop the top screen and return to the previous one (back navigation) */
    pop: () => NavEntry | null;
    /** Replace the current screen without animation */
    replace: (screen: ScreenId, params?: Record<string, any>) => void;
    /** Pop all the way back to a specific screen */
    popTo: (screen: ScreenId) => void;
    /** Reset the stack to just the root screen */
    reset: (screen?: ScreenId, params?: Record<string, any>) => void;
    /** Save the scroll position for the current screen */
    saveScroll: (scrollY?: number, containerId?: string) => void;
    /** Get the transition direction for animation */
    getDirection: () => TransitionDirection;
    /** Check if a specific screen is in the stack */
    isInStack: (screen: ScreenId) => boolean;
    /** Get params for a specific screen in the stack */
    getParams: (screen: ScreenId) => Record<string, any> | null;
    /** Get the previous screen (one below current) */
    getPrevious: () => NavEntry | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_STACK_DEPTH = 10;
const TRANSITION_DURATION = 350; // ms — matches iOS native

/** Persist nav stack key */
const NAV_STACK_KEY = 'psi-nav-stack';

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNavigationStack(
    initialScreen: ScreenId = 'map',
    initialParams: Record<string, any> = {}
): [NavigationState, NavigationActions] {

    // ── Core stack stored in ref for zero-render updates during animations ──
    const stackRef = useRef<NavEntry[]>([
        createEntry(initialScreen, initialParams),
    ]);

    // ── React state for rendering ──
    const [renderState, setRenderState] = useState<{
        stack: NavEntry[];
        direction: TransitionDirection;
        isTransitioning: boolean;
    }>({
        stack: stackRef.current,
        direction: 'none',
        isTransitioning: false,
    });

    const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Restore from session (optional — restores last screen on tab reopen) ──
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(NAV_STACK_KEY);
            if (saved) {
                const parsed = JSON.parse(saved) as NavEntry[];
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Rehydrate with Maps (lost during JSON serialization)
                    const rehydrated = parsed.map(e => ({
                        ...e,
                        scrollPositions: new Map(Object.entries(e.scrollPositions || {})),
                    }));
                    stackRef.current = rehydrated;
                    setRenderState(prev => ({ ...prev, stack: rehydrated, direction: 'none' }));
                }
            }
        } catch { }
    }, []);

    // ── Persist stack on every change ──
    const persistStack = useCallback(() => {
        try {
            // Convert Maps to objects for JSON serialization
            const serializable = stackRef.current.map(e => ({
                ...e,
                scrollPositions: Object.fromEntries(e.scrollPositions),
            }));
            sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(serializable));
        } catch { }
    }, []);

    // ── Start transition animation ──
    const startTransition = useCallback((direction: TransitionDirection) => {
        if (transitionTimer.current) clearTimeout(transitionTimer.current);

        setRenderState({
            stack: [...stackRef.current],
            direction,
            isTransitioning: true,
        });

        transitionTimer.current = setTimeout(() => {
            setRenderState(prev => ({ ...prev, isTransitioning: false }));
        }, TRANSITION_DURATION);
    }, []);

    // ── Capture scroll position of current screen ──
    const captureCurrentScroll = useCallback(() => {
        const current = stackRef.current[stackRef.current.length - 1];
        if (current) {
            current.scrollY = window.scrollY;

            // Also capture scroll positions of any scrollable containers
            document.querySelectorAll('[data-nav-scroll]').forEach(el => {
                const id = el.getAttribute('data-nav-scroll');
                if (id) {
                    current.scrollPositions.set(id, (el as HTMLElement).scrollTop);
                }
            });
        }
    }, []);

    // ── Restore scroll position after navigation ──
    const restoreScroll = useCallback((entry: NavEntry) => {
        requestAnimationFrame(() => {
            // Restore window scroll
            window.scrollTo(0, entry.scrollY);

            // Restore nested scrollable containers
            entry.scrollPositions.forEach((scrollTop, id) => {
                const el = document.querySelector(`[data-nav-scroll="${id}"]`);
                if (el) {
                    (el as HTMLElement).scrollTop = scrollTop;
                }
            });
        });
    }, []);

    // ── PUSH: Forward navigation ──
    const push = useCallback((screen: ScreenId, params: Record<string, any> = {}) => {
        // Save current scroll before navigating away
        captureCurrentScroll();

        // Prevent duplicate pushes
        const top = stackRef.current[stackRef.current.length - 1];
        if (top.screen === screen && JSON.stringify(top.params) === JSON.stringify(params)) {
            return; // Already on this screen with same params
        }

        // Create new entry
        const entry = createEntry(screen, params);
        stackRef.current = [...stackRef.current, entry];

        // Trim stack if too deep
        if (stackRef.current.length > MAX_STACK_DEPTH) {
            stackRef.current = stackRef.current.slice(-MAX_STACK_DEPTH);
        }

        haptic.nav();
        startTransition('forward');
        persistStack();

        // Update URL for deep linking (no reload)
        updateURL(screen, params);
    }, [captureCurrentScroll, startTransition, persistStack]);

    // ── POP: Back navigation ──
    const pop = useCallback((): NavEntry | null => {
        if (stackRef.current.length <= 1) return null; // Can't pop root

        // Remove current screen
        const popped = stackRef.current.pop()!;
        stackRef.current = [...stackRef.current];

        haptic.nav();
        startTransition('back');
        persistStack();

        // Restore scroll of the screen we're returning to
        const returnTo = stackRef.current[stackRef.current.length - 1];
        restoreScroll(returnTo);

        // Update URL
        updateURL(returnTo.screen, returnTo.params);

        return popped;
    }, [startTransition, persistStack, restoreScroll]);

    // ── REPLACE: Swap current screen without animation ──
    const replace = useCallback((screen: ScreenId, params: Record<string, any> = {}) => {
        stackRef.current[stackRef.current.length - 1] = createEntry(screen, params);
        stackRef.current = [...stackRef.current];

        setRenderState({
            stack: stackRef.current,
            direction: 'none',
            isTransitioning: false,
        });

        persistStack();
        updateURL(screen, params);
    }, [persistStack]);

    // ── POP TO: Pop until a specific screen is on top ──
    const popTo = useCallback((screen: ScreenId) => {
        captureCurrentScroll();

        const idx = stackRef.current.findIndex(e => e.screen === screen);
        if (idx < 0) return; // Screen not in stack

        stackRef.current = stackRef.current.slice(0, idx + 1);
        haptic.nav();
        startTransition('back');
        persistStack();

        const returnTo = stackRef.current[stackRef.current.length - 1];
        restoreScroll(returnTo);
        updateURL(returnTo.screen, returnTo.params);
    }, [captureCurrentScroll, startTransition, persistStack, restoreScroll]);

    // ── RESET: Clear stack and go to root ──
    const reset = useCallback((screen: ScreenId = 'map', params: Record<string, any> = {}) => {
        stackRef.current = [createEntry(screen, params)];

        setRenderState({
            stack: stackRef.current,
            direction: 'none',
            isTransitioning: false,
        });

        persistStack();
        updateURL(screen, params);
    }, [persistStack]);

    // ── Save scroll manually ──
    const saveScroll = useCallback((scrollY?: number, containerId?: string) => {
        const current = stackRef.current[stackRef.current.length - 1];
        if (!current) return;

        if (containerId !== undefined && scrollY !== undefined) {
            current.scrollPositions.set(containerId, scrollY);
        } else {
            current.scrollY = scrollY ?? window.scrollY;
        }
    }, []);

    // ── Getters ──
    const getDirection = useCallback((): TransitionDirection => {
        return renderState.direction;
    }, [renderState.direction]);

    const isInStack = useCallback((screen: ScreenId): boolean => {
        return stackRef.current.some(e => e.screen === screen);
    }, []);

    const getParams = useCallback((screen: ScreenId): Record<string, any> | null => {
        const entry = stackRef.current.find(e => e.screen === screen);
        return entry?.params ?? null;
    }, []);

    const getPrevious = useCallback((): NavEntry | null => {
        if (stackRef.current.length < 2) return null;
        return stackRef.current[stackRef.current.length - 2];
    }, []);

    // ── Handle browser back button ──
    useEffect(() => {
        const handler = (e: PopStateEvent) => {
            e.preventDefault();
            if (stackRef.current.length > 1) {
                pop();
            }
        };
        window.addEventListener('popstate', handler);
        return () => window.removeEventListener('popstate', handler);
    }, [pop]);

    // ── Computed state ──
    const state = useMemo<NavigationState>(() => ({
        stack: renderState.stack,
        current: renderState.stack[renderState.stack.length - 1],
        direction: renderState.direction,
        isTransitioning: renderState.isTransitioning,
        canGoBack: renderState.stack.length > 1,
        depth: renderState.stack.length,
    }), [renderState]);

    const actions = useMemo<NavigationActions>(() => ({
        push,
        pop,
        replace,
        popTo,
        reset,
        saveScroll,
        getDirection,
        isInStack,
        getParams,
        getPrevious,
    }), [push, pop, replace, popTo, reset, saveScroll, getDirection, isInStack, getParams, getPrevious]);

    return [state, actions];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEntry(screen: ScreenId, params: Record<string, any> = {}): NavEntry {
    return {
        screen,
        params,
        scrollY: 0,
        scrollPositions: new Map(),
        timestamp: Date.now(),
    };
}

/** Update URL without triggering a reload — for deep linking and history */
function updateURL(screen: ScreenId, params: Record<string, any>) {
    try {
        const url = new URL(window.location.href);

        // Clear existing PSI params
        url.searchParams.delete('screen');
        url.searchParams.delete('project');
        url.searchParams.delete('action');

        // Set new params based on screen
        if (screen !== 'map') {
            url.searchParams.set('screen', screen);
        }
        if (params.projectId) {
            url.searchParams.set('project', params.projectId);
        }
        if (params.action) {
            url.searchParams.set('action', params.action);
        }

        // Push state without reload (only if URL changed)
        const newUrl = url.pathname + url.search;
        if (newUrl !== window.location.pathname + window.location.search) {
            history.pushState({ screen, params }, '', newUrl);
        }
    } catch { }
}

// ─── Transition CSS Class Helpers ────────────────────────────────────────────

/**
 * Get the CSS classes for the entering screen based on transition direction.
 * 
 * @example
 * <div className={getEnterTransitionClass(direction, isTransitioning)}>
 */
export function getEnterTransitionClass(
    direction: TransitionDirection,
    isTransitioning: boolean
): string {
    if (direction === 'none') return '';

    if (direction === 'forward') {
        // Forward: new screen slides in from right
        return isTransitioning
            ? 'nav-enter-forward nav-enter-active'
            : 'nav-enter-forward nav-enter-done';
    }

    // Back: returning screen slides in from left
    return isTransitioning
        ? 'nav-enter-back nav-enter-active'
        : 'nav-enter-back nav-enter-done';
}

/**
 * Get the CSS classes for the exiting screen based on transition direction.
 */
export function getExitTransitionClass(
    direction: TransitionDirection,
    isTransitioning: boolean
): string {
    if (direction === 'none') return '';

    if (direction === 'forward') {
        // Forward: old screen slides out to the left
        return isTransitioning
            ? 'nav-exit-forward nav-exit-active'
            : 'nav-exit-forward nav-exit-done';
    }

    // Back: current screen slides out to the right
    return isTransitioning
        ? 'nav-exit-back nav-exit-active'
        : 'nav-exit-back nav-exit-done';
}

// ─── Swipe-Back Gesture Integration ──────────────────────────────────────────

/**
 * Returns a touch handler config for swipe-back navigation.
 * Designed to work with useNativeGestures' onEdgeSwipeBack callback.
 * 
 * @example
 * const { onEdgeSwipeBack } = useSwipeBackGesture(nav);
 * useNativeGestures(ref, { onEdgeSwipeBack });
 */
export function useSwipeBackGesture(actions: NavigationActions) {
    const onEdgeSwipeBack = useCallback(() => {
        if (actions.getPrevious()) {
            actions.pop();
        }
    }, [actions]);

    return { onEdgeSwipeBack };
}

export default useNavigationStack;
