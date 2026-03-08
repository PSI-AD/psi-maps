import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    PlayCircle, Sparkles, Compass, LayoutTemplate,
    Calculator, FileText, Images, Database,
    ArrowRight, MapPin, TrendingUp, Star, ChevronRight,
    Building2, Zap, Globe, BarChart3, Shield, Users,
    CheckCircle, Eye, Layers, Map as MapIcon,
} from 'lucide-react';

/*
 * ═══════════════════════════════════════════════════════════════════════════
 *  PSI Maps Pro — Presentation Showcase
 *  Monday.com-inspired premium SaaS aesthetic
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Scroll-triggered animation hook ──────────────────────────────────────
function useInView(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        if (!ref.current) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); },
            { threshold: 0.15, ...options });
        obs.observe(ref.current);
        return () => obs.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return { ref, inView };
}

// ── Animated counter ─────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [val, setVal] = useState(0);
    const { ref, inView } = useInView();
    useEffect(() => {
        if (!inView) return;
        let frame: number;
        const start = performance.now();
        const dur = 1800;
        const step = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            const ease = 1 - Math.pow(1 - t, 4);
            setVal(Math.round(ease * target));
            if (t < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [inView, target]);
    return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

// ── Section wrapper with scroll reveal ───────────────────────────────────
function RevealSection({ children, className = '', delay = 0 }: {
    children: React.ReactNode; className?: string; delay?: number;
}) {
    const { ref, inView } = useInView();
    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${className}`}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(40px)',
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

// ── Gradient badge ───────────────────────────────────────────────────────
function Badge({ children, gradient }: { children: React.ReactNode; gradient: string }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-widest uppercase text-white bg-gradient-to-r ${gradient} shadow-lg`}>
            {children}
        </span>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const PresentationShowcase: React.FC = () => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Unlock scrolling: add 'is-presentation' class to body (overrides overflow:hidden from index.html)
    useEffect(() => {
        document.body.classList.add('is-presentation');
        return () => { document.body.classList.remove('is-presentation'); };
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMousePos({
            x: ((e.clientX - rect.left) / rect.width - 0.5) * 20,
            y: ((e.clientY - rect.top) / rect.height - 0.5) * 20,
        });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden" style={{ fontFamily: "'Inter', 'system-ui', sans-serif" }}>
            {/* Google Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 1. HERO SECTION */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative min-h-[100vh] flex items-center justify-center px-6 overflow-hidden" onMouseMove={handleMouseMove}>
                {/* Background blobs */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/40 to-violet-200/30 blur-3xl" />
                    <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-rose-200/30 to-amber-200/20 blur-3xl" />
                    <div className="absolute bottom-0 left-1/3 w-[700px] h-[400px] rounded-full bg-gradient-to-br from-emerald-100/30 to-teal-100/20 blur-3xl" />
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    {/* Text */}
                    <RevealSection className="flex-1 text-center lg:text-left">
                        <Badge gradient="from-indigo-600 to-violet-600">
                            <Zap className="w-3 h-3" /> Next-Gen PropTech
                        </Badge>

                        <h1 className="mt-6 text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
                            <span className="bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
                                Real Estate
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 bg-clip-text text-transparent">
                                Intelligence,
                            </span>
                            <br />
                            <span className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
                                Visualized.
                            </span>
                        </h1>

                        <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-lg leading-relaxed font-medium">
                            The most advanced interactive property map platform.
                            Cinematic tours, AI-powered guidance, and real-time market intelligence — all in one place.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4 justify-center lg:justify-start">
                            <button className="px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm">
                                Launch PSI Maps <ArrowRight className="w-4 h-4" />
                            </button>
                            <button className="px-7 py-3.5 bg-white text-slate-700 font-bold rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 text-sm">
                                <PlayCircle className="w-4 h-4 text-indigo-500" /> Watch Demo
                            </button>
                        </div>

                        {/* Trust indicators */}
                        <div className="mt-10 flex gap-8 justify-center lg:justify-start text-sm text-slate-400">
                            <div className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-slate-600"><AnimatedCounter target={2400} suffix="+" /></span> Properties</div>
                            <div className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-indigo-500" /> <span className="font-bold text-slate-600"><AnimatedCounter target={7} /></span> Emirates</div>
                            <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-violet-500" /> <span className="font-bold text-slate-600"><AnimatedCounter target={85} /></span> Developers</div>
                        </div>
                    </RevealSection>

                    {/* Floating mock UI card */}
                    <RevealSection className="flex-1 max-w-lg w-full" delay={200}>
                        <div
                            className="relative"
                            style={{
                                transform: `perspective(1000px) rotateY(${mousePos.x * 0.3}deg) rotateX(${-mousePos.y * 0.3}deg)`,
                                transition: 'transform 0.1s ease-out',
                            }}
                        >
                            {/* Main card */}
                            <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 border border-slate-200/60 p-6 relative overflow-hidden">
                                {/* Fake map */}
                                <div className="h-52 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.4) 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                                    {/* Fake pins */}
                                    <div className="absolute top-8 left-12 flex items-center gap-1 bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                                        <MapPin className="w-2.5 h-2.5" /> Saadiyat
                                    </div>
                                    <div className="absolute top-16 right-16 flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
                                        <MapPin className="w-2.5 h-2.5" /> Yas Island
                                    </div>
                                    <div className="absolute bottom-12 left-1/3 flex items-center gap-1 bg-rose-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                                        <MapPin className="w-2.5 h-2.5" /> Al Reem
                                    </div>
                                    {/* Tour indicator */}
                                    <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-lg text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                        <PlayCircle className="w-3.5 h-3.5 text-indigo-400" /> Cinematic Tour Active
                                    </div>
                                </div>

                                {/* Fake property cards */}
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {[
                                        { name: 'Bloom Living', dev: 'Aldar', price: 'AED 1.2M', color: 'from-indigo-500 to-violet-500' },
                                        { name: 'Yas Bay', dev: 'Miral', price: 'AED 2.8M', color: 'from-emerald-500 to-teal-500' },
                                    ].map((p, i) => (
                                        <div key={i} className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                            <div className={`h-16 rounded-xl bg-gradient-to-br ${p.color} opacity-80`} />
                                            <p className="mt-2 text-[11px] font-black text-slate-800 truncate">{p.name}</p>
                                            <p className="text-[9px] text-slate-400 font-bold">{p.dev}</p>
                                            <p className="mt-1 text-[11px] font-black text-indigo-600">{p.price}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Floating AI chip */}
                            <div className="absolute -bottom-4 -left-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-violet-500/20 border border-violet-200/60 px-4 py-3 flex items-center gap-3 animate-bounce" style={{ animationDuration: '5s' }}>
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-violet-600 uppercase tracking-wider">AI Suggestion</p>
                                    <p className="text-[11px] font-bold text-slate-700">Explore nearby landmarks?</p>
                                </div>
                            </div>

                            {/* Floating stat */}
                            <div className="absolute -top-3 -right-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl shadow-emerald-500/20 border border-emerald-200/60 px-4 py-2.5 flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400">ROI Estimate</p>
                                    <p className="text-sm font-black text-emerald-600">+12.4%</p>
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400 animate-bounce">
                    <span className="text-[10px] font-bold tracking-widest uppercase">Scroll to explore</span>
                    <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 2. CINEMATIC MAP TOURS */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-violet-100/30 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <RevealSection className="flex-1">
                        <Badge gradient="from-violet-600 to-purple-600">
                            <PlayCircle className="w-3 h-3" /> Map Intelligence
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Cinematic
                            <span className="bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent"> 3D Flyovers</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-lg">
                            Automated drone-style tours that fly between properties at 60° pitch with smooth easing.
                            Each project gets a cinematic reveal with synchronized info panels.
                        </p>
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            {[
                                { icon: <Eye className="w-4 h-4" />, label: '60° Pitch', desc: 'Dramatic aerial angle' },
                                { icon: <MapIcon className="w-4 h-4" />, label: 'Auto Sequence', desc: 'Smart route planning' },
                                { icon: <Layers className="w-4 h-4" />, label: '3D Buildings', desc: 'Extruded city models' },
                                { icon: <Zap className="w-4 h-4" />, label: 'Smooth Easing', desc: 'Cinematic transitions' },
                            ].map((f, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-violet-50/50 transition-colors">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 shrink-0 mt-0.5">{f.icon}</div>
                                    <div>
                                        <p className="text-sm font-black text-slate-800">{f.label}</p>
                                        <p className="text-xs text-slate-400 font-medium">{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealSection>

                    {/* Floating mock visual */}
                    <RevealSection className="flex-1 max-w-lg w-full" delay={150}>
                        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-3xl p-8 shadow-2xl shadow-violet-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                            <div className="relative z-10">
                                {/* Fake tour UI */}
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                                    <span className="ml-2 text-[10px] text-white/60 font-bold">PSI Maps Pro — Cinematic Tour</span>
                                </div>
                                <div className="h-44 rounded-2xl bg-white/10 backdrop-blur relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/40 to-purple-700/40" />
                                    {/* Flight path line */}
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200">
                                        <path d="M40,150 Q100,40 200,100 T360,50" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="8,4">
                                            <animate attributeName="stroke-dashoffset" from="100" to="0" dur="3s" repeatCount="indefinite" />
                                        </path>
                                        <circle cx="200" cy="100" r="6" fill="#818cf8">
                                            <animate attributeName="cx" values="40;200;360" dur="3s" repeatCount="indefinite" />
                                            <animate attributeName="cy" values="150;100;50" dur="3s" repeatCount="indefinite" />
                                        </circle>
                                    </svg>
                                    {/* Location labels */}
                                    <div className="absolute top-3 left-3 bg-white/20 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-bold text-white">Saadiyat Island</div>
                                    <div className="absolute bottom-3 right-3 bg-white/20 backdrop-blur px-2 py-1 rounded-lg text-[9px] font-bold text-white">Yas Bay</div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-4 flex items-center gap-3">
                                    <PlayCircle className="w-5 h-5 text-white/80" />
                                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full" style={{ width: '65%', transition: 'width 3s linear' }} />
                                    </div>
                                    <span className="text-[10px] text-white/60 font-bold">3 of 8</span>
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 3. AI MAP GUIDE */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6 bg-white">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 left-0 w-[600px] h-[400px] rounded-full bg-indigo-100/20 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
                    {/* Visual on LEFT */}
                    <RevealSection className="flex-1 max-w-md w-full" delay={150}>
                        <div className="relative">
                            {/* Glassmorphic chat */}
                            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-indigo-500/15 border border-indigo-200/50 p-6">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                                        <Sparkles className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">AI Map Guide</p>
                                        <p className="text-sm font-bold text-slate-800">Context-aware assistant</p>
                                    </div>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                                    <p className="text-[13px] text-slate-600 font-bold leading-relaxed">
                                        What would you like to explore about <span className="text-indigo-600 font-black">Bloom Living</span>?
                                    </p>
                                </div>
                                {/* Action chips */}
                                <div className="space-y-2">
                                    {[
                                        { label: 'Nearby Landmarks', sub: '12 places', color: 'from-emerald-500 to-emerald-600', icon: <Compass className="w-3.5 h-3.5" /> },
                                        { label: 'Projects by Aldar', sub: '8 projects', color: 'from-violet-500 to-purple-600', icon: <Building2 className="w-3.5 h-3.5" /> },
                                        { label: 'Off-Plan Projects', sub: '5 nearby', color: 'from-amber-500 to-orange-500', icon: <TrendingUp className="w-3.5 h-3.5" /> },
                                    ].map((chip, i) => (
                                        <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${chip.color} flex items-center justify-center text-white shrink-0`}>{chip.icon}</div>
                                            <div className="flex-1">
                                                <span className="text-[13px] font-black text-slate-800">{chip.label}</span>
                                                <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">{chip.sub}</span>
                                            </div>
                                            <PlayCircle className="w-4 h-4 text-slate-300" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {/* Floating pill */}
                            <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg shadow-violet-500/30 flex items-center gap-1.5">
                                <Zap className="w-3 h-3" /> Remote Control for Your Map
                            </div>
                        </div>
                    </RevealSection>

                    {/* Text on RIGHT */}
                    <RevealSection className="flex-1">
                        <Badge gradient="from-indigo-600 to-blue-600">
                            <Sparkles className="w-3 h-3" /> AI Powered
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Your AI
                            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"> Map Guide</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-lg">
                            A floating glassmorphic assistant that reads context from the map.
                            Select a project and get instant, actionable suggestions — each one is a
                            remote‑control button that triggers existing map features.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {['Context-aware action chips', 'Triggers existing tours & filters', 'Always active, disabled only during tours', 'Dual design styles (Classic & Modern)'].map((t, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                    <CheckCircle className="w-4 h-4 text-indigo-500 shrink-0" /> {t}
                                </li>
                            ))}
                        </ul>
                    </RevealSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 4. SMART NEIGHBORHOOD DISCOVERY */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-100/30 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <RevealSection className="flex-1">
                        <Badge gradient="from-emerald-600 to-teal-600">
                            <Compass className="w-3 h-3" /> Discovery
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Smart Neighborhood
                            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"> Discovery</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-lg">
                            Every landmark near a property is enriched with "Wow" facts — not generic data.
                            Museums, schools, parks, and hospitals each tell a story about the neighborhood.
                        </p>
                    </RevealSection>

                    <RevealSection className="flex-1 max-w-lg w-full" delay={150}>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { name: 'Louvre Abu Dhabi', icon: <Star className="w-4 h-4" />, fact: 'World\'s largest art museum dome', dist: '2.3 km', gradient: 'from-amber-400 to-orange-500' },
                                { name: 'NYUAD', icon: <Building2 className="w-4 h-4" />, fact: 'Top 20 globally ranked university', dist: '1.1 km', gradient: 'from-indigo-400 to-blue-500' },
                                { name: 'Mangrove Walk', icon: <Compass className="w-4 h-4" />, fact: 'UNESCO biosphere kayak trail', dist: '3.5 km', gradient: 'from-emerald-400 to-teal-500' },
                                { name: 'Cleveland Clinic', icon: <Shield className="w-4 h-4" />, fact: 'US #1 hospital, ME campus', dist: '4.2 km', gradient: 'from-rose-400 to-pink-500' },
                            ].map((l, i) => (
                                <div key={i} className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 duration-300 group">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.gradient} flex items-center justify-center text-white shadow-md mb-3`}>{l.icon}</div>
                                    <p className="text-sm font-black text-slate-800">{l.name}</p>
                                    <p className="text-[11px] text-slate-400 font-medium mt-1 leading-snug">{l.fact}</p>
                                    <div className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                        <MapPin className="w-3 h-3" /> {l.dist} away
                                    </div>
                                </div>
                            ))}
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 5. DYNAMIC SPATIAL UI */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6 bg-white">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full bg-rose-100/20 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-16">
                    {/* Visual */}
                    <RevealSection className="flex-1 max-w-md w-full" delay={150}>
                        <div className="bg-slate-900 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                            <div className="flex gap-3 relative z-10">
                                {/* Accordion sidebar */}
                                <div className="w-[120px] bg-slate-800 rounded-2xl p-3 space-y-2 shrink-0">
                                    <div className="h-2.5 bg-indigo-500 rounded-full w-full" />
                                    <div className="h-2 bg-slate-600 rounded-full w-3/4" />
                                    <div className="h-2 bg-slate-700 rounded-full w-full" />
                                    <div className="h-6 bg-slate-700 rounded-lg mt-3" />
                                    <div className="h-6 bg-indigo-500/30 border border-indigo-500/40 rounded-lg" />
                                    <div className="h-6 bg-slate-700 rounded-lg" />
                                    <div className="h-6 bg-slate-700 rounded-lg" />
                                    <div className="h-1.5 bg-slate-700 rounded-full w-2/3 mt-3" />
                                </div>
                                {/* Map area */}
                                <div className="flex-1 bg-slate-700 rounded-2xl relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-violet-600/10" />
                                    <div className="absolute top-2 right-2 bg-slate-800 rounded-lg px-2 py-1 text-[8px] text-white/60 font-bold">MAP IS ALWAYS THE STAR</div>
                                    {/* Fake cluster dots */}
                                    <div className="absolute top-1/4 left-1/3 w-6 h-6 rounded-full bg-indigo-500/60 flex items-center justify-center text-[8px] text-white font-black">12</div>
                                    <div className="absolute bottom-1/3 right-1/4 w-5 h-5 rounded-full bg-emerald-500/60 flex items-center justify-center text-[8px] text-white font-black">8</div>
                                    <div className="absolute top-1/2 left-1/2 w-4 h-4 rounded-full bg-amber-500/60 flex items-center justify-center text-[7px] text-white font-black">3</div>
                                </div>
                            </div>
                            {/* Label */}
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400 font-bold relative z-10">
                                <LayoutTemplate className="w-3 h-3" /> Sidebar auto-shrinks to maximize map space
                            </div>
                        </div>
                    </RevealSection>

                    {/* Text */}
                    <RevealSection className="flex-1">
                        <Badge gradient="from-rose-500 to-pink-600">
                            <LayoutTemplate className="w-3 h-3" /> Spatial UI
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Dynamic
                            <span className="bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent"> Spatial UI</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-lg">
                            The accordion sidebar dynamically shrinks and expands so the interactive map
                            always takes center stage. Every pixel is optimized for spatial exploration.
                        </p>
                        <ul className="mt-6 space-y-3">
                            {['Accordion sidebar with smart collapse', 'Map-first responsive layout', 'Dynamic property cards with scroll-sync', 'Touch-optimized for mobile'].map((t, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                                    <CheckCircle className="w-4 h-4 text-rose-500 shrink-0" /> {t}
                                </li>
                            ))}
                        </ul>
                    </RevealSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 6. FINANCIAL ROI ENGINE */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full bg-amber-100/30 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
                    <RevealSection className="flex-1">
                        <Badge gradient="from-amber-500 to-orange-500">
                            <Calculator className="w-3 h-3" /> Financial Tools
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Financial
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent"> ROI Engine</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-500 leading-relaxed max-w-lg">
                            Built-in Rent vs. Buy calculators, mortgage estimators, and investment ROI projections.
                            Every property page becomes a financial decision dashboard.
                        </p>
                    </RevealSection>

                    <RevealSection className="flex-1 max-w-lg w-full" delay={150}>
                        <div className="bg-white rounded-3xl shadow-2xl shadow-amber-500/10 border border-amber-200/50 p-6 space-y-4">
                            {/* Fake calculator */}
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md">
                                    <Calculator className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">Investment Calculator</p>
                                    <p className="text-[11px] text-slate-400 font-medium">Bloom Living — 2BR Apartment</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'Purchase Price', value: 'AED 1,200,000', color: 'text-slate-800' },
                                    { label: 'Monthly Rent', value: 'AED 8,500', color: 'text-indigo-600' },
                                    { label: 'Annual Yield', value: '8.5%', color: 'text-emerald-600' },
                                    { label: '5-Year ROI', value: '+42.3%', color: 'text-amber-600' },
                                ].map((m, i) => (
                                    <div key={i} className="bg-slate-50 rounded-xl p-3">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{m.label}</p>
                                        <p className={`text-base font-black ${m.color} mt-1`}>{m.value}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Fake chart */}
                            <div className="h-24 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl relative overflow-hidden flex items-end px-3 pb-2 gap-1.5">
                                {[35, 42, 38, 55, 48, 62, 58, 72, 68, 80, 85, 92].map((h, i) => (
                                    <div key={i} className="flex-1 bg-gradient-to-t from-amber-400 to-orange-400 rounded-t-md transition-all" style={{ height: `${h}%`, opacity: 0.7 + (i * 0.025) }} />
                                ))}
                                <div className="absolute top-2 right-3 text-[9px] font-black text-amber-600 flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" /> 12-Month Trend
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 7 + 8 + 9 — BENTO GRID */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-28 px-6 bg-white">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-gradient-to-br from-indigo-50/50 to-violet-50/30 blur-3xl" />
                </div>
                <div className="max-w-7xl mx-auto">
                    <RevealSection className="text-center mb-16">
                        <Badge gradient="from-slate-700 to-slate-900">
                            <Zap className="w-3 h-3" /> More Features
                        </Badge>
                        <h2 className="mt-5 text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                            Everything You Need,
                            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent"> Built In</span>
                        </h2>
                        <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                            From instant PDF brochures to immersive galleries and automated data enrichment.
                        </p>
                    </RevealSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* 7. PDF Reporting */}
                        <RevealSection delay={0}>
                            <div className="bg-white rounded-3xl p-7 border border-slate-200/60 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full group">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg shadow-rose-500/20 mb-5">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Instant PDF Reporting</h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    One-click property brochures with project details, floor plans,
                                    images, and investment metrics — branded and ready to share.
                                </p>
                                {/* Fake PDF preview */}
                                <div className="mt-5 bg-slate-50 rounded-2xl p-4 border border-slate-100 group-hover:bg-rose-50/30 transition-colors">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-6 h-6 rounded bg-rose-100 flex items-center justify-center"><FileText className="w-3 h-3 text-rose-500" /></div>
                                        <span className="text-[10px] font-bold text-slate-500">BloomLiving_Brochure.pdf</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2 bg-slate-200 rounded-full w-full" />
                                        <div className="h-2 bg-slate-200 rounded-full w-4/5" />
                                        <div className="h-8 bg-slate-200 rounded mt-2" />
                                        <div className="h-2 bg-slate-200 rounded-full w-3/5" />
                                    </div>
                                </div>
                            </div>
                        </RevealSection>

                        {/* 8. Immersive Visuals */}
                        <RevealSection delay={100}>
                            <div className="bg-white rounded-3xl p-7 border border-slate-200/60 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full group">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-5">
                                    <Images className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Immersive Visuals</h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    Full-screen lightbox galleries, interactive floor plan viewers,
                                    and embedded Google Street View — all within the map experience.
                                </p>
                                {/* Fake gallery */}
                                <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-2xl overflow-hidden group-hover:gap-2 transition-all">
                                    {[
                                        'from-indigo-400 to-blue-500',
                                        'from-violet-400 to-purple-500',
                                        'from-emerald-400 to-teal-500',
                                        'from-amber-400 to-orange-500',
                                        'from-rose-400 to-pink-500',
                                        'from-cyan-400 to-blue-500',
                                    ].map((g, i) => (
                                        <div key={i} className={`h-14 bg-gradient-to-br ${g} rounded-lg opacity-70 hover:opacity-100 transition-opacity cursor-pointer`} />
                                    ))}
                                </div>
                            </div>
                        </RevealSection>

                        {/* 9. Data Enrichment */}
                        <RevealSection delay={200}>
                            <div className="bg-white rounded-3xl p-7 border border-slate-200/60 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 h-full group">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-5">
                                    <Database className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900">Automated Enrichment</h3>
                                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                                    Backend magic that auto-fetches developer logos, audits map coordinates,
                                    and maintains data quality across 2,400+ properties.
                                </p>
                                {/* Fake pipeline */}
                                <div className="mt-5 space-y-2.5">
                                    {[
                                        { label: 'Logo Fetch', status: 'complete', icon: <CheckCircle className="w-3.5 h-3.5" /> },
                                        { label: 'Coordinate Audit', status: 'complete', icon: <CheckCircle className="w-3.5 h-3.5" /> },
                                        { label: 'Image Optimization', status: 'running', icon: <Zap className="w-3.5 h-3.5" /> },
                                        { label: 'SEO Metadata', status: 'queued', icon: <BarChart3 className="w-3.5 h-3.5" /> },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 group-hover:bg-emerald-50/30 transition-colors">
                                            <span className={s.status === 'complete' ? 'text-emerald-500' : s.status === 'running' ? 'text-amber-500 animate-pulse' : 'text-slate-300'}>
                                                {s.icon}
                                            </span>
                                            <span className="text-[12px] font-bold text-slate-700 flex-1">{s.label}</span>
                                            <span className={`text-[9px] font-black uppercase tracking-wider ${s.status === 'complete' ? 'text-emerald-500' : s.status === 'running' ? 'text-amber-500' : 'text-slate-300'
                                                }`}>{s.status}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </RevealSection>
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 10. FOOTER CTA */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="relative py-32 px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700" />
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                {/* Floating blobs */}
                <div className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] rounded-full bg-purple-400/20 blur-3xl" />

                <RevealSection className="relative z-10 text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-full text-white/80 text-[11px] font-bold mb-6">
                        <Sparkles className="w-3.5 h-3.5" /> Ready to transform your real estate experience?
                    </div>

                    <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                        Launch
                        <br />
                        <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
                            PSI Maps Pro
                        </span>
                    </h2>

                    <p className="mt-6 text-lg text-indigo-200 leading-relaxed max-w-xl mx-auto">
                        Join the future of property intelligence. Interactive maps, AI guidance,
                        cinematic tours, and financial tools — all in one powerful platform.
                    </p>

                    <div className="mt-10 flex flex-wrap gap-4 justify-center">
                        <button className="px-8 py-4 bg-white text-indigo-700 font-black rounded-2xl shadow-2xl shadow-black/20 hover:shadow-white/30 hover:scale-105 transition-all duration-300 text-sm flex items-center gap-2">
                            Get Started Free <ArrowRight className="w-4 h-4" />
                        </button>
                        <button className="px-8 py-4 bg-white/10 backdrop-blur text-white font-bold rounded-2xl border border-white/20 hover:bg-white/20 hover:scale-105 transition-all duration-300 text-sm flex items-center gap-2">
                            <PlayCircle className="w-4 h-4" /> Schedule Demo
                        </button>
                    </div>

                    {/* Trust bar */}
                    <div className="mt-14 flex flex-wrap gap-8 justify-center text-sm text-indigo-200/80">
                        <div className="flex items-center gap-2"><Shield className="w-4 h-4" /> Enterprise Security</div>
                        <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> UAE Coverage</div>
                        <div className="flex items-center gap-2"><Zap className="w-4 h-4" /> Real-time Data</div>
                        <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Team Collaboration</div>
                    </div>
                </RevealSection>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 py-8 px-6 text-center">
                <p className="text-sm text-slate-500 font-medium">
                    © 2026 PSI Maps Pro — Property Sciences Intelligence. All rights reserved.
                </p>
            </footer>
        </div>
    );
};

export default PresentationShowcase;
