import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Landmark, Project } from '../types';
import { X, MapPin, ExternalLink, ChevronRight, ChevronLeft, Play, Pause, Navigation, Building2, MapPinned } from 'lucide-react';
import { distance as turfDistance } from '@turf/distance';

interface Props {
    landmark: Landmark;
    allLandmarks: Landmark[];
    onClose: () => void;
    onNavigate: (landmark: Landmark) => void;
    /** Projects near this landmark (pre-filtered by parent) */
    nearbyProjects?: Project[];
    onSelectProject?: (id: string) => void;
    onHoverProject?: (id: string | null) => void;
}

// ── Per-category default facts ────────────────────────────────────────────────
const DEFAULT_FACTS: Record<string, string[]> = {
    Hotel:       [`A landmark of ultra-luxury hospitality in the UAE.`, `Steps from the property — dramatically elevating resale appeal.`, `Consistently ranked among the world's top lifestyle destinations.`],
    School:      [`Accredited under international curriculum standards.`, `Within the catchment area — a major draw for family buyers.`, `Top-tier facilities increase property desirability.`],
    Culture:     [`A globally recognised landmark on the world cultural stage.`, `Attracts millions of international visitors annually.`, `Proximity to landmark culture is a proven price driver.`],
    Leisure:     [`World-class recreational facilities accessible minutes away.`, `An anchor for lifestyle branding in marketing materials.`, `Consistent footfall makes the surrounding area highly sought-after.`],
    Retail:      [`A premium retail anchor serving the catchment community.`, `Leading international and luxury brands represented.`, `Walkable distance makes the neighbourhood exceptionally liveable.`],
    Hospital:    [`A JCI-accredited facility meeting international care standards.`, `Peace of mind for families — a critical buyer consideration.`, `Response times under 10 minutes from the development.`],
    Airport:     [`Direct international connectivity to over 150 destinations.`, `Sub-30-minute transfer — ideal for global investors.`, `A key driver of capital appreciation in the surrounding area.`],
    Port:        [`A gateway for international maritime trade and tourism.`, `Iconic waterfront views add significant lifestyle value.`, `Cruise and super-yacht berths adjacent to the community.`],
};

const CATEGORY_STYLES: Record<string, { gradient: string; accent: string; bg: string; border: string }> = {
    hotel:       { gradient: 'from-violet-600 to-violet-800',    accent: 'text-violet-300',   bg: 'bg-violet-500/20',  border: 'border-violet-500/30' },
    school:      { gradient: 'from-emerald-600 to-emerald-800',  accent: 'text-emerald-300',  bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    culture:     { gradient: 'from-purple-600 to-purple-800',    accent: 'text-purple-300',   bg: 'bg-purple-500/20',  border: 'border-purple-500/30' },
    leisure:     { gradient: 'from-teal-600 to-teal-800',        accent: 'text-teal-300',     bg: 'bg-teal-500/20',    border: 'border-teal-500/30' },
    retail:      { gradient: 'from-rose-600 to-rose-800',        accent: 'text-rose-300',     bg: 'bg-rose-500/20',    border: 'border-rose-500/30' },
    hospital:    { gradient: 'from-red-600 to-red-800',          accent: 'text-red-300',      bg: 'bg-red-500/20',     border: 'border-red-500/30' },
    airport:     { gradient: 'from-sky-600 to-sky-800',          accent: 'text-sky-300',      bg: 'bg-sky-500/20',     border: 'border-sky-500/30' },
    port:        { gradient: 'from-cyan-600 to-cyan-800',        accent: 'text-cyan-300',     bg: 'bg-cyan-500/20',    border: 'border-cyan-500/30' },
    park:        { gradient: 'from-lime-600 to-lime-800',        accent: 'text-lime-300',     bg: 'bg-lime-500/20',    border: 'border-lime-500/30' },
    hypermarket: { gradient: 'from-fuchsia-600 to-fuchsia-800',  accent: 'text-fuchsia-300',  bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30' },
    beach:       { gradient: 'from-cyan-500 to-cyan-700',        accent: 'text-cyan-300',     bg: 'bg-cyan-500/20',    border: 'border-cyan-500/30' },
};
const defaultStyle = { gradient: 'from-slate-600 to-slate-800', accent: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };

const getFacts = (landmark: Landmark): string[] => {
    if (landmark.facts && landmark.facts.length > 0) return landmark.facts.slice(0, 3);
    const defaults = DEFAULT_FACTS[landmark.category] ?? [
        `An iconic landmark in ${landmark.community}.`,
        `A premier destination for ${landmark.category?.toLowerCase()} enthusiasts.`,
        `Proximity drives neighbourhood prestige and resale value.`,
    ];
    return defaults.slice(0, 3);
};

/** Wikipedia image fetch */
const fetchWikiImage = async (name: string): Promise<string | null> => {
    try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json&origin=*`);
        if (!searchRes.ok) return null;
        const searchData = await searchRes.json();
        const firstResult = searchData?.query?.search?.[0];
        if (!firstResult) return null;
        const title = firstResult.title.replace(/\s+/g, '_');
        const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!summaryRes.ok) return null;
        const summaryData = await summaryRes.json();
        return summaryData.originalimage?.source || summaryData.thumbnail?.source || null;
    } catch { return null; }
};

// ── Component ─────────────────────────────────────────────────────────────────
const LandmarkInfoModal: React.FC<Props> = ({
    landmark, allLandmarks, onClose, onNavigate,
    nearbyProjects = [], onSelectProject, onHoverProject,
}) => {
    // ── View state: 'landmark' | 'properties' ────────────────────────────────
    const [view, setView] = useState<'landmark' | 'properties'>('landmark');
    const [wikiImage, setWikiImage] = useState<string | null>(null);
    const [imageFailed, setImageFailed] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [isPropPlaying, setIsPropPlaying] = useState(false);
    const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const propPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const propPlayIdx = useRef(0);
    const playlistRef = useRef<(Landmark & { _dist: number })[] | null>(null);
    const playlistIdx = useRef(0);

    const facts = getFacts(landmark);
    const catStyle = CATEGORY_STYLES[landmark.category?.toLowerCase()] ?? defaultStyle;
    const hasDbImages = (landmark.images && landmark.images.length > 0) || !!landmark.imageUrl;
    const dbImage = landmark.images?.[0] || landmark.imageUrl;

    // Reset view when landmark changes
    useEffect(() => {
        setView('landmark');
        setImageFailed(false);
        setIsAutoPlaying(false);
        setIsPropPlaying(false);
        playlistIdx.current = 0;
        propPlayIdx.current = 0;
    }, [landmark.id]);

    // Build STABLE playlist once
    const nearbyLandmarks = useMemo(() => {
        if (playlistRef.current) return playlistRef.current;
        if (!allLandmarks || allLandmarks.length === 0) return [];
        const coord: [number, number] = [Number(landmark.longitude), Number(landmark.latitude)];
        const sorted = allLandmarks
            .filter(l => l.id !== landmark.id && !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
            .map(l => ({ ...l, _dist: turfDistance(coord, [Number(l.longitude), Number(l.latitude)], { units: 'kilometers' }) }))
            .sort((a, b) => a._dist - b._dist);
        playlistRef.current = sorted;
        return sorted;
    }, [allLandmarks]);

    // Sort nearby projects by distance
    const sortedProjects = useMemo(() => {
        if (!nearbyProjects || nearbyProjects.length === 0) return [];
        return [...nearbyProjects]
            .map(p => ({
                ...p,
                _dist: turfDistance(
                    [Number(landmark.longitude), Number(landmark.latitude)],
                    [Number(p.longitude), Number(p.latitude)],
                    { units: 'kilometers' }
                ),
            }))
            .sort((a, b) => a._dist - b._dist);
    }, [nearbyProjects, landmark.longitude, landmark.latitude]);

    // Wikipedia image fetch
    useEffect(() => {
        if (hasDbImages) return;
        let cancelled = false;
        setWikiImage(null);
        setImageFailed(false);
        fetchWikiImage(landmark.name).then(url => { if (!cancelled && url) setWikiImage(url); });
        return () => { cancelled = true; };
    }, [landmark.name, hasDbImages]);

    const thumbnailUrl = dbImage || wikiImage;
    const showImage = thumbnailUrl && !imageFailed;

    // Navigate landmark playlist
    const goNext = useCallback(() => {
        if (nearbyLandmarks.length === 0) return;
        playlistIdx.current = (playlistIdx.current + 1) % nearbyLandmarks.length;
        onNavigate(nearbyLandmarks[playlistIdx.current]);
    }, [nearbyLandmarks, onNavigate]);

    const goPrev = useCallback(() => {
        if (nearbyLandmarks.length === 0) return;
        playlistIdx.current = playlistIdx.current > 0 ? playlistIdx.current - 1 : nearbyLandmarks.length - 1;
        onNavigate(nearbyLandmarks[playlistIdx.current]);
    }, [nearbyLandmarks, onNavigate]);

    // Landmark auto-play
    useEffect(() => {
        if (isAutoPlaying && nearbyLandmarks.length > 0) {
            autoPlayRef.current = setInterval(goNext, 4000);
        }
        return () => { if (autoPlayRef.current) clearInterval(autoPlayRef.current); };
    }, [isAutoPlaying, goNext, nearbyLandmarks.length]);

    // Property auto-play
    useEffect(() => {
        if (isPropPlaying && sortedProjects.length > 0 && onSelectProject) {
            propPlayRef.current = setInterval(() => {
                propPlayIdx.current = (propPlayIdx.current + 1) % sortedProjects.length;
                onSelectProject(sortedProjects[propPlayIdx.current].id);
            }, 4000);
        }
        return () => { if (propPlayRef.current) clearInterval(propPlayRef.current); };
    }, [isPropPlaying, sortedProjects, onSelectProject]);

    // Keyboard
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, goNext, goPrev]);

    const neighborhoodLabel = landmark.community
        ? `${landmark.community}`
        : landmark.city ? landmark.city : 'Nearby Area';

    const nextPlaylistIdx = nearbyLandmarks.length > 0 ? (playlistIdx.current + 1) % nearbyLandmarks.length : -1;
    const nextLandmark = nextPlaylistIdx >= 0 ? nearbyLandmarks[nextPlaylistIdx] : null;
    const currentPos = nearbyLandmarks.length > 0 ? `${playlistIdx.current + 1}/${nearbyLandmarks.length}` : '';

    // ── SHARED CARD DIMENSIONS ─────────────────────────────────────────────
    // Fixed height: header strip (~36px) + content area (~112px) + nav row (~44px) = ~192px total
    // Image is shown ONLY as a small background behind the dark header gradient — never expands height.

    return (
        <>
            {/* Transparent backdrop */}
            <div className="fixed inset-0 z-[9998]" onClick={onClose} />

            {/* ── Card container — fixed position, fixed height ── */}
            <div className={`
                fixed z-[9999] animate-in fade-in duration-300
                left-3 right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+115px)]
                lg:right-auto lg:left-6 lg:bottom-20 lg:w-[420px]
                slide-in-from-bottom-4
            `}>

                {/* ── LANDMARK FACE ───────────────────────────────────── */}
                <div
                    className={`bg-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden transition-all duration-300 ${view === 'landmark' ? 'opacity-100 translate-y-0 relative z-10' : 'opacity-0 pointer-events-none absolute inset-0 z-0'}`}
                    style={{ minHeight: 0 }}
                >
                    {/* Header strip — image as bg overlay, never expands height */}
                    <div
                        className={`relative px-4 py-2.5 bg-gradient-to-r ${catStyle.gradient} flex items-center justify-between overflow-hidden`}
                        style={{ minHeight: '44px' }}
                    >
                        {/* Background image blended into gradient */}
                        {showImage && (
                            <img
                                src={thumbnailUrl!}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-luminosity"
                                onError={() => setImageFailed(true)}
                            />
                        )}
                        {/* Left: category tag + name + neighborhood */}
                        <div className="relative min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/60">{landmark.category}</span>
                                <span className="text-white/30 text-[8px]">·</span>
                                <span className="text-[8px] font-bold text-white/60 truncate">{neighborhoodLabel}</span>
                            </div>
                            <h3 className="text-sm font-black text-white leading-tight truncate">{landmark.name}</h3>
                            {landmark.domain && (
                                <a href={`https://${landmark.domain}`} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-0.5 mt-0.5 text-[9px] text-white/50 hover:text-white/80 transition-colors">
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    {landmark.domain}
                                </a>
                            )}
                        </div>
                        {/* Right: playlist pos + play + properties flip + close */}
                        <div className="relative flex items-center gap-1 shrink-0">
                            {nearbyLandmarks.length > 0 && (
                                <span className="text-[8px] font-bold text-white/40">{currentPos}</span>
                            )}
                            {nearbyLandmarks.length > 0 && (
                                <button onClick={() => setIsAutoPlaying(p => !p)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isAutoPlaying ? 'bg-white/30 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                                    title={isAutoPlaying ? 'Pause tour' : 'Auto-tour landmarks'}
                                >
                                    {isAutoPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-px" />}
                                </button>
                            )}
                            {/* Properties flip button */}
                            {nearbyProjects.length > 0 && (
                                <button
                                    onClick={() => setView('properties')}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/80 hover:bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider transition-all border border-amber-400/40"
                                    title="View nearby properties"
                                >
                                    <Building2 className="w-2.5 h-2.5" />
                                    <span>Properties</span>
                                </button>
                            )}
                            <button onClick={onClose}
                                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Facts — max 3 lines (line-clamp prevents height growth) */}
                    <div className="px-4 py-3">
                        <div className={`space-y-1.5 p-3 rounded-xl ${catStyle.bg} ${catStyle.border} border`}>
                            {facts.map((fact, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-[5px] shrink-0" />
                                    <p className="text-[11px] leading-snug text-white/85 font-medium line-clamp-2">{fact}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Prev / Next row */}
                    {nearbyLandmarks.length > 0 && (
                        <div className="flex items-center gap-2 border-t border-slate-700/50 px-4 py-2">
                            <button onClick={goPrev}
                                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors shrink-0">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex-1 min-w-0 text-center">
                                {nextLandmark && (
                                    <>
                                        <span className="block text-[7px] font-black uppercase tracking-widest text-slate-500">Next</span>
                                        <span className="block text-[10px] font-bold text-slate-300 truncate">{nextLandmark.name}</span>
                                    </>
                                )}
                            </div>
                            <button onClick={goNext}
                                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors shrink-0">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* ── PROPERTIES FACE ─────────────────────────────────── */}
                <div
                    className={`bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${view === 'properties' ? 'opacity-100 translate-y-0 relative z-10' : 'opacity-0 pointer-events-none absolute inset-0 z-0'}`}
                >
                    {/* Header */}
                    <div className="px-4 py-2.5 bg-slate-900 flex items-center justify-between gap-2" style={{ minHeight: '44px' }}>
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                            <div className="min-w-0">
                                <p className="text-[8px] font-black text-amber-400 uppercase tracking-[0.15em]">Properties near</p>
                                <p className="text-sm font-black text-white truncate">{landmark.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {/* Property auto-play */}
                            {sortedProjects.length > 1 && (
                                <button onClick={() => setIsPropPlaying(p => !p)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${isPropPlaying ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                                    title={isPropPlaying ? 'Pause tour' : 'Auto-tour properties'}
                                >
                                    {isPropPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-px" />}
                                </button>
                            )}
                            {/* Landmarks flip button */}
                            <button
                                onClick={() => setView('landmark')}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-[9px] font-black uppercase tracking-wider transition-all border border-slate-600"
                                title="Back to landmark"
                            >
                                <MapPinned className="w-2.5 h-2.5" />
                                <span>Landmark</span>
                            </button>
                            <button onClick={onClose}
                                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center text-white/70 hover:text-white transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Count row */}
                    <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                            {sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''} within 5 km
                        </p>
                    </div>

                    {/* List — scrollable, max 3 visible */}
                    <div className="overflow-y-auto" style={{ maxHeight: '132px' }}>
                        {sortedProjects.map(project => (
                            <button
                                key={project.id}
                                onClick={() => onSelectProject?.(project.id)}
                                onMouseEnter={() => onHoverProject?.(project.id)}
                                onMouseLeave={() => onHoverProject?.(null)}
                                className="w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                            >
                                <div className="w-10 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                                    <img src={(project as any).thumbnailUrl || (project as any).image || ''} alt="" loading="lazy" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-bold text-slate-900 truncate leading-tight">{project.name}</h4>
                                    <p className="text-[9px] text-slate-500 truncate">{project.community}</p>
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-wide truncate">{(project as any).developerName}</p>
                                </div>
                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded shrink-0">
                                    {(project as any)._dist?.toFixed(1) ?? '?'} km
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LandmarkInfoModal;
