import React, { useMemo, useEffect, useState } from 'react';
import { Project, Landmark } from '../types';
import { Map as MapIcon, Layers, PlayCircle, BarChart3, ShieldCheck, Crosshair, Navigation } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Props (optional — component self-loads if not provided) ───────────────────
interface PresentationProps {
    realProjects?: Project[];
    realAmenities?: Landmark[];
}

// ── Feature card data ─────────────────────────────────────────────────────────
const features = [
    {
        id: 'tour',
        accent: 'blue',
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        Icon: PlayCircle,
        title: 'Cinematic Neighborhood Tours',
        body: 'Stop telling clients what is nearby — show them. One click launches an automated 3D drone-style flight that cycles through local schools, luxury hotels, and cultural hubs, perfectly framing the property in the centre of the world.',
        bullets: [
            'Auto-calculates live distances to each landmark',
            'Keeps the target property anchored on-screen throughout',
            'Smooth Mapbox camera easing at configurable speed',
        ],
        imageBg: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
        mockLabel: 'Neighborhood Tour Active',
        MockIcon: PlayCircle,
        mockIconColor: 'text-blue-600',
        tilt: 'rotate-1',
        reversed: false,
    },
    {
        id: 'cluster',
        accent: 'amber',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        Icon: Layers,
        title: 'Dynamic Data Superclustering',
        body: 'Handling hundreds of projects and thousands of amenity pins requires enterprise-grade architecture. As users zoom out, all markers seamlessly merge into premium numbered badges — zero clutter, zero lag, always premium.',
        bullets: [
            '60fps WebGL rendering even with 1,000+ map points',
            'Zero UI lag across all zoom levels',
            'Premium badge aesthetic matching PSI brand standards',
        ],
        imageBg: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1200&auto=format&fit=crop',
        mockLabel: null, // custom cluster bubble rendered below
        MockIcon: null,
        mockIconColor: '',
        tilt: '-rotate-1',
        reversed: true,
    },
    {
        id: 'lasso',
        accent: 'violet',
        iconBg: 'bg-violet-50',
        iconColor: 'text-violet-600',
        Icon: Crosshair,
        title: 'Freehand Spatial Lasso Search',
        body: 'Powered by Turf.js, agents draw custom freehand polygons directly on the map. The system runs point-in-polygon calculations instantly, filtering the full inventory to only properties inside the drawn boundary.',
        bullets: [
            'Sub-50ms spatial filtering on the full dataset',
            'Custom polygon persists across session until cleared',
            'Works alongside all other active filters simultaneously',
        ],
        imageBg: 'https://images.unsplash.com/photo-1504610926078-a1611febcad3?q=80&w=1200&auto=format&fit=crop',
        mockLabel: 'Lasso Filter Active',
        MockIcon: Crosshair,
        mockIconColor: 'text-violet-500',
        tilt: 'rotate-1',
        reversed: false,
    },
    {
        id: 'heatmap',
        accent: 'rose',
        iconBg: 'bg-rose-50',
        iconColor: 'text-rose-500',
        Icon: BarChart3,
        title: 'Live Market Intelligence Layers',
        body: 'Toggle thermal pricing heatmaps to visualize luxury density clusters in seconds. Red zones pinpoint ultra-premium concentrations — instantly giving agents a visual narrative of value that no spreadsheet can match.',
        bullets: [
            'Real-time density rendering from live Firestore data',
            'Toggleable overlay — never disrupts the base map',
            'Isochrone drive-time polygons via Mapbox API',
        ],
        imageBg: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
        mockLabel: 'Heatmap & Analytics Active',
        MockIcon: BarChart3,
        mockIconColor: 'text-rose-400',
        tilt: '-rotate-1',
        reversed: true,
    },
    {
        id: 'isochrone',
        accent: 'emerald',
        iconBg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        Icon: Navigation,
        title: '15-Minute City Isochrones',
        body: 'Instead of straight-line distances, the app calls the Mapbox Isochrone API to draw organic, traffic-aware drive-time polygons. Buyers see exactly which amenities fall inside their lifestyle radius.',
        bullets: [
            'Driving and walking modes supported',
            'Traffic-aware polygon recalculation',
            'Overlay renders on any selected project automatically',
        ],
        imageBg: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1200&auto=format&fit=crop',
        mockLabel: '15-min Drive Radius',
        MockIcon: Navigation,
        mockIconColor: 'text-emerald-500',
        tilt: 'rotate-1',
        reversed: false,
    },
];

// ── Feature section component ─────────────────────────────────────────────────
const FeatureRow: React.FC<{ f: typeof features[0]; index: number }> = ({ f, index }) => {
    const mock = (
        <div className={`bg-slate-100 rounded-[2.5rem] p-4 border border-slate-200 shadow-2xl shadow-slate-200/60 transform ${f.tilt} hover:rotate-0 transition-transform duration-500`}>
            <div className={`aspect-[4/3] rounded-3xl overflow-hidden shadow-inner border border-slate-200 relative flex items-center justify-center ${f.id === 'heatmap' ? 'bg-slate-900' : 'bg-white'}`}>
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${f.imageBg}')`, opacity: f.id === 'heatmap' ? 0.15 : 0.35 }}
                />
                {f.id === 'heatmap' && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-600/40 via-purple-600/20 to-transparent" />
                )}
                {/* Mock UI overlay */}
                {f.id === 'cluster' ? (
                    <div className="bg-blue-600 text-white w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shadow-2xl border-4 border-white relative z-10 select-none">
                        42
                    </div>
                ) : f.MockIcon ? (
                    <div className={`relative z-10 px-7 py-5 rounded-2xl shadow-2xl border text-center ${f.id === 'heatmap' ? 'bg-white/10 backdrop-blur-md border-white/20' : 'bg-white/92 backdrop-blur-md border-slate-200'}`}>
                        <f.MockIcon className={`w-12 h-12 mx-auto mb-3 ${f.mockIconColor}`} />
                        <p className={`font-black text-sm ${f.id === 'heatmap' ? 'text-white' : 'text-slate-900'}`}>{f.mockLabel}</p>
                    </div>
                ) : null}
            </div>
        </div>
    );

    const text = (
        <div>
            <div className={`${f.iconBg} w-16 h-16 rounded-2xl flex items-center justify-center mb-6`}>
                <f.Icon className={`w-8 h-8 ${f.iconColor}`} />
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-3 ${f.iconColor}`}>
                Feature {String(index + 1).padStart(2, '0')}
            </p>
            <h4 className="text-3xl md:text-4xl font-black text-slate-900 mb-5 leading-tight">{f.title}</h4>
            <p className="text-lg text-slate-500 font-medium leading-relaxed mb-7">{f.body}</p>
            <ul className="space-y-3">
                {f.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-slate-700 font-semibold text-sm">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        {b}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className={`grid md:grid-cols-2 gap-12 lg:gap-20 items-center ${index < features.length - 1 ? 'mb-28 md:mb-36' : ''}`}>
            {f.reversed ? (
                <>{mock}{text}</>
            ) : (
                <>{text}{mock}</>
            )}
        </div>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const PresentationShowcase: React.FC<PresentationProps> = ({
    realProjects: injectedProjects,
    realAmenities: injectedAmenities,
}) => {
    const [projects, setProjects] = useState<Project[]>(injectedProjects ?? []);
    const [amenities, setAmenities] = useState<Landmark[]>(injectedAmenities ?? []);

    // Self-load from Firestore when rendered standalone at /presentation
    useEffect(() => {
        if (injectedProjects && injectedProjects.length > 0) return;
        Promise.all([
            getDocs(collection(db, 'projects')),
            getDocs(collection(db, 'landmarks')),
        ]).then(([pSnap, lSnap]) => {
            setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
            setAmenities(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Landmark)));
        });
    }, []);

    const stats = useMemo(() => {
        const dubaiCount = projects.filter(p => (p.city ?? '').toLowerCase().includes('dubai')).length;
        const adCount = projects.filter(p => (p.city ?? '').toLowerCase().includes('abu dhabi')).length;
        const luxury = amenities.filter(a => ['Hotel', 'Leisure', 'Culture'].includes(a.category)).length;
        return { total: projects.length, dubaiCount, adCount, luxury, amenityTotal: amenities.length };
    }, [projects, amenities]);

    return (
        <div className="h-screen w-full bg-white font-sans text-slate-800 overflow-y-auto overflow-x-hidden selection:bg-blue-600 selection:text-white scroll-smooth">

            {/* ── FIXED NAVBAR ─────────────────────────────────────────────────────── */}
            <nav className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50 px-6 py-4 flex justify-between items-center">
                {/* PSI Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/60">
                        <span className="text-white font-black text-base tracking-tighter">PSI</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-black text-slate-900 tracking-tighter uppercase">PSI MAPS</span>
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Spatial Intelligence Platform</span>
                    </div>
                </div>
                <button
                    onClick={() => window.close()}
                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors border border-slate-200 shadow-sm"
                >
                    Exit Presentation
                </button>
            </nav>

            {/* ── HERO ─────────────────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-16 px-6 bg-gradient-to-b from-blue-50/60 via-white to-white overflow-hidden">
                {/* Dot-grid background */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{ backgroundImage: 'radial-gradient(#2563eb 1px, transparent 1px)', backgroundSize: '28px 28px' }}
                />

                <div className="relative z-10 text-center max-w-5xl mx-auto">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-200 bg-blue-50 mb-10">
                        <span className="w-2 h-2 bg-blue-500 rounded-full block animate-pulse" />
                        <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.25em]">Management Briefing &middot; February 2026</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight mb-8">
                        The Future of Real Estate
                        <br />
                        is{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                            Spatial.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-3xl mx-auto leading-relaxed mb-16">
                        PSI Maps is not a static listing database. It is a live, interactive 3D environment purpose-built to accelerate luxury property sales across the&nbsp;UAE.
                    </p>

                    {/* Live stat cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {[
                            { value: stats.total, label: 'Active Properties' },
                            { value: stats.adCount, label: 'Abu Dhabi Projects' },
                            { value: stats.dubaiCount, label: 'Dubai Projects' },
                            { value: stats.amenityTotal, label: 'Lifestyle Landmarks' },
                        ].map(({ value, label }) => (
                            <div
                                key={label}
                                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1 transition-transform duration-200"
                            >
                                <div className="text-4xl font-black text-blue-600 mb-2 tabular-nums">{value || '—'}</div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-b from-transparent to-white pointer-events-none" />
            </section>

            {/* ── TOOLS SECTION ────────────────────────────────────────────────────── */}
            <section className="py-20 md:py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Section header */}
                    <div className="text-center mb-20">
                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">/// The Arsenal</p>
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                            Proprietary Sales Tools
                        </h2>
                        <p className="text-slate-500 font-medium mt-4 max-w-2xl mx-auto">
                            Every feature was custom-engineered for a single purpose — closing premium off-plan transactions faster.
                        </p>
                    </div>

                    {/* Feature rows */}
                    {features.map((f, i) => (
                        <FeatureRow key={f.id} f={f} index={i} />
                    ))}
                </div>
            </section>

            {/* ── TECH STRIP ───────────────────────────────────────────────────────── */}
            <section className="py-16 bg-slate-50 border-y border-slate-100">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Powered By</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {['React 18', 'TypeScript', 'Mapbox GL JS', 'WebGL', 'Turf.js', 'Firebase', 'Clearbit API', 'Google Places', 'Tailwind CSS', 'Vite'].map((t) => (
                            <span key={t} className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest shadow-sm">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ────────────────────────────────────────────────────────── */}
            <section className="py-28 bg-white text-center px-4">
                {/* PSI badge */}
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200/60 mx-auto mb-8">
                    <span className="text-white font-black text-xl tracking-tighter">PSI</span>
                </div>

                <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Ready to close?</h2>
                <p className="text-slate-500 font-medium mb-12 max-w-xl mx-auto text-lg leading-relaxed">
                    Return to the map and experience the UAE&apos;s most advanced spatial intelligence platform for luxury real estate.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-4">
                    <button
                        onClick={() => window.open('/', '_blank')}
                        className="group px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black tracking-widest uppercase transition-all shadow-xl shadow-blue-200/60 flex items-center gap-3 text-sm"
                    >
                        <MapIcon className="w-5 h-5" />
                        Launch Live Map
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-10 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black tracking-widest uppercase transition-all border border-slate-200 text-sm"
                    >
                        Close Deck
                    </button>
                </div>
            </section>

        </div>
    );
};

export default PresentationShowcase;
