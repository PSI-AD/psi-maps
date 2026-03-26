import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Landmark } from '../types';
import { X, MapPin, ExternalLink, ChevronRight, ChevronLeft, Play, Pause, Navigation } from 'lucide-react';
import { distance as turfDistance } from '@turf/distance';

interface Props {
    landmark: Landmark;
    allLandmarks: Landmark[];
    onClose: () => void;
    onNavigate: (landmark: Landmark) => void;
}

// ── Per-category default facts when the DB has none ──────────────────────────
const DEFAULT_FACTS: Record<string, string[]> = {
    Hotel: [
        `A landmark of ultra-luxury hospitality in the UAE.`,
        `Consistently ranked among the world's top lifestyle destinations.`,
        `Steps from the property, dramatically elevating resale appeal.`,
    ],
    School: [
        `Accredited under international curriculum standards.`,
        `Within the catchment area — a major draw for family buyers.`,
        `Top-tier educational facilities increase property desirability.`,
    ],
    Culture: [
        `A globally recognised landmark on the world cultural stage.`,
        `Attracts millions of international visitors annually.`,
        `Proximity to landmark culture is a proven price driver.`,
    ],
    Leisure: [
        `World-class recreational facilities accessible minutes away.`,
        `An anchor for lifestyle branding in marketing materials.`,
        `Consistent footfall makes the surrounding area highly sought-after.`,
    ],
    Retail: [
        `A premium retail anchor serving the catchment community.`,
        `Leading international and luxury brands represented.`,
        `Walkable distance makes the neighbourhood exceptionally liveable.`,
    ],
    Hospital: [
        `A JCI-accredited facility meeting international care standards.`,
        `Peace of mind for families — a critical buyer consideration.`,
        `Response times under 10 minutes from the development.`,
    ],
    Airport: [
        `Direct international connectivity to over 150 destinations.`,
        `Sub-30-minute transfer time — ideal for global investors.`,
        `A key driver of capital appreciation in the surrounding area.`,
    ],
    Port: [
        `A gateway for international maritime trade and tourism.`,
        `Iconic waterfront views add significant lifestyle value.`,
        `Cruise and super-yacht berths adjacent to the community.`,
    ],
};

// Category colors for accent
const CATEGORY_STYLES: Record<string, { gradient: string; accent: string; bg: string; border: string }> = {
    hotel:       { gradient: 'from-violet-600 to-violet-800',  accent: 'text-violet-300',  bg: 'bg-violet-500/20', border: 'border-violet-500/30' },
    school:      { gradient: 'from-emerald-600 to-emerald-800', accent: 'text-emerald-300', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
    culture:     { gradient: 'from-purple-600 to-purple-800',  accent: 'text-purple-300',  bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    leisure:     { gradient: 'from-teal-600 to-teal-800',      accent: 'text-teal-300',    bg: 'bg-teal-500/20', border: 'border-teal-500/30' },
    retail:      { gradient: 'from-rose-600 to-rose-800',      accent: 'text-rose-300',    bg: 'bg-rose-500/20', border: 'border-rose-500/30' },
    hospital:    { gradient: 'from-red-600 to-red-800',        accent: 'text-red-300',     bg: 'bg-red-500/20', border: 'border-red-500/30' },
    airport:     { gradient: 'from-sky-600 to-sky-800',        accent: 'text-sky-300',     bg: 'bg-sky-500/20', border: 'border-sky-500/30' },
    port:        { gradient: 'from-cyan-600 to-cyan-800',      accent: 'text-cyan-300',    bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    park:        { gradient: 'from-lime-600 to-lime-800',      accent: 'text-lime-300',    bg: 'bg-lime-500/20', border: 'border-lime-500/30' },
    hypermarket: { gradient: 'from-fuchsia-600 to-fuchsia-800', accent: 'text-fuchsia-300', bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500/30' },
    beach:       { gradient: 'from-cyan-500 to-cyan-700',      accent: 'text-cyan-300',    bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
};
const defaultStyle = { gradient: 'from-slate-600 to-slate-800', accent: 'text-blue-300', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };

const MAX_FACTS = 3;

const getFacts = (landmark: Landmark): string[] => {
    if (landmark.facts && landmark.facts.length > 0) return landmark.facts.slice(0, MAX_FACTS);
    const defaults = DEFAULT_FACTS[landmark.category] ?? [
        `An iconic landmark in ${landmark.community}.`,
        `A premier destination for ${landmark.category?.toLowerCase()} enthusiasts.`,
        `Proximity drives neighbourhood prestige and resale value.`,
    ];
    return defaults.slice(0, MAX_FACTS);
};

/** Try to fetch a thumbnail from Wikipedia using SEARCH first (prevents 404s) */
const fetchWikiImage = async (name: string): Promise<string | null> => {
    try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;
        const searchData = await searchRes.json();
        const firstResult = searchData?.query?.search?.[0];
        if (!firstResult) return null;
        const title = firstResult.title.replace(/\s+/g, '_');
        const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!summaryRes.ok) return null;
        const summaryData = await summaryRes.json();
        return summaryData.originalimage?.source || summaryData.thumbnail?.source || null;
    } catch {
        return null;
    }
};

// ── Component ─────────────────────────────────────────────────────────────────
const LandmarkInfoModal: React.FC<Props> = ({ landmark, allLandmarks, onClose, onNavigate }) => {
    const [wikiImage, setWikiImage] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playlistRef = useRef<(Landmark & { _dist: number })[] | null>(null);

    const facts = getFacts(landmark);
    const catStyle = CATEGORY_STYLES[landmark.category?.toLowerCase()] ?? defaultStyle;

    const hasDbImages = (landmark.images && landmark.images.length > 0) || !!landmark.imageUrl;
    const dbImage = landmark.images?.[0] || landmark.imageUrl;

    // Build a STABLE playlist: computed once from the first landmark opened.
    // The playlist order stays fixed as you navigate through it.
    const nearbyLandmarks = useMemo(() => {
        // If we already have a playlist, keep it stable
        if (playlistRef.current) return playlistRef.current;

        if (!allLandmarks || allLandmarks.length === 0) return [];
        const currentCoord: [number, number] = [Number(landmark.longitude), Number(landmark.latitude)];
        const sorted = allLandmarks
            .filter(l => l.id !== landmark.id && !l.isHidden && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude)))
            .map(l => ({
                ...l,
                _dist: turfDistance(currentCoord, [Number(l.longitude), Number(l.latitude)], { units: 'kilometers' }),
            }))
            .sort((a, b) => a._dist - b._dist);
        playlistRef.current = sorted;
        return sorted;
    }, [allLandmarks]); // Only recompute if allLandmarks changes, NOT on landmark navigation

    // Wikipedia image fetch
    useEffect(() => {
        if (hasDbImages) return;
        let cancelled = false;
        setWikiImage(null);
        setImageLoaded(false);
        setImageFailed(false);
        fetchWikiImage(landmark.name).then(url => {
            if (!cancelled && url) setWikiImage(url);
        });
        return () => { cancelled = true; };
    }, [landmark.name, hasDbImages]);

    // Reset image state when landmark changes
    useEffect(() => {
        setImageLoaded(false);
        setImageFailed(false);
    }, [landmark.id]);

    const thumbnailUrl = dbImage || wikiImage;
    const showImage = thumbnailUrl && !imageFailed;

    // Track position in the playlist
    const playlistIdx = useRef(0);

    // Navigate to the next landmark in the playlist
    const goNext = useCallback(() => {
        if (nearbyLandmarks.length === 0) return;
        playlistIdx.current = (playlistIdx.current + 1) % nearbyLandmarks.length;
        onNavigate(nearbyLandmarks[playlistIdx.current]);
    }, [nearbyLandmarks, onNavigate]);

    // Navigate to the previous landmark in the playlist
    const goPrev = useCallback(() => {
        if (nearbyLandmarks.length === 0) return;
        playlistIdx.current = playlistIdx.current > 0 ? playlistIdx.current - 1 : nearbyLandmarks.length - 1;
        onNavigate(nearbyLandmarks[playlistIdx.current]);
    }, [nearbyLandmarks, onNavigate]);

    // Auto-play: cycle through nearby landmarks
    useEffect(() => {
        if (isAutoPlaying && nearbyLandmarks.length > 0) {
            autoPlayRef.current = setInterval(() => {
                goNext();
            }, 4000);
        }
        return () => {
            if (autoPlayRef.current) clearInterval(autoPlayRef.current);
        };
    }, [isAutoPlaying, goNext, nearbyLandmarks.length]);

    const toggleAutoPlay = () => {
        setIsAutoPlaying(prev => !prev);
    };

    // Escape key to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, goNext, goPrev]);

    // Community / neighborhood label
    const neighborhoodLabel = landmark.community
        ? `${landmark.community} Neighborhood`
        : landmark.city
            ? `${landmark.city} Area`
            : 'Nearby Area';

    // Next landmark preview info — based on stable playlist position
    const nextPlaylistIdx = nearbyLandmarks.length > 0 ? (playlistIdx.current + 1) % nearbyLandmarks.length : -1;
    const nextLandmark = nextPlaylistIdx >= 0 ? nearbyLandmarks[nextPlaylistIdx] : null;
    const currentPlaylistPosition = `${playlistIdx.current + 1}/${nearbyLandmarks.length}`;

    return (
        <>
            {/* Transparent backdrop — clicking it closes */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={onClose}
            />

            {/* ── Compact card ──
                Desktop (lg+): BOTTOM-RIGHT, above the command bar
                Tablet/Mobile (<lg): bottom center, full-width card
            */}
            <div className={`
                fixed z-[9999] animate-in fade-in duration-300
                left-3 right-3 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)]
                lg:left-auto lg:right-6 lg:bottom-20 lg:w-[420px]
                slide-in-from-bottom-4
            `}>
                <div className="bg-slate-950 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">

                    {/* Neighborhood header strip */}
                    <div className={`px-4 py-2 bg-gradient-to-r ${catStyle.gradient} flex items-center justify-between`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Navigation className="w-3.5 h-3.5 text-white/80" />
                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/90 truncate">
                                {neighborhoodLabel}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {/* Playlist position */}
                            {nearbyLandmarks.length > 0 && (
                                <span className="text-[9px] font-bold text-white/50 mr-1">{currentPlaylistPosition}</span>
                            )}
                            {/* Play/Pause auto-tour */}
                            {nearbyLandmarks.length > 0 && (
                                <button
                                    onClick={toggleAutoPlay}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isAutoPlaying
                                        ? 'bg-white/30 text-white shadow-lg shadow-white/10'
                                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                                        }`}
                                    title={isAutoPlaying ? 'Pause neighborhood tour' : 'Play neighborhood tour'}
                                >
                                    {isAutoPlaying
                                        ? <Pause className="w-3.5 h-3.5" />
                                        : <Play className="w-3.5 h-3.5 ml-0.5" />
                                    }
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Content row: Image + Text side-by-side on desktop, stacked on mobile */}
                    <div className="flex lg:flex-row flex-col">
                        {/* Image — small thumbnail on desktop, strip on mobile */}
                        {showImage && (
                            <div className="relative lg:w-[120px] lg:h-auto h-24 w-full overflow-hidden shrink-0">
                                <img
                                    src={thumbnailUrl!}
                                    alt={landmark.name}
                                    className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                    onLoad={() => setImageLoaded(true)}
                                    onError={() => setImageFailed(true)}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950/40" />

                                {/* Category badge */}
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur text-[9px] font-black uppercase tracking-widest text-slate-200 border border-slate-600/40">
                                    {landmark.category}
                                </div>
                            </div>
                        )}

                        {/* Text content */}
                        <div className="p-4 flex-1 min-w-0">
                            {/* Header — name + location */}
                            <div className="mb-2.5">
                                {!showImage && (
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${catStyle.gradient} mb-2`}>
                                        <span className="text-white text-[9px] font-black uppercase tracking-widest">{landmark.category}</span>
                                    </div>
                                )}
                                <h3 className="text-base font-black text-white leading-tight mb-1">{landmark.name}</h3>
                                <div className="flex items-center gap-1.5">
                                    <MapPin className={`w-3 h-3 ${catStyle.accent}`} />
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${catStyle.accent}`}>
                                        {landmark.community}{landmark.city ? `, ${landmark.city}` : ''}
                                    </span>
                                </div>
                                {landmark.domain && (
                                    <a
                                        href={`https://${landmark.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 mt-1 text-[10px] text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {landmark.domain}
                                    </a>
                                )}
                            </div>

                            {/* Facts — max 3 bullet points */}
                            <div className={`space-y-1.5 p-3 rounded-xl ${catStyle.bg} ${catStyle.border} border`}>
                                {facts.map((fact, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white/60 mt-[6px] shrink-0" />
                                        <p className="text-[12px] leading-snug text-white/90 font-medium">
                                            {fact}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Navigation: Prev / Next nearby landmark — compact row */}
                    {nearbyLandmarks.length > 0 && (
                        <div className="flex items-center gap-2 border-t border-slate-700/50 px-4 py-2.5">
                            <button
                                onClick={goPrev}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors shrink-0"
                                title="Previous in playlist"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            {/* Next landmark preview */}
                            <div className="flex-1 min-w-0 text-center">
                                {nextLandmark && (
                                    <div className="flex flex-col items-center gap-0">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                            Next in playlist
                                        </span>
                                        <span className="text-[11px] font-bold text-slate-300 truncate max-w-full">
                                            {nextLandmark.name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={goNext}
                                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors shrink-0"
                                title="Next in playlist"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Auto-play indicator */}
                    {isAutoPlaying && (
                        <div className="flex items-center justify-center gap-1.5 pb-2">
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-blue-400">
                                Touring Neighborhood
                            </span>
                            <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default LandmarkInfoModal;
