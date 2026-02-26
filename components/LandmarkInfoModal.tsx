import React, { useState, useEffect } from 'react';
import { Landmark } from '../types';
import { X, ChevronRight, ChevronLeft, Info, Image as ImageIcon } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, EffectFade } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/effect-fade';

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

// ── Component ─────────────────────────────────────────────────────────────────
const LandmarkInfoModal: React.FC<Props> = ({ landmark, onClose }) => {
    const [activeIdx, setActiveIdx] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    const facts = getFacts(landmark);

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

    const images = landmark.images && landmark.images.length > 0 ? landmark.images : (landmark.imageUrl ? [landmark.imageUrl] : ['https://placehold.co/800x600?text=No+Image']);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
            {/* Blurred dark backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                onClick={onClose}
            />

            <div className="bg-slate-900 border border-slate-700/60 rounded-[2rem] w-full max-w-5xl overflow-hidden shadow-2xl shadow-black/60 relative z-10 flex flex-col md:flex-row" style={{ height: 'min(85vh, 600px)' }}>

                {/* ── Close ──────────────────────────────────────────────────────────── */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 w-10 h-10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full flex items-center justify-center transition-colors border border-slate-600/60 shadow-lg"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* ── Left: Media ────────────────────────────────────────────────────── */}
                <div className="w-full md:w-1/2 bg-slate-950 relative overflow-hidden group flex-shrink-0">
                    <div className="absolute inset-0 w-full h-full">
                        <Swiper
                            modules={[Autoplay, Pagination, EffectFade]}
                            effect="fade"
                            autoplay={{ delay: 3500, disableOnInteraction: false }}
                            pagination={{ clickable: true, dynamicBullets: true }}
                            loop={images.length > 1}
                            className="w-full h-full"
                        >
                            {images.map((img, idx) => (
                                <SwiperSlide key={idx}>
                                    <img src={img} alt={`${landmark.name} view ${idx + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/60 to-transparent" />
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>

                    {/* Verified badge */}
                    <div className="absolute bottom-5 left-5 flex items-center gap-2 bg-blue-600/20 backdrop-blur-md border border-blue-500/30 px-4 py-2 rounded-full shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse block" />
                        <span className="text-blue-300 font-black text-[10px] uppercase tracking-widest">Verified Landmark</span>
                    </div>

                    {/* Category chip top-left */}
                    <div className="absolute top-5 left-5 px-3 py-1.5 rounded-full bg-slate-900/70 backdrop-blur border border-slate-700/60 text-[10px] font-black uppercase tracking-widest text-slate-300">
                        {landmark.category}
                    </div>
                </div>

                {/* ── Right: Facts ───────────────────────────────────────────────────── */}
                <div
                    className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 overflow-y-auto"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    {/* Header */}
                    <div>
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl mb-6">
                            <Info className="w-6 h-6" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none mb-3">
                            {landmark.name}
                        </h2>
                        <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">
                            {landmark.community}{landmark.city ? `, ${landmark.city}` : ''}
                        </p>
                    </div>

                    {/* Fact carousel */}
                    <div className="relative flex-1 flex items-center my-8" style={{ minHeight: '160px' }}>
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
    );
};

export default LandmarkInfoModal;
