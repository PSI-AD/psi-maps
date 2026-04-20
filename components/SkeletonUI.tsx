// ═══════════════════════════════════════════════════════════════════════════════
// PSI Maps Pro — Skeleton UI Components
// Instant layout placeholders that eliminate perceived loading time
// Every data-driven screen renders its structure immediately with shimmer
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';

// ─── Project Sidebar Skeleton ────────────────────────────────────────────────

export const SidebarSkeleton: React.FC = () => (
    <div className="h-full bg-white flex flex-col animate-in fade-in duration-150">
        {/* Hero Image Skeleton */}
        <div className="skeleton w-full h-52 md:h-56" />

        {/* Title Area */}
        <div className="px-5 py-4 space-y-3">
            <div className="skeleton h-6 w-3/4 rounded-lg" />
            <div className="skeleton h-3 w-1/2 rounded-md" />
            <div className="skeleton h-3 w-2/3 rounded-md" />
        </div>

        {/* Stats Row */}
        <div className="px-5 pb-3 flex gap-3">
            <div className="skeleton h-16 flex-1 rounded-xl" />
            <div className="skeleton h-16 flex-1 rounded-xl" />
            <div className="skeleton h-16 flex-1 rounded-xl" />
        </div>

        {/* Description */}
        <div className="px-5 py-3 space-y-2">
            <div className="skeleton h-3 w-full rounded-md" />
            <div className="skeleton h-3 w-5/6 rounded-md" />
            <div className="skeleton h-3 w-4/6 rounded-md" />
        </div>

        {/* Gallery thumbnails */}
        <div className="px-5 py-3 flex gap-2 overflow-hidden">
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
            <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
        </div>

        {/* Action buttons */}
        <div className="px-5 py-4 mt-auto space-y-2">
            <div className="skeleton h-12 w-full rounded-xl" />
            <div className="skeleton h-10 w-full rounded-xl" />
        </div>
    </div>
);

// ─── Admin Dashboard Skeleton ────────────────────────────────────────────────

export const AdminSkeleton: React.FC = () => (
    <div className="fixed inset-0 z-[10001] bg-slate-50/98 flex flex-col animate-in fade-in duration-150">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
            <div className="space-y-2">
                <div className="skeleton h-6 w-48 rounded-lg" />
                <div className="skeleton h-3 w-32 rounded-md" />
            </div>
            <div className="skeleton h-10 w-10 rounded-full" />
        </div>

        {/* Content grid */}
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                    <div className="skeleton h-5 w-2/3 rounded-lg" />
                    <div className="skeleton h-3 w-1/2 rounded-md" />
                    <div className="skeleton h-32 w-full rounded-xl mt-2" />
                    <div className="skeleton h-3 w-full rounded-md" />
                    <div className="skeleton h-3 w-4/5 rounded-md" />
                </div>
            ))}
        </div>
    </div>
);

// ─── Property Card Skeleton (for carousel) ───────────────────────────────────

export const CardSkeleton: React.FC = () => (
    <div className="shrink-0 w-[82vw] sm:w-[300px] md:w-full bg-white rounded-2xl p-3 flex gap-3 border-2 border-slate-100 shadow-md">
        <div className="skeleton w-[88px] h-[88px] md:w-20 md:h-20 shrink-0 rounded-xl" />
        <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded-lg" />
            <div className="skeleton h-2.5 w-1/2 rounded-md" />
            <div className="skeleton h-2.5 w-2/3 rounded-md" />
            <div className="flex gap-2 pt-2 border-t border-slate-100">
                <div className="skeleton h-3 w-20 rounded-md" />
                <div className="skeleton h-3 w-16 rounded-md" />
            </div>
        </div>
    </div>
);

// ─── Carousel Loading Skeleton (multiple cards) ──────────────────────────────

export const CarouselSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
    <div className="flex gap-3 overflow-hidden px-3 py-2 animate-in fade-in duration-200">
        {Array.from({ length: count }).map((_, i) => (
            <div
                key={i}
                className="shrink-0 w-[82vw] sm:w-[300px] bg-white rounded-2xl p-3 flex gap-3 border-2 border-slate-100 shadow-md"
                style={{ animationDelay: `${i * 80}ms` }}
            >
                <div className="skeleton w-[88px] h-[88px] shrink-0 rounded-xl" />
                <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5 space-y-2">
                    <div className="skeleton h-4 w-3/4 rounded-lg" />
                    <div className="skeleton h-2.5 w-1/2 rounded-md" />
                    <div className="skeleton h-2.5 w-2/3 rounded-md" />
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <div className="skeleton h-3 w-20 rounded-md" />
                        <div className="skeleton h-3 w-16 rounded-md" />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

// ─── List View Skeleton ──────────────────────────────────────────────────────

export const ListViewSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
    <div className="p-4 space-y-3 animate-in fade-in duration-200">
        {/* Search/filter bar skeleton */}
        <div className="flex gap-3 mb-4">
            <div className="skeleton h-10 flex-1 rounded-xl" />
            <div className="skeleton h-10 w-24 rounded-xl" />
        </div>

        {/* List items */}
        {Array.from({ length: rows }).map((_, i) => (
            <div
                key={i}
                className="bg-white rounded-xl p-4 flex gap-4 border border-slate-100 shadow-sm"
                style={{ animationDelay: `${i * 50}ms` }}
            >
                {/* Thumbnail */}
                <div className="skeleton w-24 h-20 rounded-lg shrink-0" />

                {/* Content */}
                <div className="flex-1 space-y-2 py-1">
                    <div className="skeleton h-4 w-3/4 rounded-lg" />
                    <div className="skeleton h-2.5 w-1/2 rounded-md" />
                    <div className="flex gap-3 pt-1">
                        <div className="skeleton h-3 w-20 rounded-md" />
                        <div className="skeleton h-3 w-16 rounded-md" />
                        <div className="skeleton h-3 w-24 rounded-md" />
                    </div>
                </div>

                {/* Price area */}
                <div className="shrink-0 text-right space-y-2 py-1">
                    <div className="skeleton h-5 w-28 rounded-lg ml-auto" />
                    <div className="skeleton h-3 w-16 rounded-md ml-auto" />
                </div>
            </div>
        ))}
    </div>
);

// ─── Favorites Panel Skeleton ────────────────────────────────────────────────

export const FavoritesSkeleton: React.FC = () => (
    <div className="p-4 space-y-3 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
            <div className="skeleton h-6 w-36 rounded-lg" />
            <div className="skeleton h-8 w-8 rounded-full" />
        </div>

        {/* Favorite cards */}
        {Array.from({ length: 4 }).map((_, i) => (
            <div
                key={i}
                className="bg-white rounded-xl p-3 flex gap-3 border border-slate-100 shadow-sm"
                style={{ animationDelay: `${i * 60}ms` }}
            >
                <div className="skeleton w-20 h-20 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 py-0.5">
                    <div className="skeleton h-4 w-2/3 rounded-lg" />
                    <div className="skeleton h-2.5 w-1/2 rounded-md" />
                    <div className="skeleton h-2.5 w-3/4 rounded-md" />
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                    <div className="skeleton w-8 h-8 rounded-full" />
                    <div className="skeleton h-3 w-16 rounded-md" />
                </div>
            </div>
        ))}

        {/* Bottom actions */}
        <div className="pt-3 space-y-2">
            <div className="skeleton h-10 w-full rounded-xl" />
        </div>
    </div>
);

// ─── Compare Panel Skeleton ──────────────────────────────────────────────────

export const CompareSkeleton: React.FC = () => (
    <div className="p-4 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
            <div className="skeleton h-6 w-40 rounded-lg" />
            <div className="skeleton h-8 w-8 rounded-full" />
        </div>

        {/* Comparison cards side by side */}
        <div className="grid grid-cols-2 gap-4 mb-6">
            {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    <div className="skeleton h-36 w-full rounded-xl" />
                    <div className="skeleton h-5 w-3/4 rounded-lg" />
                    <div className="skeleton h-3 w-1/2 rounded-md" />
                    <div className="skeleton h-6 w-2/3 rounded-lg" />
                </div>
            ))}
        </div>

        {/* Comparison table rows */}
        {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 py-3 border-b border-slate-100">
                <div className="skeleton h-3 w-20 rounded-md" />
                <div className="skeleton h-3 w-full rounded-md" />
                <div className="skeleton h-3 w-full rounded-md" />
            </div>
        ))}
    </div>
);

// ─── Nearby / Amenities Panel Skeleton ───────────────────────────────────────

export const NearbyPanelSkeleton: React.FC = () => (
    <div className="p-4 space-y-3 animate-in fade-in duration-200">
        {/* Header */}
        <div className="skeleton h-6 w-44 rounded-lg mb-4" />

        {/* Category pills */}
        <div className="flex gap-2 mb-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-8 w-24 rounded-full shrink-0" />
            ))}
        </div>

        {/* Amenity list items */}
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
                <div className="skeleton w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-2/3 rounded-md" />
                    <div className="skeleton h-2.5 w-1/3 rounded-md" />
                </div>
                <div className="skeleton h-3 w-12 rounded-md shrink-0" />
            </div>
        ))}
    </div>
);

// ─── Search Results Skeleton ─────────────────────────────────────────────────

export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="p-3 space-y-1 animate-in fade-in duration-150">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-3/4 rounded-md" />
                    <div className="skeleton h-2.5 w-1/2 rounded-md" />
                </div>
            </div>
        ))}
    </div>
);

// ─── Map Loading Skeleton ────────────────────────────────────────────────────

export const MapSkeleton: React.FC = () => (
    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
            {/* Subtle pulsing map pin */}
            <div className="relative">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>
                <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full bg-blue-200/50 animate-ping" />
            </div>
            <div className="space-y-1">
                <p className="text-sm font-bold text-slate-600">Loading Map</p>
                <p className="text-xs text-slate-400">Preparing interactive experience…</p>
            </div>
        </div>
    </div>
);

// ─── Full-Screen Loading Skeleton (replaces the spinner overlay) ─────────────

export const AppLoadingSkeleton: React.FC = () => (
    <div className="absolute inset-0 z-[7000] bg-slate-900/80 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none">
        {/* Animated Logo Pulse */}
        <div className="relative mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/40">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
            </div>
            {/* Two-ring spinner — pointer-events:none so they never block map clicks */}
            <div className="absolute -inset-3 border-2 border-blue-400/30 rounded-2xl animate-pulse pointer-events-none" />
            <div className="absolute -inset-6 border border-blue-300/15 rounded-3xl animate-pulse pointer-events-none" style={{ animationDelay: '200ms' }} />
        </div>

        {/* Progress bar */}
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full loading-progress" />
        </div>

        <h2 className="text-xl font-black text-white tracking-widest uppercase">PSI Maps Pro</h2>
        <p className="text-slate-400 mt-1.5 font-medium tracking-wide text-xs">Loading Premium Properties…</p>
    </div>
);

// ─── Inline Skeleton Helper (for custom sizes) ──────────────────────────────

interface SkeletonBlockProps {
    width?: string;
    height?: string;
    className?: string;
    rounded?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
    width = '100%',
    height = '16px',
    className = '',
    rounded = 'rounded-md',
}) => (
    <div
        className={`skeleton ${rounded} ${className}`}
        style={{ width, height }}
    />
);

// ─── Content Transition Wrapper ──────────────────────────────────────────────
// Smoothly transitions from skeleton to real content

interface SkeletonTransitionProps {
    isLoaded: boolean;
    skeleton: React.ReactNode;
    children: React.ReactNode;
    /** Minimum time (ms) to show skeleton, avoids flash */
    minDuration?: number;
}

export const SkeletonTransition: React.FC<SkeletonTransitionProps> = ({
    isLoaded,
    skeleton,
    children,
    minDuration = 200,
}) => {
    const [showContent, setShowContent] = React.useState(false);
    const mountTimeRef = React.useRef(Date.now());

    React.useEffect(() => {
        if (!isLoaded) {
            setShowContent(false);
            mountTimeRef.current = Date.now();
            return;
        }

        const elapsed = Date.now() - mountTimeRef.current;
        const remaining = Math.max(0, minDuration - elapsed);

        if (remaining === 0) {
            setShowContent(true);
        } else {
            const timer = setTimeout(() => setShowContent(true), remaining);
            return () => clearTimeout(timer);
        }
    }, [isLoaded, minDuration]);

    if (!showContent) {
        return <>{skeleton}</>;
    }

    return (
        <div className="animate-in fade-in duration-200">
            {children}
        </div>
    );
};
