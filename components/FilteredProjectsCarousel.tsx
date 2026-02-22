import React, { useRef } from 'react';
import { Project } from '../types';
import { MapPin, Building, BedDouble, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getOptimizedImageUrl } from '../utils/imageHelpers';

interface FilteredProjectsCarouselProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    isVisible: boolean;
    onDismiss?: () => void;
}

const FilteredProjectsCarousel: React.FC<FilteredProjectsCarouselProps> = ({
    projects,
    onSelectProject,
    isVisible,
    onDismiss,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    if (!isVisible || projects.length === 0) return null;

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
        }
    };

    return (
        <div className="absolute bottom-[80px] left-0 w-full z-[4000] pointer-events-none flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
            {/* Count badge + dismiss */}
            <div className="flex items-center gap-2 mb-2 pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-md text-slate-700 text-[10px] font-black uppercase tracking-[0.18em] px-3 py-1.5 rounded-full shadow-md border border-slate-100">
                    {projects.length} propert{projects.length === 1 ? 'y' : 'ies'} found
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="p-1.5 bg-white/90 backdrop-blur-md text-slate-400 hover:text-slate-700 rounded-full shadow-md border border-slate-100 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            <div className="relative w-full max-w-[1920px] px-2 md:px-12 flex items-center justify-center">
                {/* Left Arrow */}
                <button
                    onClick={() => scroll('left')}
                    className="hidden md:flex absolute left-4 z-10 p-3 bg-white/90 hover:bg-white text-blue-600 rounded-full shadow-xl pointer-events-auto backdrop-blur-md transition-all active:scale-95 border border-slate-100"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Cards container */}
                <div
                    ref={scrollRef}
                    className="flex gap-3 md:gap-4 overflow-x-auto pb-4 pt-2 pointer-events-auto snap-x snap-mandatory hide-scrollbar w-full scroll-smooth px-2 md:px-4"
                >
                    {projects.slice(0, 50).map(project => (
                        <div
                            key={project.id}
                            onClick={() => onSelectProject(project)}
                            className="shrink-0 w-[82vw] sm:w-[300px] md:w-[340px] bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] border border-slate-100/80 p-3 flex gap-3 cursor-pointer hover:bg-white transition-all duration-300 snap-center group hover:-translate-y-1"
                        >
                            {/* Thumbnail */}
                            <div className="w-[90px] h-[90px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-xl overflow-hidden bg-slate-100 relative shadow-sm">
                                <img
                                    src={getOptimizedImageUrl(
                                        (project as any).thumbnailUrl || ((project as any).images?.[0]) || '',
                                        300, 300
                                    )}
                                    alt={project.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                {project.status && (
                                    <div className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                                        {project.status === 'Completed' ? 'Ready' : project.status}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex flex-col justify-center flex-1 min-w-0 py-0.5">
                                <h3 className="text-sm font-black text-slate-900 truncate tracking-tight leading-tight">{project.name}</h3>
                                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.15em] truncate mt-0.5 mb-1.5">
                                    {(project as any).developerName || 'Exclusive'}
                                </p>

                                <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 truncate mb-auto">
                                    <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                                    <span className="truncate">{project.community}{project.city ? `, ${project.city}` : ''}</span>
                                </div>

                                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-100/80">
                                    {(project as any).priceRange && (
                                        <div className="flex items-center gap-1">
                                            <Building className="w-3 h-3 text-blue-500" />
                                            <span className="text-[10px] font-black text-slate-700 truncate">
                                                {(project as any).priceRange.toString().split('-')[0].trim()}
                                            </span>
                                        </div>
                                    )}
                                    {(project as any).bedrooms &&
                                        (project as any).bedrooms !== 'N/A' &&
                                        (project as any).bedrooms !== '0' && (
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
                    ))}
                </div>

                {/* Right Arrow */}
                <button
                    onClick={() => scroll('right')}
                    className="hidden md:flex absolute right-4 z-10 p-3 bg-white/90 hover:bg-white text-blue-600 rounded-full shadow-xl pointer-events-auto backdrop-blur-md transition-all active:scale-95 border border-slate-100"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>
        </div>
    );
};

export default FilteredProjectsCarousel;
