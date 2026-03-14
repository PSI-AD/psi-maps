/**
 * ─── Native Page Transition Wrapper ─────────────────────────────────────────
 * GPU-accelerated slide transitions between screens that mimic iOS/Android
 * native navigation stack behavior.
 *
 * Features:
 *  • Slide-in from right (push), slide-out to right (pop)
 *  • Fade + scale for modal-style transitions
 *  • Shared element transition support via CSS view-transition-name
 *  • Hardware-accelerated using will-change and transform3d
 *
 * Usage:
 *   <NativeTransition isVisible={true} direction="push">
 *     <YourComponent />
 *   </NativeTransition>
 */

import React, { useEffect, useState, useRef } from 'react';

type TransitionDirection = 'push' | 'pop' | 'modal' | 'fade' | 'slide-up';

interface NativeTransitionProps {
    isVisible: boolean;
    direction?: TransitionDirection;
    duration?: number;
    children: React.ReactNode;
    className?: string;
    /** CSS view-transition-name for shared element transitions */
    sharedElementName?: string;
    /** Called after exit animation completes */
    onExitComplete?: () => void;
}

const NativeTransition: React.FC<NativeTransitionProps> = ({
    isVisible,
    direction = 'push',
    duration = 300,
    children,
    className = '',
    sharedElementName,
    onExitComplete,
}) => {
    const [shouldRender, setShouldRender] = useState(isVisible);
    const [animClass, setAnimClass] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const dir = direction as TransitionDirection;
        if (isVisible) {
            setShouldRender(true);
            // Force a reflow before adding the enter class
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimClass(getEnterClass(dir));
                });
            });
        } else if (shouldRender) {
            setAnimClass(getExitClass(dir));
            const timer = setTimeout(() => {
                setShouldRender(false);
                setAnimClass('');
                onExitComplete?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, direction, duration, onExitComplete]);

    if (!shouldRender) return null;

    const baseStyles: React.CSSProperties = {
        willChange: 'transform, opacity',
        transitionProperty: 'transform, opacity',
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)', // iOS spring curve
        ...(sharedElementName ? { viewTransitionName: sharedElementName } as any : {}),
    };

    return (
        <div
            ref={containerRef}
            className={`native-transition ${animClass} ${className}`}
            style={baseStyles}
        >
            {children}
        </div>
    );
};

function getEnterClass(direction: TransitionDirection): string {
    switch (direction) {
        case 'push': return 'nt-enter-push';
        case 'pop': return 'nt-enter-pop';
        case 'modal': return 'nt-enter-modal';
        case 'fade': return 'nt-enter-fade';
        case 'slide-up': return 'nt-enter-slide-up';
        default: return 'nt-enter-push';
    }
}

function getExitClass(direction: TransitionDirection): string {
    switch (direction) {
        case 'push': return 'nt-exit-push';
        case 'pop': return 'nt-exit-pop';
        case 'modal': return 'nt-exit-modal';
        case 'fade': return 'nt-exit-fade';
        case 'slide-up': return 'nt-exit-slide-up';
        default: return 'nt-exit-push';
    }
}

/**
 * SwipeableCard — A card component that can be swiped away (left/right/down).
 * Used for dismissible notifications, info cards, etc.
 */
interface SwipeableCardProps {
    children: React.ReactNode;
    onSwipeAway?: (direction: 'left' | 'right') => void;
    className?: string;
    threshold?: number;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
    children,
    onSwipeAway,
    className = '',
    threshold = 100,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentDelta = useRef(0);
    const [delta, setDelta] = useState(0);
    const [isDismissing, setIsDismissing] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentDelta.current = 0;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const dx = e.touches[0].clientX - startX.current;
        currentDelta.current = dx;
        setDelta(dx);
    };

    const handleTouchEnd = () => {
        if (Math.abs(currentDelta.current) > threshold) {
            const direction = currentDelta.current < 0 ? 'left' : 'right';
            setIsDismissing(true);
            setDelta(direction === 'left' ? -window.innerWidth : window.innerWidth);
            setTimeout(() => {
                onSwipeAway?.(direction);
            }, 250);
        } else {
            setDelta(0);
        }
        currentDelta.current = 0;
    };

    // Opacity decreases as card is swiped further
    const opacity = isDismissing ? 0 : Math.max(0.3, 1 - Math.abs(delta) / (threshold * 2));
    const rotation = delta * 0.03; // Subtle rotation for natural feel

    return (
        <div
            ref={cardRef}
            className={`swipeable-card ${className}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
                transform: `translateX(${delta}px) rotate(${rotation}deg)`,
                opacity,
                transition: currentDelta.current === 0 ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease' : 'none',
                willChange: 'transform, opacity',
                touchAction: 'pan-y',
            }}
        >
            {children}
        </div>
    );
};

/**
 * PullToRefreshIndicator — Visual spinner for pull-to-refresh gesture
 */
interface PullToRefreshProps {
    pullDistance: number;
    isRefreshing: boolean;
    threshold?: number;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshProps> = ({
    pullDistance,
    isRefreshing,
    threshold = 60,
}) => {
    const progress = Math.min(pullDistance / threshold, 1);
    const rotation = pullDistance * 3; // Spin based on pull distance
    const scale = 0.5 + progress * 0.5;
    const opacity = Math.min(progress * 1.5, 1);

    if (pullDistance <= 0 && !isRefreshing) return null;

    return (
        <div
            className="ptr-indicator"
            style={{
                transform: `translateY(${Math.min(pullDistance, 80)}px) scale(${scale})`,
                opacity,
            }}
        >
            <div
                className="ptr-spinner"
                style={{
                    transform: `rotate(${isRefreshing ? 0 : rotation}deg)`,
                    animation: isRefreshing ? 'ptr-spin 0.8s linear infinite' : 'none',
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
            </div>
        </div>
    );
};

export default NativeTransition;
