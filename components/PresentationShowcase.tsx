import React, { useEffect } from 'react';
import { Map, Zap, Layers, Navigation, Crosshair, Users, Globe, Shield, Cpu, ArrowRight, MonitorPlay } from 'lucide-react';

const sections = [
    {
        id: 1,
        title: 'Cinematic 3D Engine',
        subtitle: 'Immersive Property Tours',
        description: 'We replaced flat databases with a high-performance WebGL 3D environment. Buyers explore neighborhoods through automated, drone-like camera flights, bringing off-plan projects to life before a single brick is laid.',
        icon: <Globe className="w-8 h-8 text-blue-500" />,
        color: 'from-blue-500 to-cyan-400',
        image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 2,
        title: 'Live Market Heatmaps',
        subtitle: 'Spatial Financial Intelligence',
        description: 'Agents instantly toggle thermal pricing layers to visualize luxury density. Red zones highlight ultra-premium clusters, giving our team a data-driven visual narrative of emerging markets and investment hotspots.',
        icon: <Layers className="w-8 h-8 text-rose-500" />,
        color: 'from-rose-500 to-orange-400',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 3,
        title: '15-Minute City Isochrones',
        subtitle: 'Advanced Drive-Time Polygons',
        description: 'Instead of simple straight-line radii, the app pings the Mapbox Isochrone API to draw organic, traffic-aware drive-time polygons. We show buyers exactly how much of the city they can reach in 15 minutes.',
        icon: <Navigation className="w-8 h-8 text-emerald-500" />,
        color: 'from-emerald-500 to-teal-400',
        image: 'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 4,
        title: 'Freehand Spatial Lasso',
        subtitle: 'Draw-to-Search Technology',
        description: 'Powered by Turf.js, agents literally draw custom borders on the map. The system instantly runs complex point-in-polygon calculations to filter hundreds of millions of dirhams of inventory in milliseconds.',
        icon: <Crosshair className="w-8 h-8 text-purple-500" />,
        color: 'from-purple-500 to-fuchsia-400',
        image: 'https://images.unsplash.com/photo-1504610926078-a1611febcad3?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 5,
        title: 'Dynamic Superclustering',
        subtitle: 'Performance at Scale',
        description: 'To prevent UI clutter at country-level zoom, we engineered dynamic data clustering. Hundreds of landmarks merge into clean premium badges and split apart seamlessly as the user zooms into any neighborhood.',
        icon: <Zap className="w-8 h-8 text-amber-500" />,
        color: 'from-amber-500 to-yellow-400',
        image: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 6,
        title: 'Live Brand Integrations',
        subtitle: 'Clearbit API Synchronisation',
        description: 'Generic icons yield to real-world luxury branding. Syncing with Clearbit global brand database, the map renders exact logos for St.Regis, Ferrari World, and the Louvre Abu Dhabi — automatically.',
        icon: <Shield className="w-8 h-8 text-indigo-500" />,
        color: 'from-indigo-500 to-blue-500',
        image: 'https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 7,
        title: 'Smart Lifestyle Metrics',
        subtitle: 'Flipping Data Pillars',
        description: 'A space-saving animated pill auto-cycles through Driving Time, Walking Time, and Distance. It answers the most critical buyer question — "What is it like to live here?" — without ever overcrowding the screen.',
        icon: <Map className="w-8 h-8 text-pink-500" />,
        color: 'from-pink-500 to-rose-400',
        image: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 8,
        title: 'Cloud-Native Architecture',
        subtitle: 'Secure Firebase Infrastructure',
        description: 'Built on Google Firebase, the platform features real-time NoSQL database syncing, role-based security rules, and instant global deployments — ensuring every agent always has live access to the latest inventory.',
        icon: <Cpu className="w-8 h-8 text-slate-500" />,
        color: 'from-slate-600 to-slate-400',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 9,
        title: 'Who Benefits?',
        subtitle: 'Empowering Every Tier',
        description: 'AGENTS get a powerful visual closing tool. INVESTORS get transparent, data-driven neighborhood intelligence. MANAGEMENT gets a proprietary, scalable tech asset that permanently differentiates PSI from every competitor in the UAE.',
        icon: <Users className="w-8 h-8 text-sky-500" />,
        color: 'from-sky-500 to-blue-400',
        image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32d7?q=80&w=2000&auto=format&fit=crop',
    },
    {
        id: 10,
        title: 'The Ultimate Tech Stack',
        subtitle: 'Modern, Fast, Reliable',
        description: 'React 18 for fluid interfaces. Mapbox GL JS for WebGL rendering. Tailwind CSS for premium styling. Turf.js for complex spatial mathematics. This is not a template — it is a custom-built enterprise application.',
        icon: <Zap className="w-8 h-8 text-violet-500" />,
        color: 'from-violet-600 to-purple-500',
        image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2000&auto=format&fit=crop',
    },
];

// ── Scroll-reveal ─────────────────────────────────────────────────────────────
const useScrollReveal = () => {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12 }
        );
        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);
};

// ── Feature section card ──────────────────────────────────────────────────────
const FeatureSection: React.FC<{ section: typeof sections[0]; index: number }> = ({ section, index }) => {
    const isReversed = index % 2 !== 0;
    return (
        <section
            className={`reveal max-w-7xl mx-auto px-6 py-28 flex flex-col gap-16 items-center ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
                }`}
            style={{ transition: 'opacity 0.7s ease, transform 0.7s ease' }}
        >
            {/* Text column */}
            <div className="flex-1 space-y-7">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${section.color} p-0.5 shadow-xl`}>
                    <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                        {section.icon}
                    </div>
                </div>
                <div>
                    <p className={`text-sm font-black tracking-[0.22em] uppercase text-transparent bg-clip-text bg-gradient-to-r ${section.color} mb-3`}>
                        {section.subtitle}
                    </p>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                        {section.title}
                    </h2>
                    <p className="text-lg text-slate-500 leading-relaxed font-medium max-w-lg">
                        {section.description}
                    </p>
                </div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${section.color}`}>
                    <span className="text-xs font-black text-white tracking-widest uppercase opacity-90">
                        Feature {String(section.id).padStart(2, '0')} / 10
                    </span>
                </div>
            </div>

            {/* Image column */}
            <div className="flex-1 w-full relative group">
                <div className={`absolute inset-[-10%] bg-gradient-to-tr ${section.color} blur-3xl opacity-15 group-hover:opacity-30 transition-opacity duration-700 rounded-full pointer-events-none`} />
                <div className="relative rounded-3xl overflow-hidden border border-slate-100 shadow-2xl aspect-[4/3] transform group-hover:-translate-y-2 transition-transform duration-500">
                    <img
                        src={section.image}
                        alt={section.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
                    <div className={`absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-gradient-to-r ${section.color} shadow-lg`}>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{section.subtitle}</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

// ── Main component ────────────────────────────────────────────────────────────
const PresentationShowcase: React.FC = () => {
    useScrollReveal();

    return (
        <>
            <style>{`
        .reveal { opacity: 0; transform: translateY(40px); }
        .revealed { opacity: 1 !important; transform: translateY(0) !important; }
      `}</style>

            <div className="min-h-screen bg-slate-50 font-sans text-slate-800 overflow-x-hidden selection:bg-blue-500 selection:text-white">

                {/* HERO */}
                <div className="relative h-screen flex items-center justify-center overflow-hidden bg-slate-900">
                    <img
                        src="https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2000&auto=format&fit=crop"
                        alt="Abu Dhabi skyline"
                        className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/70 to-slate-900" />

                    {/* Decorative star dots */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {Array.from({ length: 60 }).map((_, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-white opacity-20 animate-pulse"
                                style={{
                                    width: `${Math.random() * 3 + 1}px`,
                                    height: `${Math.random() * 3 + 1}px`,
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 4}s`,
                                    animationDuration: `${2 + Math.random() * 4}s`,
                                }}
                            />
                        ))}
                    </div>

                    <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
                        <div className="inline-flex items-center mb-8 px-5 py-2 rounded-full border border-blue-500/40 bg-blue-500/10 backdrop-blur-md gap-2">
                            <MonitorPlay className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-300 font-bold tracking-widest text-xs uppercase">Proprietary Technology &middot; Management Briefing</span>
                        </div>

                        <h1 className="text-7xl md:text-9xl font-black text-white mb-6 tracking-tight leading-none">
                            PSI{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">MAPS</span>
                            <br />
                            <span className="text-5xl md:text-7xl font-black text-slate-300">PRO</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-slate-300 font-light max-w-3xl mx-auto leading-relaxed mb-12">
                            Advanced Spatial Intelligence for Luxury Real Estate. A technical breakdown of the engine driving the future of property sales in the UAE.
                        </p>

                        <div className="flex flex-wrap items-center justify-center gap-4">
                            {['10 Features', 'Real-Time Data', 'Mapbox WebGL', 'Firebase Cloud'].map((chip) => (
                                <span key={chip} className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                                    {chip}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                        <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Scroll</span>
                        <ArrowRight className="w-6 h-6 text-white/40 rotate-90" />
                    </div>
                </div>

                {/* STATS BAR */}
                <div className="bg-white border-y border-slate-100 shadow-sm">
                    <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: '10', label: 'Core Features', color: 'text-blue-600' },
                            { value: '<50ms', label: 'Filter Latency', color: 'text-emerald-600' },
                            { value: '∞', label: 'Listings Supported', color: 'text-purple-600' },
                            { value: '100%', label: 'Custom-Built', color: 'text-rose-600' },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <p className={`text-4xl font-black ${stat.color} mb-1`}>{stat.value}</p>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FEATURE SECTIONS */}
                <div className="bg-white divide-y divide-slate-50">
                    {sections.map((section, index) => (
                        <FeatureSection key={section.id} section={section} index={index} />
                    ))}
                </div>

                {/* TECH STACK */}
                <div className="bg-slate-900 py-16 border-t border-slate-800">
                    <div className="max-w-5xl mx-auto px-6 text-center mb-10">
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Powered By</p>
                        <h3 className="text-2xl font-black text-white">Enterprise-Grade Technology</h3>
                    </div>
                    <div className="max-w-5xl mx-auto px-6 flex flex-wrap justify-center gap-4">
                        {[
                            { name: 'React 18', desc: 'UI Framework', color: 'from-cyan-500 to-blue-500' },
                            { name: 'Mapbox GL JS', desc: 'WebGL Rendering', color: 'from-blue-500 to-indigo-500' },
                            { name: 'Turf.js', desc: 'Spatial Mathematics', color: 'from-emerald-500 to-teal-500' },
                            { name: 'Firebase', desc: 'Cloud Backend', color: 'from-amber-500 to-orange-500' },
                            { name: 'Clearbit', desc: 'Brand Intelligence', color: 'from-purple-500 to-violet-500' },
                            { name: 'TypeScript', desc: 'Type Safety', color: 'from-sky-500 to-blue-500' },
                            { name: 'Tailwind CSS', desc: 'Design System', color: 'from-rose-500 to-pink-500' },
                            { name: 'Vite', desc: 'Build Tooling', color: 'from-violet-500 to-fuchsia-500' },
                        ].map((tech) => (
                            <div key={tech.name} className={`bg-gradient-to-br ${tech.color} p-0.5 rounded-2xl shadow-lg hover:scale-105 transition-transform duration-200 cursor-default`}>
                                <div className="bg-slate-900 rounded-[14px] px-5 py-3 text-center">
                                    <p className={`text-sm font-black text-transparent bg-clip-text bg-gradient-to-r ${tech.color}`}>{tech.name}</p>
                                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">{tech.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FOOTER CTA */}
                <div className="bg-slate-900 py-32 text-center px-4 border-t border-slate-800 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl rounded-full pointer-events-none" />
                    <div className="relative z-10">
                        <div className="inline-flex items-center mb-8 px-4 py-2 rounded-full border border-white/10 bg-white/5 gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[11px] font-black text-white/60 uppercase tracking-widest">Live &amp; Deployed</span>
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
                            Built to{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Close.</span>
                        </h2>
                        <p className="text-slate-400 font-medium mb-12 max-w-xl mx-auto text-lg leading-relaxed">
                            This is not just a map. It is an interactive closing tool engineered to completely differentiate the PSI brand in a crowded market.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <button
                                onClick={() => window.open('/', '_blank')}
                                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-black tracking-wide transition-all shadow-lg shadow-blue-500/30 flex items-center gap-3"
                            >
                                <Map className="w-5 h-5" />
                                Launch the App
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => window.close()}
                                className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-black tracking-wide transition-all border border-white/20 backdrop-blur-sm"
                            >
                                Close Presentation
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default PresentationShowcase;
