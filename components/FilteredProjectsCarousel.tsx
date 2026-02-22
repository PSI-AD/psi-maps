import React, { useRef, useEffect } from 'react';
import { Project } from '../types';
import { MapPin, Building, BedDouble, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Two-way sync: auto-scroll to the active / hovered project ──────────
    useEffect(() => {
        const targetId = hoveredProjectId || selectedProjectId;
        if (!targetId) return;
        const el = itemRefs.current[targetId];
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [hoveredProjectId, selectedProjectId]);

    if (!isVisible || projects.length === 0) return null;

    const scrollHorizontal = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
    };

    return (
        <div className="absolute z-[4000] pointer-events-none transition-all duration-500
            /* ── Mobile: horizontal strip above dock ── */
            bottom-[88px] left-0 w-full
            /* ── Desktop: vertical left panel ── */
            md:bottom-[96px] md:top-[80px] md:left-6 md:w-[360px]
            flex flex-col
            animate-in fade-in slide-in-from-bottom-6 md:slide-in-from-left-6 duration-400"
        >

            {/* ── Desktop panel header ── */}
            <div className="hidden md:flex items-center justify-between px-5 py-3.5 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-t-3xl pointer-events-auto shadow-lg shrink-0">
                <div>
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Filtered Results</p>
                    <h3 className="font-black text-slate-900 tracking-tight text-base">{projects.length} Propert{projects.length === 1 ? 'y' : 'ies'}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            title="Clear filters"
                            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors pointer-events-auto"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Mobile count badge + dismiss ── */}
            <div className="flex md:hidden items-center justify-center gap-2 mb-2 pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md text-slate-700 text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full shadow-md border border-slate-100">
                    {projects.length} propert{projects.length === 1 ? 'y' : 'ies'}
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-1.5 bg-white/90 backdrop-blur-md text-slate-400 hover:text-slate-700 rounded-full shadow-md border border-slate-100 transition-colors pointer-events-auto"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* ── Scroll containers (horizontal mobile / vertical desktop) ── */}
            <div className="relative flex-1 min-h-0">

                {/* Horizontal arrow buttons — desktop only */}
                <button
                    onClick={() => scrollHorizontal('left')}
                    className="hidden md:hidden absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/90 text-blue-600 rounded-full shadow-lg pointer-events-auto border border-slate-100 transition-all hover:bg-white active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                <div
                    ref={scrollRef}
                    className="
                        /* mobile: horizontal row */
                        flex gap-3 overflow-x-auto
                        snap-x snap-mandatory
                        pb-3 pt-1 px-3
                        /* desktop: vertical column */
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
                    {projects.map((project, idx) => {
                        const isSelected = selectedProjectId === project.id;
                        const isHovered = hoveredProjectId === project.id;
                        const isActive = isSelected || isHovered;

                        return (
                            <div
                                key={project.id}
                                ref={el => { itemRefs.current[project.id] = el; }}
                                onClick={() => onSelectProject(project)}
                                onMouseEnter={() => {
                                    setHoveredProjectId?.(project.id);
                                    const lng = Number(project.longitude);
                                    const lat = Number(project.latitude);
                                    if (onFlyTo && !isNaN(lng) && !isNaN(lat) && lng !== 0 && lat !== 0) {
                                        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                                        hoverTimeout.current = setTimeout(() => {
                                            onFlyTo(lng, lat, 16);
                                        }, 300);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setHoveredProjectId?.(null);
                                    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
                                }}
                                className={`
                                    /* mobile card */
                                    shrink-0 w-[82vw] sm:w-[300px] snap-center
                                    /* desktop card */
                                    md:w-full md:shrink-0 md:rounded-none
                                    ${idx === 0 ? '' : 'md:border-t md:border-slate-100'}
                                    ${idx === projects.length - 1 ? 'md:rounded-b-3xl' : ''}
                                    /* shared */
                                    bg-white rounded-2xl p-3 flex gap-3 cursor-pointer
                                    transition-all duration-200
                                    border-2
                                    ${isActive
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
                                    <h3 className={`text-sm font-black truncate tracking-tight leading-tight transition-colors ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
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
                                        {(project as any).priceRange && (
                                            <div className="flex items-center gap-1">
                                                <Building className="w-3 h-3 text-blue-400" />
                                                <span className="text-[10px] font-black text-slate-700 truncate">
                                                    {(project as any).priceRange.toString().split('-')[0].trim()}
                                                </span>
                                            </div>
                                        )}
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
                    })}
                </div>

                <button
                    onClick={() => scrollHorizontal('right')}
                    className="hidden md:hidden absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2.5 bg-white/90 text-blue-600 rounded-full shadow-lg pointer-events-auto border border-slate-100 transition-all hover:bg-white active:scale-95"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default FilteredProjectsCarousel;
