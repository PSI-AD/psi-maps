import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { X, MapPin, ExternalLink, ChevronRight, ChevronLeft } from 'lucide-react';

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

// Category colors for accent
const CATEGORY_STYLES: Record<string, { gradient: string; accent: string }> = {
    hotel: { gradient: 'from-violet-600 to-violet-800', accent: 'text-violet-400' },
    school: { gradient: 'from-emerald-600 to-emerald-800', accent: 'text-emerald-400' },
    culture: { gradient: 'from-purple-600 to-purple-800', accent: 'text-purple-400' },
    leisure: { gradient: 'from-teal-600 to-teal-800', accent: 'text-teal-400' },
    retail: { gradient: 'from-rose-600 to-rose-800', accent: 'text-rose-400' },
    hospital: { gradient: 'from-red-600 to-red-800', accent: 'text-red-400' },
    airport: { gradient: 'from-sky-600 to-sky-800', accent: 'text-sky-400' },
    port: { gradient: 'from-cyan-600 to-cyan-800', accent: 'text-cyan-400' },
    park: { gradient: 'from-lime-600 to-lime-800', accent: 'text-lime-400' },
    hypermarket: { gradient: 'from-fuchsia-600 to-fuchsia-800', accent: 'text-fuchsia-400' },
    beach: { gradient: 'from-cyan-500 to-cyan-700', accent: 'text-cyan-400' },
};
const defaultStyle = { gradient: 'from-slate-600 to-slate-800', accent: 'text-blue-400' };

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
const LandmarkInfoModal: React.FC<Props> = ({ landmark, onClose }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [wikiImage, setWikiImage] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);

    const facts = getFacts(landmark);
    const catStyle = CATEGORY_STYLES[landmark.category?.toLowerCase()] ?? defaultStyle;

    const hasDbImages = (landmark.images && landmark.images.length > 0) || !!landmark.imageUrl;
    const dbImage = landmark.images?.[0] || landmark.imageUrl;

    // Wikipedia image fetch
    useEffect(() => {
        if (hasDbImages) return;
        let cancelled = false;
        fetchWikiImage(landmark.name).then(url => {
            if (!cancelled && url) setWikiImage(url);
        });
        return () => { cancelled = true; };
    }, [landmark.name, hasDbImages]);

    const thumbnailUrl = dbImage || wikiImage;
    const showImage = thumbnailUrl && !imageFailed;

    // Auto-advance facts every 5s
    useEffect(() => {
        const t = setInterval(() => setActiveIdx((p) => (p + 1) % facts.length), 5000);
        return () => clearInterval(t);
    }, [facts.length]);

    // Escape key to close
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <>
            {/* Transparent backdrop — clicking it closes */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={onClose}
            />

            {/* Compact card — bottom-right on desktop, bottom-center on mobile */}
            <div className="fixed z-[9999] bottom-20 right-4 lg:bottom-20 lg:right-4 left-4 lg:left-auto lg:w-[340px] animate-in slide-in-from-bottom-4 fade-in duration-300">
                <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">

                    {/* Image — small strip (if available) */}
                    {showImage && (
                        <div className="relative h-32 w-full overflow-hidden">
                            <img
                                src={thumbnailUrl!}
                                alt={landmark.name}
                                className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(true)}
                                onError={() => setImageFailed(true)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent" />

                            {/* Category badge */}
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur text-[9px] font-black uppercase tracking-widest text-slate-300 border border-slate-700/40">
                                {landmark.category}
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                        {/* Header — name + location */}
                        <div className="mb-3">
                            {!showImage && (
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${catStyle.gradient} mb-2`}>
                                    <span className="text-white text-[9px] font-black uppercase tracking-widest">{landmark.category}</span>
                                </div>
                            )}
                            <h3 className="text-lg font-black text-white leading-tight mb-1">{landmark.name}</h3>
                            <div className="flex items-center gap-1.5">
                                <MapPin className={`w-3 h-3 ${catStyle.accent}`} />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${catStyle.accent}`}>
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

                        {/* Facts — bullet points (4-5 lines) */}
                        <div className="space-y-1.5 mb-3">
                            {facts.slice(0, 4).map((fact, idx) => (
                                <div key={idx} className="flex items-start gap-2">
                                    <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${
                                        idx === activeIdx ? 'bg-blue-500' : 'bg-slate-600'
                                    }`} />
                                    <p className={`text-xs leading-snug transition-colors duration-300 ${
                                        idx === activeIdx ? 'text-slate-200' : 'text-slate-500'
                                    }`}>
                                        {fact}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Fact navigation dots */}
                        {facts.length > 1 && (
                            <div className="flex items-center justify-between border-t border-slate-700/50 pt-2">
                                <div className="flex gap-1">
                                    {facts.slice(0, 4).map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveIdx(idx)}
                                            className={`h-1 rounded-full transition-all ${
                                                idx === activeIdx ? 'w-5 bg-blue-500' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setActiveIdx((p) => (p - 1 + Math.min(4, facts.length)) % Math.min(4, facts.length))}
                                        className="w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors"
                                    >
                                        <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => setActiveIdx((p) => (p + 1) % Math.min(4, facts.length))}
                                        className="w-6 h-6 rounded-md bg-blue-600 hover:bg-blue-500 flex items-center justify-center text-white transition-colors"
                                    >
                                        <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Close strip */}
                    <button
                        onClick={onClose}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                    >
                        <X className="w-3 h-3" />
                        Close
                    </button>
                </div>
            </div>
        </>
    );
};

export default LandmarkInfoModal;
