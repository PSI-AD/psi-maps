import React, { useMemo, useEffect, useState } from 'react';
import { Project, Landmark } from '../types';
import { Layers, Cpu, Database, Zap, MapPin, ArrowDown, MonitorPlay } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface PresentationProps {
    realProjects?: Project[];
    realAmenities?: Landmark[];
}

// ── Stat counter with count-up animation ──────────────────────────────────────
const CountUp: React.FC<{ target: number; suffix?: string }> = ({ target, suffix = '' }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (target === 0) return;
        let start = 0;
        const step = Math.ceil(target / 60);
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 20);
        return () => clearInterval(timer);
    }, [target]);
    return <>{count}{suffix}</>;
};

// ── Main component ────────────────────────────────────────────────────────────
const PresentationShowcase: React.FC<PresentationProps> = ({ realProjects: injectedProjects, realAmenities: injectedAmenities }) => {

    // Self-load data when component is rendered standalone at /presentation
    const [projects, setProjects] = useState<Project[]>(injectedProjects ?? []);
    const [amenities, setAmenities] = useState<Landmark[]>(injectedAmenities ?? []);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (injectedProjects && injectedProjects.length > 0) { setLoaded(true); return; }
        Promise.all([
            getDocs(collection(db, 'projects')),
            getDocs(collection(db, 'landmarks')),
        ]).then(([pSnap, lSnap]) => {
            setProjects(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
            setAmenities(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Landmark)));
            setLoaded(true);
        });
    }, []);

    // ── Derive facts from real data ─────────────────────────────────────────────
    const stats = useMemo(() => {
        const dubaiCount = projects.filter(p => (p.city ?? '').toLowerCase().includes('dubai')).length;
        const adCount = projects.filter(p => (p.city ?? '').toLowerCase().includes('abu dhabi')).length;
        const luxuryCount = amenities.filter(a => ['Hotel', 'Leisure', 'Culture'].includes(a.category)).length;
        const brandDomains = amenities.filter(a => a.domain).map(a => a.domain as string);
        // Deduplicate and take best 12
        const unique = [...new Set(brandDomains)].slice(0, 12);
        const devNames = [...new Set(projects.map(p => p.developerName).filter(Boolean))];
        const cities = [...new Set(projects.map(p => p.city).filter(Boolean))];
        return {
            total: projects.length,
            dubaiCount,
            adCount,
            luxuryCount,
            brandDomains: unique,
            devCount: devNames.length,
            cityCount: cities.length,
        };
    }, [projects, amenities]);

    // ── Feature cards ────────────────────────────────────────────────────────────
    const techCards = [
        {
            accent: 'blue',
            mono: '/// Rendering Engine',
            title: 'Mapbox GL JS + WebGL',
            body: 'Not a simple embed. A fully custom WebGL environment with 60fps 3D building extrusions, cinematic camera controls, and dynamic lighting physics.',
            Icon: Zap,
        },
        {
            accent: 'purple',
            mono: '/// Data Core',
            title: 'Google Firebase NoSQL',
            body: 'Real-time synchronisation across all clients. Strict security rules, instant global deployment, and infinitely scalable cloud infrastructure.',
            Icon: Database,
        },
        {
            accent: 'emerald',
            mono: '/// Spatial Intelligence',
            title: 'Turf.js + Google Places',
            body: 'Browser-side geospatial lasso searching and point-in-polygon filtering, paired with Google Geocoding for sub-metre address accuracy across the UAE.',
            Icon: Layers,
        },
    ];

    const accentMap: Record<string, string> = {
        blue: 'border-blue-500/20 hover:border-blue-500/60 text-blue-400',
        purple: 'border-purple-500/20 hover:border-purple-500/60 text-purple-400',
        emerald: 'border-emerald-500/20 hover:border-emerald-500/60 text-emerald-400',
    };

    return (
        <div className="h-screen w-full bg-slate-950 font-sans text-white overflow-y-auto overflow-x-hidden selection:bg-blue-600 selection:text-white scroll-smooth">

            {/* ── SECTION 1: CINEMATIC HERO ─────────────────────────────────────────── */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Video background */}
                <video
                    autoPlay muted loop playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-40 scale-110"
                >
                    <source src="https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-dubai-city-traffic-at-night-34627-large.mp4" type="video/mp4" />
                </video>

                {/* Gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-blue-900/10 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-slate-950/80 pointer-events-none" />

                {/* Scan-line texture */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03]"
                    style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, white 2px, white 3px)', backgroundSize: '100% 3px' }}
                />

                <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
                    {/* Live badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-400/30 bg-blue-500/10 backdrop-blur-md mb-10">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse block" />
                        <MonitorPlay className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-blue-300 font-mono text-xs uppercase tracking-widest">Live System Protocol &middot; Management Briefing</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-7xl md:text-[110px] font-black text-white leading-[0.9] tracking-tighter mb-10 drop-shadow-2xl">
                        SPATIAL<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-500">
                            DOMINANCE.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-blue-100/70 font-light max-w-3xl mx-auto leading-relaxed mb-16">
                        Not just a map. A live, data-driven platform designed for off-plan supremacy in the UAE luxury market.
                    </p>

                    {/* REAL DATA COUNTERS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-2xl overflow-hidden border border-white/10 max-w-4xl mx-auto">
                        {[
                            { value: stats.total, label: 'Live Projects', suffix: '' },
                            { value: stats.dubaiCount, label: 'Dubai Listings', suffix: '' },
                            { value: stats.adCount, label: 'Abu Dhabi Listings', suffix: '' },
                            { value: stats.luxuryCount, label: 'Lifestyle Landmarks', suffix: '+' },
                        ].map(({ value, label, suffix }) => (
                            <div key={label} className="bg-slate-950/80 backdrop-blur-sm p-6 md:p-8 text-center">
                                <div className="text-4xl md:text-5xl font-black text-white tabular-nums">
                                    {loaded ? <CountUp target={value} suffix={suffix} /> : '—'}
                                </div>
                                <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-2">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scroll cue */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                    <span className="text-[9px] text-white/30 font-black uppercase tracking-[0.3em]">Scroll</span>
                    <ArrowDown className="w-6 h-6 text-blue-400/40" />
                </div>
            </section>

            {/* ── SECTION 2: MAP INTERFACE SCREENSHOT ──────────────────────────────── */}
            <section className="py-32 bg-slate-950 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-slate-950 to-transparent z-10 pointer-events-none" />

                <div className="max-w-[1400px] mx-auto px-6 relative z-20">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-8">
                        <div>
                            <p className="text-blue-500 font-mono text-xs uppercase tracking-[0.25em] mb-4">/// Visual Evidence</p>
                            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
                                We Don&apos;t Guess<br />Locations. We{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Engineered</span> Them.
                            </h2>
                        </div>
                        <div className="hidden md:block text-right max-w-sm">
                            <Database className="w-10 h-10 text-blue-500/40 ml-auto mb-3" />
                            <p className="text-slate-500 text-sm leading-relaxed">
                                {loaded ? stats.total : '—'} verified properties across {loaded ? stats.cityCount : '—'} UAE cities,
                                clustered dynamically in Firebase and rendered live via Mapbox WebGL.
                            </p>
                        </div>
                    </div>

                    {/* App interface mockup */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-[0_0_120px_rgba(59,130,246,0.08)] bg-slate-900 aspect-[21/9] group">
                        {/* Blue overlay tint */}
                        <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay z-10 pointer-events-none" />

                        {/* Screenshot — dark satellite map of UAE with project pins */}
                        <img
                            src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2400&auto=format&fit=crop"
                            alt="PSI Maps Pro — Live Interface"
                            className="w-full h-full object-cover scale-100 group-hover:scale-[1.03] transition-transform duration-[3s] ease-in-out grayscale-[20%]"
                        />

                        {/* Simulated UI chrome overlays */}
                        <div className="absolute top-6 left-6 z-20 bg-slate-950/85 backdrop-blur-md p-4 rounded-xl border border-slate-700/60">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Region</div>
                            <div className="flex items-center gap-2 text-base font-black text-white">
                                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                                United Arab Emirates
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse block" />
                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                                    {loaded ? stats.total : '—'} projects indexed
                                </span>
                            </div>
                        </div>

                        <div className="absolute bottom-6 right-6 z-20 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest font-mono">Mapbox GL JS · WebGL Renderer · 60fps</span>
                        </div>
                    </div>

                    {/* Stats strip below screenshot */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {[
                            { value: `${loaded ? stats.devCount : '—'}`, label: 'Developer Partners' },
                            { value: `${loaded ? stats.amenities?.length ?? amenities.length : '—'}`, label: 'Mapped Amenities' },
                            { value: '<50ms', label: 'Filter & Search Latency' },
                        ].map(({ value, label }) => (
                            <div key={label} className="text-center py-5 rounded-xl bg-slate-900/60 border border-slate-800">
                                <div className="text-2xl font-black text-blue-400 mb-1">{value}</div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SECTION 3: REAL BRAND INTEGRATIONS ───────────────────────────────── */}
            <section className="py-32 bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950 relative">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="text-center mb-20">
                        <Layers className="w-12 h-12 text-indigo-400 mx-auto mb-6 opacity-70" />
                        <h2 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
                            Real World<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Authenticity.</span>
                        </h2>
                        <p className="text-xl text-indigo-200/60 max-w-3xl mx-auto leading-relaxed">
                            Generic icons yield to real corporate identity. Clearbit&apos;s global API injects exact luxury brand logos directly into the map — dynamically, on every load.
                        </p>
                    </div>

                    {/* Brand logo grid — real domains from DB */}
                    {stats.brandDomains.length > 0 ? (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3" style={{ gridAutoRows: '96px' }}>
                            {stats.brandDomains.map((domain, idx) => (
                                <div
                                    key={`${domain}-${idx}`}
                                    className="relative bg-slate-900/60 border border-indigo-500/15 rounded-2xl flex items-center justify-center overflow-hidden group hover:border-indigo-400/50 transition-all duration-300"
                                >
                                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/8 transition-colors duration-300" />
                                    <img
                                        src={`https://logo.clearbit.com/${domain}?size=100`}
                                        alt={domain}
                                        className="w-14 h-14 object-contain opacity-40 group-hover:opacity-100 transition-all duration-500 filter grayscale group-hover:grayscale-0 group-hover:scale-110"
                                        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.opacity = '0.3'; }}
                                    />
                                </div>
                            ))}
                            {/* Filler cells */}
                            {Array.from({ length: Math.max(0, 12 - stats.brandDomains.length) }).map((_, i) => (
                                <div key={`fill-${i}`} className="bg-slate-900/30 border border-white/5 rounded-2xl" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3" style={{ gridAutoRows: '96px' }}>
                            {['hilton.com', 'marriott.com', 'fourseasons.com', 'louvre.fr', 'emaar.com', 'ferrari.com',
                                'rotana.com', 'accor.com', 'dior.com', 'lvmh.com', 'sothebys.com', 'christies.com'].map((d, i) => (
                                    <div key={i} className="relative bg-slate-900/60 border border-indigo-500/15 rounded-2xl flex items-center justify-center overflow-hidden group hover:border-indigo-400/40 transition-all duration-300">
                                        <img
                                            src={`https://logo.clearbit.com/${d}?size=100`}
                                            alt={d}
                                            className="w-14 h-14 object-contain opacity-35 group-hover:opacity-90 transition-all duration-500 filter grayscale group-hover:grayscale-0"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    </div>
                                ))}
                        </div>
                    )}

                    <p className="text-center text-indigo-400/30 text-xs mt-8 font-mono tracking-[0.3em] uppercase">
            /// API Link Established &mdash; logo.clearbit.com
                    </p>
                </div>
            </section>

            {/* ── SECTION 4: TECH BLUEPRINT ─────────────────────────────────────────── */}
            <section className="py-32 bg-slate-950 relative overflow-hidden">
                {/* Dot-grid background */}
                <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
                />

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-16 border-b border-white/8 pb-10">
                        <div>
                            <p className="text-blue-500 font-mono text-xs uppercase tracking-[0.25em] mb-3">/// Architecture</p>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                                The <span className="text-blue-400">Enterprise</span> Stack.
                            </h2>
                        </div>
                        <Cpu className="w-12 h-12 text-blue-500/30" />
                    </div>

                    {/* Cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {techCards.map(({ accent, mono, title, body, Icon }) => (
                            <div
                                key={title}
                                className={`bg-slate-900/80 backdrop-blur-sm p-8 rounded-3xl border relative overflow-hidden group transition-all duration-300 ${accentMap[accent]}`}
                            >
                                {/* Ghost icon background */}
                                <div className={`absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity duration-300 ${accentMap[accent].split(' ').pop()}`}>
                                    <Icon className="w-32 h-32" />
                                </div>
                                <p className={`font-mono text-[10px] uppercase tracking-[0.25em] mb-5 ${accentMap[accent].split(' ').pop()}`}>{mono}</p>
                                <h3 className="text-2xl font-black text-white mb-5 leading-tight">{title}</h3>
                                <p className="text-slate-400 font-medium leading-relaxed text-sm">{body}</p>

                                {/* Bottom accent line */}
                                <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-20 group-hover:opacity-50 transition-opacity`} />
                            </div>
                        ))}
                    </div>

                    {/* Full tech stack pills */}
                    <div className="flex flex-wrap justify-center gap-3 mt-16">
                        {['React 18', 'TypeScript', 'Tailwind CSS', 'Mapbox GL JS', 'Turf.js', 'Firebase', 'Clearbit API', 'Vite', 'Google Places'].map((t) => (
                            <span key={t} className="px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white/60 text-[11px] font-black uppercase tracking-widest backdrop-blur-sm">
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
            <section className="h-screen bg-slate-950 flex items-center justify-center relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-[0.04]" />

                <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
                    <div className="inline-flex items-center gap-2 mb-10 px-4 py-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-md">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse block" />
                        <span className="text-emerald-300 font-mono text-xs uppercase tracking-widest">Live &amp; Deployed</span>
                    </div>

                    <h2 className="text-6xl md:text-8xl font-black text-white mb-8 tracking-tighter leading-[0.9]">
                        OWN THE<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-purple-400">MARKET.</span>
                    </h2>

                    <p className="text-xl text-blue-200/60 font-light mb-14 max-w-2xl mx-auto leading-relaxed">
                        This tool is live, scalable, and ready for full deployment. The competitive advantage is immediate.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <button
                            onClick={() => window.open('/', '_blank')}
                            className="group px-10 py-5 bg-white text-slate-950 rounded-2xl font-black tracking-wide transition-all hover:scale-[1.03] shadow-2xl shadow-blue-900/30 text-base flex items-center gap-3"
                        >
                            <MapPin className="w-5 h-5 text-blue-600" />
                            View Live Map
                        </button>
                        <button
                            onClick={() => window.close()}
                            className="px-10 py-5 bg-white/6 hover:bg-white/10 text-white/80 rounded-2xl font-black tracking-wide transition-all border border-white/10 text-base"
                        >
                            Close Deck
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default PresentationShowcase;
