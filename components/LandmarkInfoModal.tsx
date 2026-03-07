import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, Info, MapPin, ExternalLink } from 'lucide-react';

interface Props {
    landmark: Landmark;
    onClose: () => void;
}

// ── Per-category default facts when the DB has none ──────────────────────────
const DEFAULT_FACTS: Record<string, string[]> = {
    Hotel: [
        `A landmark of ultra-luxury hospitality in the UAE.`,
        `Consistently ranked among the world's top lifestyle destinations.`,
        `Steps from the property, dramatically elevating resale appeal.`,
        `Exclusive residences nearby command a significant lifestyle premium.`,
    ],
    School: [
        `Accredited under international curriculum standards.`,
        `Within the catchment area — a major draw for family buyers.`,
        `Top-tier educational facilities increase property desirability.`,
        `One of the highest-rated institutions in the community.`,
    ],
    Culture: [
        `A globally recognised landmark on the world cultural stage.`,
        `Attracts millions of international visitors annually.`,
        `Proximity to landmark culture is a proven price driver.`,
        `Architecture alone makes it one of the UAE's most iconic silhouettes.`,
    ],
    Leisure: [
        `World-class recreational facilities accessible minutes away.`,
        `An anchor for lifestyle branding in marketing materials.`,
        `Consistent footfall makes the surrounding area highly sought-after.`,
        `Exclusive membership access often available to residents.`,
    ],
    Retail: [
        `A premium retail anchor serving the catchment community.`,
        `Leading international and luxury brands represented.`,
        `Walkable distance makes the neighbourhood exceptionally liveable.`,
        `High footfall drives neighbourhood vibrancy and long-term value.`,
    ],
    Hospital: [
        `A JCI-accredited facility meeting international care standards.`,
        `Peace of mind for families — a critical buyer consideration.`,
        `Response times under 10 minutes from the development.`,
        `Specialist and emergency care available 24/7.`,
    ],
    Airport: [
        `Direct international connectivity to over 150 destinations.`,
        `Sub-30-minute transfer time — ideal for global investors.`,
        `A key driver of capital appreciation in the surrounding area.`,
        `Major expansion plans underway to further boost regional status.`,
    ],
    Port: [
        `A gateway for international maritime trade and tourism.`,
        `Iconic waterfront views add significant lifestyle value.`,
        `Cruise and super-yacht berths adjacent to the community.`,
        `A focal point for the UAE's rising maritime economy.`,
    ],
};

// Category icons + colors for the text-only header
const CATEGORY_STYLES: Record<string, { gradient: string; accent: string }> = {
    hotel: { gradient: 'from-violet-600 to-violet-800', accent: 'text-violet-300' },
    school: { gradient: 'from-emerald-600 to-emerald-800', accent: 'text-emerald-300' },
    culture: { gradient: 'from-purple-600 to-purple-800', accent: 'text-purple-300' },
    leisure: { gradient: 'from-teal-600 to-teal-800', accent: 'text-teal-300' },
    retail: { gradient: 'from-rose-600 to-rose-800', accent: 'text-rose-300' },
    hospital: { gradient: 'from-red-600 to-red-800', accent: 'text-red-300' },
    airport: { gradient: 'from-sky-600 to-sky-800', accent: 'text-sky-300' },
    port: { gradient: 'from-cyan-600 to-cyan-800', accent: 'text-cyan-300' },
    park: { gradient: 'from-lime-600 to-lime-800', accent: 'text-lime-300' },
    hypermarket: { gradient: 'from-fuchsia-600 to-fuchsia-800', accent: 'text-fuchsia-300' },
    beach: { gradient: 'from-cyan-500 to-cyan-700', accent: 'text-cyan-300' },
};

const defaultStyle = { gradient: 'from-slate-600 to-slate-800', accent: 'text-blue-300' };

const getFacts = (landmark: Landmark): string[] => {
    if (landmark.facts && landmark.facts.length > 0) return landmark.facts;
    return (
        DEFAULT_FACTS[landmark.category] ?? [
            `An iconic landmark in ${landmark.community}.`,
            `A premier destination for ${landmark.category.toLowerCase()} enthusiasts.`,
            `World-class architecture and design recognised globally.`,
            `Proximity drives neighbourhood prestige and resale value.`,
        ]
    );
};

/** Try to fetch a thumbnail from Wikipedia using SEARCH first (prevents 404s) */
const fetchWikiImage = async (name: string): Promise<string | null> => {
    try {
        // Step 1: Search Wikipedia for the correct article title
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&format=json&origin=*`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) return null;
        const searchData = await searchRes.json();
        const firstResult = searchData?.query?.search?.[0];
        if (!firstResult) return null;

        // Step 2: Fetch page summary using the correct title
        const title = firstResult.title.replace(/\s+/g, '_');
        const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!summaryRes.ok) return null;
        const summaryData = await summaryRes.json();
        return summaryData.originalimage?.source || summaryData.thumbnail?.source || null;
    } catch {
        return null;
    }
};

/** Mapbox satellite static image fallback */
const getMapboxSatelliteUrl = (lat?: number | string, lng?: number | string): string | null => {
    const numLat = Number(lat);
    const numLng = Number(lng);
    if (!lat || !lng || isNaN(numLat) || isNaN(numLng)) return null;
    const token = (import.meta as any).env?.VITE_MAPBOX_TOKEN;
    if (!token) return null;
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${numLng},${numLat},16,0/600x400@2x?access_token=${token}`;
};

// ── Component ─────────────────────────────────────────────────────────────────
const LandmarkInfoModal: React.FC<Props> = ({ landmark, onClose }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [wikiImage, setWikiImage] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);

    const facts = getFacts(landmark);
    const catStyle = CATEGORY_STYLES[landmark.category?.toLowerCase()] ?? defaultStyle;

    // Check for existing images from the database first, else try Wikipedia, then Mapbox satellite
    const hasDbImages = (landmark.images && landmark.images.length > 0) || !!landmark.imageUrl;
    const dbImage = landmark.images?.[0] || landmark.imageUrl;

    // Attempt Wikipedia image fetch only if no DB images
    useEffect(() => {
        if (hasDbImages) return;
        let cancelled = false;
        fetchWikiImage(landmark.name).then(url => {
            if (!cancelled) {
                if (url) {
                    setWikiImage(url);
                } else {
                    // Fallback: Mapbox satellite view
                    const satUrl = getMapboxSatelliteUrl(landmark.latitude, landmark.longitude);
                    if (satUrl) setWikiImage(satUrl);
                }
            }
        });
        return () => { cancelled = true; };
    }, [landmark.name, hasDbImages, landmark.latitude, landmark.longitude]);

    const thumbnailUrl = dbImage || wikiImage;
    const showImage = thumbnailUrl && !imageFailed;

    // Auto-advance every 5 s — pause while user hovers the facts panel
    useEffect(() => {
        if (isHovered) return;
        const t = setInterval(() => setActiveIdx((p) => (p + 1) % facts.length), 5000);
        return () => clearInterval(t);
    }, [facts.length, isHovered]);

    // Keyboard navigation + Escape close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); return; }
            if (e.key === 'ArrowRight') setActiveIdx((p) => (p + 1) % facts.length);
            if (e.key === 'ArrowLeft') setActiveIdx((p) => (p - 1 + facts.length) % facts.length);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [facts.length, onClose]);

    const next = () => setActiveIdx((p) => (p + 1) % facts.length);
    const prev = () => setActiveIdx((p) => (p - 1 + facts.length) % facts.length);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Blurred dark backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                onClick={onClose}
            />

            <div
                className="bg-slate-900 border border-slate-700/60 rounded-[2rem] w-full overflow-hidden shadow-2xl shadow-black/60 relative z-10 flex flex-col"
                style={{ maxWidth: showImage ? '64rem' : '40rem', maxHeight: 'min(85vh, 600px)', height: isCollapsed ? 'auto' : 'min(85vh, 600px)' }}
            >

                {/* ── Close ─────────────────────────────────────────────────── */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors border border-slate-600/60 shadow-lg"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className={`flex flex-col ${showImage ? 'md:flex-row' : ''} h-full`}>

                    {/* ── Left: Thumbnail — only shown when image is available ── */}
                    {showImage && (
                        <div className={`w-full md:w-2/5 bg-slate-950 relative overflow-hidden shrink-0 ${isCollapsed ? 'hidden md:block' : 'block'}`} style={{ minHeight: '200px' }}>
                            <img
                                src={thumbnailUrl!}
                                alt={landmark.name}
                                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageFailed(true)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent" />

                            {/* Category chip top-left */}
                            <div className="absolute top-5 left-5 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur border border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-300">
                                {landmark.category}
                            </div>

                            {/* Location badge bottom */}
                            <div className="absolute bottom-5 left-5 flex items-center gap-2 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 px-4 py-2 rounded-full shadow-lg">
                                <MapPin className="w-3 h-3 text-blue-400" />
                                <span className="text-blue-300 font-black text-[10px] uppercase tracking-widest">{landmark.community}</span>
                            </div>
                        </div>
                    )}

                    {/* ── Right: Facts ───────────────────────────────────────── */}
                    <div
                        className={`${showImage ? 'w-full md:w-3/5' : 'w-full'} flex flex-col bg-gradient-to-br from-slate-900 to-slate-800`}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        {/* Mobile drag handle + collapse toggle */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-2 md:hidden shrink-0">
                            <div
                                className="flex-1 flex flex-col items-center cursor-pointer"
                                onClick={() => setIsCollapsed(!isCollapsed)}
                            >
                                <div className="w-10 h-1 bg-slate-600 rounded-full mb-2" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{landmark.name}</p>
                            </div>
                            <button
                                onClick={() => setIsCollapsed(!isCollapsed)}
                                className="ml-3 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full transition-colors border border-slate-600/60"
                                aria-label={isCollapsed ? 'Expand details' : 'Collapse details'}
                            >
                                {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Collapsible content */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[70vh] md:max-h-none opacity-100 flex-1 overflow-y-auto'
                            } p-5 md:p-10 md:flex md:flex-col md:justify-between`}>

                            {/* Header */}
                            <div>
                                {/* Category pill + icon when no image */}
                                {!showImage && (
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${catStyle.gradient} mb-6`}>
                                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{landmark.category}</span>
                                    </div>
                                )}
                                {showImage && (
                                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl mb-6">
                                        <Info className="w-6 h-6" />
                                    </div>
                                )}
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-3">
                                    {landmark.name}
                                </h2>
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className={`w-3.5 h-3.5 ${catStyle.accent}`} />
                                    <p className={`text-xs font-black uppercase tracking-[0.2em] ${catStyle.accent}`}>
                                        {landmark.community}{landmark.city ? `, ${landmark.city}` : ''}
                                    </p>
                                </div>

                                {/* Domain link if available */}
                                {landmark.domain && (
                                    <a
                                        href={`https://${landmark.domain}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3" />
                                        {landmark.domain}
                                    </a>
                                )}
                            </div>

                            {/* Fact carousel */}
                            <div className="relative flex-1 flex items-center my-8" style={{ minHeight: '140px' }}>
                                {/* Decorative open-quote */}
                                <span className="text-[120px] font-serif leading-none text-slate-700/40 absolute -top-6 -left-3 select-none pointer-events-none">&ldquo;</span>

                                {facts.map((fact, idx) => (
                                    <div
                                        key={idx}
                                        className={`absolute inset-0 flex items-center transition-all duration-700 ease-in-out ${activeIdx === idx
                                            ? 'opacity-100 translate-x-0'
                                            : 'opacity-0 translate-x-8 pointer-events-none'
                                            }`}
                                    >
                                        <p className="text-lg md:text-xl text-slate-200 font-medium leading-relaxed pl-5 border-l-2 border-blue-500 relative z-10">
                                            {fact}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between border-t border-slate-700/60 pt-6">
                                {/* Dot indicators */}
                                <div className="flex items-center gap-2">
                                    {facts.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveIdx(idx)}
                                            className={`h-1.5 rounded-full transition-all duration-300 ${activeIdx === idx ? 'w-8 bg-blue-500' : 'w-2 bg-slate-600 hover:bg-slate-500'
                                                }`}
                                        />
                                    ))}
                                </div>

                                {/* Prev / Next */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={prev}
                                        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-600/60 flex items-center justify-center text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={next}
                                        className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 border border-blue-500 flex items-center justify-center text-white transition-colors shadow-lg shadow-blue-900/50"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandmarkInfoModal;
