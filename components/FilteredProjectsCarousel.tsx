import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as turf from '@turf/turf';
import { Project, ClientPresentation } from '../types';
import { MapPin, Building, BedDouble, ChevronLeft, ChevronRight, X, Play, Square } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageHelpers';

interface FilteredProjectsCarouselProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    isVisible: boolean;
    selectedProjectId?: string;
    hoveredProjectId?: string | null;
    setHoveredProjectId?: (id: string | null) => void;
    onFlyTo?: (lng: number, lat: number, zoom?: number) => void;
    onDismiss?: () => void;
    // Cinematic presentation mode
    activePresentation?: ClientPresentation | null;
    presentationProjects?: Project[] | null;
    onExitPresentation?: () => void;
}

const FilteredProjectsCarousel: React.FC<FilteredProjectsCarouselProps> = ({
    projects,
    onSelectProject,
    isVisible,
    selectedProjectId,
    hoveredProjectId,
    setHoveredProjectId,
    onFlyTo,
    onDismiss,
    activePresentation,
    presentationProjects,
    onExitPresentation,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    // Keep a stable ref to onSelectProject so the interval closure doesn't go stale
    const onSelectRef = useRef(onSelectProject);
    const onFlyToRef = useRef(onFlyTo);
    useEffect(() => { onSelectRef.current = onSelectProject; }, [onSelectProject]);
    useEffect(() => { onFlyToRef.current = onFlyTo; }, [onFlyTo]);

    // ── Presentation engine state ───────────────────────────────────────────
    const [playingCommunity, setPlayingCommunity] = useState<string | null>(null);
    const [playIndex, setPlayIndex] = useState(0);
    const [playProgress, setPlayProgress] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false); // desktop slide-out toggle
    // Stable ref holds the active tour's project array — decoupled from render cycle
    const activeTourRef = useRef<{ community: string; projects: Project[] } | null>(null);

    // ── Nearest-neighbor spatial sort + group by community ──────────────────
    const groupedProjects = useMemo(() => {
        const groups: Record<string, Project[]> = {};
        projects.forEach(p => {
            const comm = p.community || 'Other Locations';
            if (!groups[comm]) groups[comm] = [];
            groups[comm].push(p);
        });

        const sortedGroups = Object.entries(groups).map(([comm, projs]) => {
            const valid = projs.filter(p => {
                const lng = Number(p.longitude), lat = Number(p.latitude);
                return !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0;
            });
            const invalid = projs.filter(p => {
                const lng = Number(p.longitude), lat = Number(p.latitude);
                return isNaN(lng) || isNaN(lat) || lng === 0 || lat === 0;
            });

            if (valid.length <= 1) return [comm, [...valid, ...invalid]] as [string, Project[]];

            // Greedy nearest-neighbor chain
            const sorted: Project[] = [valid[0]];
            const remaining = valid.slice(1);
            while (remaining.length > 0) {
                const current = sorted[sorted.length - 1];
                let nearestIdx = 0, minDist = Infinity;
                remaining.forEach((p, idx) => {
                    const dist = turf.distance(
                        [Number(current.longitude), Number(current.latitude)],
                        [Number(p.longitude), Number(p.latitude)],
                        { units: 'kilometers' }
                    );
                    if (dist < minDist) { minDist = dist; nearestIdx = idx; }
                });
                sorted.push(remaining[nearestIdx]);
                remaining.splice(nearestIdx, 1);
            }
            return [comm, [...sorted, ...invalid]] as [string, Project[]];
        });

        return sortedGroups.sort((a, b) => a[0].localeCompare(b[0]));
    }, [projects]);

    // ── Tour mode override ──────────────────────────────────────────────────
    const isTourMode = !!activePresentation && !!presentationProjects && presentationProjects.length > 0;
    const TOUR_KEY = 'Client Presentation';
    const displayGroups: [string, Project[]][] = isTourMode
        ? [[TOUR_KEY, presentationProjects as Project[]]]
        : groupedProjects;

    const displayGroupsRef = useRef(displayGroups);
    useEffect(() => { displayGroupsRef.current = displayGroups; }, [displayGroups]);

    // Custom interval in ticks (50ms each); community tours use 100 ticks (5s)
    const presentationTargetTicks = isTourMode && activePresentation
        ? ((activePresentation.intervalSeconds * 1000) / 50)
        : 100;

    // ── Resilient tick-based presentation timer ─────────────────────────────
    // Uses activeTourRef so the closure doesn't capture groupedProjects,
    // which changes on every map camera move via onBoundsChange → viewportProjects.
    useEffect(() => {
        let ticker: ReturnType<typeof setInterval>;

        const targetTicks = isTourMode && activePresentation ? (activePresentation.intervalSeconds * 1000) / 50 : 100;

        if (playingCommunity && activeTourRef.current) {
            ticker = setInterval(() => {
                setPlayProgress(prev => {
                    if (prev >= targetTicks) {
                        setPlayIndex(curr => {
                            const groups = displayGroupsRef.current;
                            let nextProj: Project;
                            let nextProjIdx = curr + 1;

                            if (isTourMode) {
                                const tourProjects = activeTourRef.current!.projects;
                                nextProjIdx = nextProjIdx % tourProjects.length;
                                nextProj = tourProjects[nextProjIdx];
                            } else {
                                const currentComm = activeTourRef.current!.community;
                                const groupIdx = groups.findIndex(g => g[0] === currentComm);

                                if (groupIdx >= 0) {
                                    const currentGroupProjects = groups[groupIdx][1];
                                    if (nextProjIdx >= currentGroupProjects.length) {
                                        // Jump to next group
                                        const nextGroup = groups[(groupIdx + 1) % groups.length];
                                        activeTourRef.current = { community: nextGroup[0], projects: nextGroup[1] };

                                        // Safely defer the playing state update
                                        setTimeout(() => setPlayingCommunity(nextGroup[0]), 0);
                                        nextProjIdx = 0;
                                        nextProj = nextGroup[1][0];
                                    } else {
                                        nextProj = currentGroupProjects[nextProjIdx];
                                    }
                                } else {
                                    nextProj = activeTourRef.current!.projects[0];
                                    nextProjIdx = 0;
                                }
                            }

                            // Defer external mutations to next tick — prevents render clashes
                            setTimeout(() => {
                                onSelectRef.current(nextProj);
                                const lng = Number(nextProj.longitude);
                                const lat = Number(nextProj.latitude);
                                if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
                                    onFlyToRef.current?.(lng, lat, 16);
                                }
                                itemRefs.current[nextProj.id]?.scrollIntoView({
                                    behavior: 'smooth', block: 'center', inline: 'center'
                                });
                            }, 0);

                            return nextProjIdx;
                        });
                        return 0; // reset progress ring
                    }
                    return prev + 1; // 1 tick per 50ms
                });
            }, 50);
        } else {
            setPlayProgress(0);
        }

        return () => clearInterval(ticker);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playingCommunity]); // groupedProjects intentionally omitted — data accessed via activeTourRef

    // ── Auto-scroll to selected project on click ──────────────────────────
    useEffect(() => {
        if (!selectedProjectId) return;
        const el = itemRefs.current[selectedProjectId];
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [selectedProjectId]);

    // Stop tour when the projects list changes (filter change) — but NOT in tour mode
    useEffect(() => {
        if (!isTourMode) {
            setPlayingCommunity(null);
            setPlayProgress(0);
        }
    }, [projects, isTourMode]);

    // Auto-start when entering tour mode
    useEffect(() => {
        if (isTourMode && presentationProjects && presentationProjects.length > 0) {
            const first = presentationProjects[0];
            activeTourRef.current = { community: TOUR_KEY, projects: presentationProjects };
            setPlayingCommunity(TOUR_KEY);
            setPlayIndex(0);
            setPlayProgress(0);
            onSelectProject(first);
            const lng = Number(first.longitude), lat = Number(first.latitude);
            if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) onFlyTo?.(lng, lat, 16);
        } else if (!isTourMode && playingCommunity === TOUR_KEY) {
            setPlayingCommunity(null);
            setPlayProgress(0);
            activeTourRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTourMode]);

    if (!isVisible || (projects.length === 0 && !isTourMode)) return null;

    const scrollHorizontal = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
    };

    const togglePlay = (community: string, commProjects: Project[]) => {
        if (playingCommunity === community) {
            // Stop
            setPlayingCommunity(null);
            setPlayProgress(0);
            activeTourRef.current = null;
        } else {
            // Start — populate ref BEFORE setting state so the effect reads it immediately
            activeTourRef.current = { community, projects: commProjects };
            setPlayingCommunity(community);
            setPlayIndex(0);
            setPlayProgress(0);
            const first = commProjects[0];
            if (first) {
                onSelectProject(first);
                const lng = Number(first.longitude), lat = Number(first.latitude);
                if (!isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
                    onFlyTo?.(lng, lat, 16);
                }
                setTimeout(() => {
                    itemRefs.current[first.id]?.scrollIntoView({
                        behavior: 'smooth', block: 'center', inline: 'center'
                    });
                }, 100);
            }
        }
    };

    // ── SVG progress ring constants (r=14, circumference = 2π·14 ≈ 87.96 ≈ 88) ──
    const RING_C = 88;
    const ringOffset = RING_C - (RING_C * playProgress) / presentationTargetTicks;

    // ── Single card renderer ────────────────────────────────────────────────
    const renderCard = (project: Project, idx: number) => {
        const isSelected = selectedProjectId === project.id;

        return (
            <div
                key={project.id}
                ref={el => { itemRefs.current[project.id] = el; }}
                onClick={() => onSelectProject(project)}
                className={`
                    shrink-0 w-[82vw] sm:w-[300px] snap-center
                    md:w-full md:shrink-0 md:rounded-none
                    ${idx === 0 ? '' : 'md:border-t md:border-slate-100'}
                    bg-white rounded-2xl p-3 flex gap-3 cursor-pointer
                    transition-all duration-200 border-2
                    ${isSelected
                        ? 'border-blue-500 shadow-lg shadow-blue-500/15 md:bg-blue-50/60 md:border-0 md:border-l-4 md:border-l-blue-500'
                        : 'border-slate-100 shadow-md hover:border-blue-300 hover:shadow-lg md:border-0 md:border-l-4 md:border-l-transparent hover:md:border-l-blue-300 hover:md:bg-slate-50/60'
                    }
                    group
                `}
            >
                {/* Thumbnail */}
                <div className="w-[88px] h-[88px] md:w-20 md:h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 relative shadow-sm">
                    <img
                        src={getOptimizedImageUrl(
                            (project as any).thumbnailUrl || ((project as any).images?.[0]) || '',
                            200, 200
                        )}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {project.status && (
                        <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md leading-none">
                            {project.status === 'Completed' ? 'Ready' : project.status}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5">
                    <h3 className={`text-sm font-black truncate tracking-tight leading-tight transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>
                        {project.name}
                    </h3>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.15em] truncate mt-0.5 mb-1.5">
                        {(project as any).developerName || 'Exclusive'}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 truncate mb-auto">
                        <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                        <span className="truncate">{project.community}{project.city ? `, ${project.city}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100">
                        {(() => {
                            const raw = (project as any).priceRange?.toString().split('-')[0].trim().replace(/[^0-9.]/g, '');
                            const num = Number(raw);
                            const valid = raw && !isNaN(num) && num > 0;
                            return valid ? (
                                <div className="flex items-center gap-1">
                                    <Building className="w-3 h-3 text-blue-400" />
                                    <span className="text-[10px] font-black text-slate-700 truncate">
                                        AED {num.toLocaleString()}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">Price on Request</span>
                            );
                        })()}
                        {(project as any).bedrooms &&
                            String((project as any).bedrooms) !== 'N/A' &&
                            String((project as any).bedrooms) !== '0' && (
                                <div className="flex items-center gap-1">
                                    <BedDouble className="w-3 h-3 text-slate-300" />
                                    <span className="text-[10px] font-medium text-slate-500">
                                        {(project as any).type?.toLowerCase() === 'villa' ? '4–6' : '1–3'} Bed
                                    </span>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`
            absolute z-[4000] pointer-events-none
            bottom-[88px] left-0 w-full
            md:bottom-[96px] md:top-[80px] md:left-0 md:w-[360px]
            flex flex-col
            transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${isCollapsed ? 'md:-translate-x-full' : 'md:translate-x-6'}
        `}>
            {/* ── Desktop: Collapse toggle button — sticks out from right edge ── */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                aria-label={isCollapsed ? 'Show property panel' : 'Collapse property panel'}
                className="hidden md:flex absolute top-1/2 -right-11 -translate-y-1/2 w-11 h-16 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-r-2xl items-center justify-center shadow-[4px_0_15px_rgba(0,0,0,0.06)] pointer-events-auto hover:bg-slate-50 transition-colors z-20"
                title={isCollapsed ? 'Show panel' : 'Hide panel'}
            >
                <ChevronLeft className={`w-5 h-5 text-slate-500 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {/* ── Desktop panel header ── */}
            <div className="hidden md:flex items-center justify-between px-5 py-3.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-t-3xl pointer-events-auto shadow-lg shrink-0">
                <div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.2em] ${isTourMode ? 'text-amber-500' : 'text-blue-500'}`}>
                        {isTourMode ? 'Client Presentation' : 'Filtered Results'}
                    </p>
                    <h3 className="font-black text-slate-900 tracking-tight text-base">
                        {isTourMode
                            ? <>{activePresentation!.title} <span className="text-slate-400 font-medium text-sm">({presentationProjects!.length})</span></>
                            : <>{projects.length} Propert{projects.length === 1 ? 'y' : 'ies'}</>
                        }
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    {isTourMode && (
                        <button
                            onClick={onExitPresentation}
                            title="Exit presentation"
                            aria-label="Exit tour presentation"
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors pointer-events-auto"
                        >
                            <X className="w-3 h-3" /> Exit Tour
                        </button>
                    )}
                    {onDismiss && !isTourMode && (
                        <button
                            onClick={onDismiss}
                            title="Clear filters"
                            aria-label="Clear all filters"
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Mobile count badge + dismiss ── */}
            <div className="flex md:hidden items-center justify-center gap-2 mb-2 pointer-events-auto">
                <div className={`text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full shadow-md border ${isTourMode
                    ? 'bg-amber-50/90 text-amber-700 border-amber-100'
                    : 'bg-white/90 text-slate-700 border-slate-100'
                    } backdrop-blur-md`}>
                    {isTourMode ? activePresentation!.title : `${projects.length} propert${projects.length === 1 ? 'y' : 'ies'}`}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        aria-label="Clear all filters"
                        className="p-1.5 bg-white/90 backdrop-blur-md text-slate-400 hover:text-slate-700 rounded-full shadow-md border border-slate-100 transition-colors pointer-events-auto"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* ── Scroll containers ── */}
            <div className="relative flex-1 min-h-0">

                {/* Left arrow — mobile only */}
                <button
                    onClick={() => scrollHorizontal('left')}
                    aria-label="Scroll left to previous properties"
                    className="hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/90 text-blue-600 rounded-full shadow-lg pointer-events-auto border border-slate-100 transition-all hover:bg-white active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div
                    ref={scrollRef}
                    className="
                        flex gap-3 overflow-x-auto
                        snap-x snap-mandatory
                        pb-3 pt-1 px-3
                        md:flex-col md:overflow-y-auto md:overflow-x-hidden
                        md:snap-none
                        md:h-full md:max-h-full
                        md:px-0 md:pb-0 md:pt-0 md:gap-0
                        md:bg-white/90 md:backdrop-blur-xl
                        md:rounded-b-3xl
                        md:border-b md:border-x md:border-slate-200/80
                        md:shadow-2xl md:shadow-slate-300/30
                        pointer-events-auto hide-scrollbar scroll-smooth
                    "
                >
                    {displayGroups.map(([communityName, commProjects]) => {
                        const isPlaying = playingCommunity === communityName;
                        return (
                            <React.Fragment key={communityName}>
                                {/* Desktop-only sticky community header with Play Tour button */}
                                <div className="hidden md:flex sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md py-2 px-3 border-b border-slate-100 items-center gap-2 shrink-0">
                                    <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.18em] truncate flex-1">
                                        {communityName}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 shrink-0 mr-1">
                                        {commProjects.length}
                                    </span>

                                    {/* Play Tour / Stop button with SVG progress ring */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); togglePlay(communityName, commProjects); }}
                                        aria-label={isPlaying ? `Stop tour for ${communityName}` : `Start tour for ${communityName}`}
                                        className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 shrink-0 ${isPlaying
                                            ? 'bg-rose-500 text-white shadow-md hover:bg-rose-600'
                                            : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                                            }`}
                                    >
                                        {isPlaying ? (
                                            /* SVG progress ring wrapping stop square */
                                            <div className="relative w-3.5 h-3.5 flex items-center justify-center">
                                                <svg
                                                    className="absolute inset-0 w-full h-full -rotate-90"
                                                    viewBox="0 0 36 36"
                                                >
                                                    {/* Background track */}
                                                    <circle
                                                        cx="18" cy="18" r="14"
                                                        fill="none"
                                                        stroke="rgba(255,255,255,0.3)"
                                                        strokeWidth="4"
                                                    />
                                                    {/* Animated fill ring */}
                                                    <circle
                                                        cx="18" cy="18" r="14"
                                                        fill="none"
                                                        stroke="white"
                                                        strokeWidth="4"
                                                        strokeLinecap="round"
                                                        strokeDasharray={RING_C}
                                                        strokeDashoffset={ringOffset}
                                                        style={{ transition: 'stroke-dashoffset 75ms linear' }}
                                                    />
                                                </svg>
                                                {/* Tiny stop square centred inside ring */}
                                                <Square className="w-1.5 h-1.5 fill-current relative z-10" />
                                            </div>
                                        ) : (
                                            <Play className="w-2.5 h-2.5 fill-current" />
                                        )}
                                        {isPlaying ? 'Stop' : 'Tour'}
                                    </button>
                                </div>

                                {/* Project cards */}
                                {commProjects.map((project, idx) => renderCard(project, idx))}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Right arrow — mobile only */}
                <button
                    onClick={() => scrollHorizontal('right')}
                    aria-label="Scroll right to next properties"
                    className="hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/90 text-blue-600 rounded-full shadow-lg pointer-events-auto border border-slate-100 transition-all hover:bg-white active:scale-95"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default FilteredProjectsCarousel;
