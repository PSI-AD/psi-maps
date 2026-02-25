// @google/model-viewer registers the <model-viewer> custom element and merges
// its type into JSX.IntrinsicElements automatically when imported.
import '@google/model-viewer';

import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { X, Info, MapPin, Tag } from 'lucide-react';

interface Props {
    landmark: Landmark;
    onClose: () => void;
}

// ── Default facts by category when the DB has none ───────────────────────────
const DEFAULT_FACTS: Record<string, string[]> = {
    Hotel: [
        'A landmark of ultra-luxury hospitality in the UAE.',
        'Consistently rated among the world\'s top lifestyle destinations.',
        'Steps from the project, dramatically elevating resale appeal.',
        'Exclusive residences here command a significant lifestyle premium.',
    ],
    School: [
        'Accredited under international curriculum standards.',
        'Within the catchment area — a major draw for family buyers.',
        'Top-tier educational facilities increase property desirability.',
        'One of the highest-rated institutions in the community.',
    ],
    Culture: [
        'A globally recognised landmark on the world cultural stage.',
        'Attracts millions of international visitors annually.',
        'Proximity to landmark culture is a proven price driver.',
        'Architecture alone makes it one of the UAE\'s iconic silhouettes.',
    ],
    Leisure: [
        'World-class recreational facilities accessible within minutes.',
        'An anchor for lifestyle branding in marketing materials.',
        'Consistent footfall makes the surrounding area highly sought.',
        'Exclusive membership access available to residents.',
    ],
    Retail: [
        'A premium retail anchor serving the catchment community.',
        'Leading international and luxury brands represented.',
        'Walkable distance makes the neighbourhood exceptionally liveable.',
        'High footfall drives neighbourhood vibrancy and value.',
    ],
    Hospital: [
        'A JCI-accredited facility meeting international care standards.',
        'Peace of mind for families — a critical buyer consideration.',
        'Response times under 10 minutes from the development.',
        'Specialist and emergency care, both available 24/7.',
    ],
    Airport: [
        'Direct international connectivity to over 150 destinations.',
        'Sub-30-minute transfer ideal for global investors.',
        'A key driver of capital appreciation in the surrounding area.',
        'Expansion plans underway to further boost regional status.',
    ],
    Port: [
        'A gateway for international maritime trade and tourism.',
        'Iconic waterfront views add significant lifestyle value.',
        'Cruise and super-yacht berths adjacent to the community.',
        'A focal point for Abu Dhabi\'s rising maritime economy.',
    ],
};

const getFacts = (landmark: Landmark): string[] => {
    if (landmark.facts && landmark.facts.length > 0) return landmark.facts;
    return DEFAULT_FACTS[landmark.category] ?? [
        `An iconic landmark in ${landmark.community}.`,
        `A premier destination for ${landmark.category.toLowerCase()} enthusiasts.`,
        'World-class architecture and design recognised globally.',
        'Proximity drives neighbourhood prestige and resale value.',
    ];
};

// ── Component ─────────────────────────────────────────────────────────────────
const LandmarkInfoModal: React.FC<Props> = ({ landmark, onClose }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const facts = getFacts(landmark);

    // Auto-rotate facts every 4 s
    useEffect(() => {
        const t = setInterval(() => setActiveIdx(p => (p + 1) % facts.length), 4000);
        return () => clearInterval(t);
    }, [facts.length]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    const categoryBadgeColor: Record<string, string> = {
        Hotel: 'bg-blue-100 text-blue-700',
        School: 'bg-emerald-100 text-emerald-700',
        Culture: 'bg-purple-100 text-purple-700',
        Leisure: 'bg-teal-100 text-teal-700',
        Retail: 'bg-rose-100 text-rose-700',
        Hospital: 'bg-red-100 text-red-700',
        Airport: 'bg-sky-100 text-sky-700',
        Port: 'bg-cyan-100 text-cyan-700',
    };
    const badgeClass = categoryBadgeColor[landmark.category] ?? 'bg-slate-100 text-slate-600';

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
                style={{ maxHeight: '85vh' }}
            >

                {/* ── Left: 3D Viewer ─────────────────────────────────────────────── */}
                <div className="relative flex-1 bg-gradient-to-br from-slate-100 to-slate-200 min-h-[260px] md:min-h-0 flex items-center justify-center overflow-hidden">

                    {/* Clearbit logo watermark when domain available */}
                    {landmark.domain && (
                        <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur rounded-xl p-2 shadow-sm border border-slate-200">
                            <img
                                src={`https://logo.clearbit.com/${landmark.domain}?size=48`}
                                alt={landmark.name}
                                className="w-10 h-10 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                            />
                        </div>
                    )}

                    {/* 3D model viewer */}
                    <model-viewer
                        src={landmark.modelUrl || 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'}
                        alt={`3D model of ${landmark.name}`}
                        auto-rotate
                        camera-controls
                        rotation-per-second="25deg"
                        shadow-intensity="1"
                        style={{ width: '100%', height: '100%', minHeight: '260px' }}
                    />

                    {/* Interactive badge */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 shadow-sm border border-slate-200 whitespace-nowrap pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse block" />
                        Interactive 3D · Drag to rotate
                    </div>
                </div>

                {/* ── Right: Info ──────────────────────────────────────────────────── */}
                <div className="flex-1 p-8 md:p-10 flex flex-col bg-gradient-to-br from-white to-slate-50 relative overflow-y-auto">

                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors z-10"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    {/* Icon + header */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl mb-5">
                            <Info className="w-6 h-6" />
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-3">
                            {landmark.name}
                        </h2>

                        {/* Metadata pills */}
                        <div className="flex flex-wrap gap-2">
                            {landmark.community && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full">
                                    <MapPin className="w-3 h-3" />
                                    {landmark.community}
                                </span>
                            )}
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${badgeClass}`}>
                                <Tag className="w-3 h-3" />
                                {landmark.category}
                            </span>
                        </div>
                    </div>

                    {/* Animated fact carousel */}
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3">Highlights</p>

                        <div className="relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden" style={{ minHeight: '120px' }}>
                            {facts.map((fact, idx) => (
                                <div
                                    key={idx}
                                    className={`absolute inset-0 p-5 flex items-center transition-all duration-700 ${activeIdx === idx
                                            ? 'opacity-100 translate-y-0'
                                            : 'opacity-0 translate-y-3 pointer-events-none'
                                        }`}
                                >
                                    <p className="text-base text-slate-700 font-semibold leading-relaxed">
                                        &ldquo;{fact}&rdquo;
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Dot progress indicators */}
                        <div className="flex items-center gap-2 mt-4">
                            {facts.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIdx(idx)}
                                    className={`rounded-full transition-all duration-300 ${activeIdx === idx
                                            ? 'w-6 h-2 bg-blue-600'
                                            : 'w-2 h-2 bg-slate-200 hover:bg-slate-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandmarkInfoModal;
