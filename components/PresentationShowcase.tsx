import React, { useEffect, useRef, useState } from 'react';
import logoImage from '../assets/icon.png';
import splashImage from '../assets/splash.png';
import appPreviewImage from '../tmp/pdfs/rendered/psi-maps-app-summary-page-1.png';
import {
    ArrowRight,
    Building2,
    CheckCircle,
    ChevronRight,
    Compass,
    Database,
    LayoutTemplate,
    Layers,
    Map as MapIcon,
    PlayCircle,
    Search,
    Sparkles,
    Star,
    TrendingUp,
    Zap,
} from 'lucide-react';

function useInView(options?: IntersectionObserverInit) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        if (!ref.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setInView(true);
            },
            { threshold: 0.15, ...options },
        );

        observer.observe(ref.current);
        return () => observer.disconnect();
    }, [options]);

    return { ref, inView };
}

function RevealSection({
    children,
    className = '',
    delay = 0,
}: {
    children: React.ReactNode;
    className?: string;
    delay?: number;
}) {
    const { ref, inView } = useInView();

    return (
        <div
            ref={ref}
            className={`transition-all duration-700 ease-out ${className}`}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(34px)',
                transitionDelay: `${delay}ms`,
            }}
        >
            {children}
        </div>
    );
}

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [value, setValue] = useState(0);
    const { ref, inView } = useInView();

    useEffect(() => {
        if (!inView) return;

        let frame = 0;
        const start = performance.now();
        const duration = 1400;

        const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(Math.round(target * eased));
            if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [inView, target]);

    return (
        <span ref={ref}>
            {value}
            {suffix}
        </span>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#12263a]/10 bg-white/70 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#0f5c73] shadow-[0_20px_40px_-32px_rgba(6,19,29,0.7)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#18c8c8]" />
                {eyebrow}
            </div>
            <h2
                className="mt-5 text-4xl font-black tracking-[-0.04em] text-[#06131d] sm:text-5xl"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
                {title}
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#385061]">{description}</p>
        </div>
    );
}

function BrandLogo({ kind }: { kind: 'react' | 'mapbox' | 'firebase' | 'tailwind' | 'typescript' | 'vite' | 'capacitor' | 'gemini' }) {
    const shell =
        'flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-[#091922] shadow-[0_30px_70px_-35px_rgba(6,19,29,0.9)]';

    if (kind === 'react') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <circle cx="32" cy="32" r="5" fill="#61dafb" />
                    <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#61dafb" strokeWidth="3" />
                    <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#61dafb" strokeWidth="3" transform="rotate(60 32 32)" />
                    <ellipse cx="32" cy="32" rx="22" ry="9" fill="none" stroke="#61dafb" strokeWidth="3" transform="rotate(120 32 32)" />
                </svg>
            </div>
        );
    }

    if (kind === 'mapbox') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <circle cx="32" cy="32" r="23" fill="#ffffff" />
                    <circle cx="32" cy="32" r="10" fill="#091922" />
                    <path d="M32 13 36 24 47 32 36 40 32 51 28 40 17 32 28 24Z" fill="#091922" />
                </svg>
            </div>
        );
    }

    if (kind === 'firebase') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <path d="M18 45.5 28 15l8 10.5-18 20Z" fill="#ffca28" />
                    <path d="M23 49 44 19l2 19.5L23 49Z" fill="#ffa000" />
                    <path d="M19 45.5 46 38.5 33.5 56Z" fill="#f57c00" />
                </svg>
            </div>
        );
    }

    if (kind === 'tailwind') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <path d="M18 25c3.2-6.8 8.4-10 15.5-10 10.5 0 11.9 7.8 17.2 8.8 3 .6 5.6-.6 8.3-3.8-3.1 6.8-8.3 10-15.5 10-10.5 0-11.9-7.8-17.2-8.8-3-.6-5.6.6-8.3 3.8Z" fill="#38bdf8" />
                    <path d="M6 39c3.1-6.8 8.3-10 15.4-10 10.5 0 11.9 7.8 17.2 8.8 3 .6 5.6-.6 8.4-3.8-3.2 6.8-8.4 10-15.5 10-10.5 0-11.9-7.8-17.2-8.8-3-.6-5.6.6-8.3 3.8Z" fill="#38bdf8" />
                </svg>
            </div>
        );
    }

    if (kind === 'typescript') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <rect x="10" y="10" width="44" height="44" rx="10" fill="#3178c6" />
                    <path d="M21 24h21v6h-7.5v22h-6V30H21z" fill="#fff" />
                    <path d="M43.5 34.5c1.7 0 3.3.3 4.8 1.1v5c-1.6-1-3-1.5-4.7-1.5-1.5 0-2.4.4-2.4 1.3 0 .8.7 1.1 3 1.9 3.7 1.2 5.3 2.7 5.3 5.8 0 4-3.2 6.3-8 6.3-2.3 0-4.8-.5-6.6-1.6V48c1.8 1.2 3.8 1.8 6 1.8 1.7 0 2.6-.5 2.6-1.5 0-1-.8-1.3-3.2-2.1-3.4-1.1-5-2.6-5-5.5 0-3.8 3.1-6.2 8.2-6.2Z" fill="#fff" />
                </svg>
            </div>
        );
    }

    if (kind === 'vite') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <defs>
                        <linearGradient id="vite-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#41d1ff" />
                            <stop offset="100%" stopColor="#bd34fe" />
                        </linearGradient>
                    </defs>
                    <path d="M33 8 15 13l13 39a4 4 0 0 0 7.4.2L49 13 33 8Z" fill="url(#vite-gradient)" />
                    <path d="m43 18-11 22.5-6-13 17-9.5Z" fill="#ffd62e" />
                </svg>
            </div>
        );
    }

    if (kind === 'capacitor') {
        return (
            <div className={shell}>
                <svg viewBox="0 0 64 64" className="h-9 w-9">
                    <circle cx="32" cy="32" r="20" fill="none" stroke="#53b9ff" strokeWidth="4" />
                    <circle cx="19" cy="32" r="4.5" fill="#53b9ff" />
                    <circle cx="45" cy="32" r="4.5" fill="#53b9ff" />
                    <path d="M24 22c2.8-2.4 5.9-3.6 9.3-3.6s6.5 1.2 9.3 3.6" fill="none" stroke="#53b9ff" strokeLinecap="round" strokeWidth="4" />
                    <path d="M24 42c2.8 2.4 5.9 3.6 9.3 3.6s6.5-1.2 9.3-3.6" fill="none" stroke="#53b9ff" strokeLinecap="round" strokeWidth="4" />
                </svg>
            </div>
        );
    }

    return (
        <div className={shell}>
            <svg viewBox="0 0 64 64" className="h-9 w-9">
                <path d="M33 9c7.4 0 11.2 4.2 11.2 9.1 0 4-2.4 6.8-5.8 8.1 4.7.8 8.3 4.5 8.3 10 0 7.7-5.7 13.8-16 13.8S14 44.1 14 36.7c0-5.3 3.2-9.1 7.7-10.3-3.2-1.3-5.3-4-5.3-7.8C16.4 13.4 22.2 9 33 9Zm-2 25.1c-4.7 0-7.4 2-7.4 5.1 0 3.2 2.7 5.4 7.3 5.4 4.9 0 7.7-2 7.7-5.3 0-3.2-2.7-5.2-7.6-5.2Zm1.2-18.2c-4 0-6.5 1.8-6.5 4.6s2.4 4.5 6.6 4.5c4.2 0 6.5-1.8 6.5-4.5 0-2.8-2.3-4.6-6.6-4.6Z" fill="#8df5d6" />
            </svg>
        </div>
    );
}

const techStack = [
    {
        name: 'React',
        version: '18.3.1',
        kind: 'react' as const,
        description: 'Component runtime for the interactive UI, lazy-loaded experiences, and polished motion.',
        tint: 'from-[#06131d] via-[#0b2d3d] to-[#11465d]',
    },
    {
        name: 'Mapbox GL JS',
        version: '3.2.0',
        kind: 'mapbox' as const,
        description: 'The 3D map engine powering cinematic flyovers, styles, markers, overlays, and terrain-rich scenes.',
        tint: 'from-[#05131c] via-[#12263a] to-[#203a4b]',
    },
    {
        name: 'Firebase',
        version: '12.9.0',
        kind: 'firebase' as const,
        description: 'Firestore, Hosting, Analytics, Functions, and real-time sync for the operating backbone.',
        tint: 'from-[#241600] via-[#4a2500] to-[#7a3300]',
    },
    {
        name: 'Google Gemini',
        version: '@google/genai',
        kind: 'gemini' as const,
        description: 'Context-aware property guidance, investment storytelling, and guided discovery inside the map.',
        tint: 'from-[#0a1820] via-[#0d3532] to-[#14605b]',
    },
    {
        name: 'Tailwind CSS',
        version: '3.4.1',
        kind: 'tailwind' as const,
        description: 'The design layer used to build premium layouts, glass surfaces, and fast visual iteration.',
        tint: 'from-[#06131d] via-[#083b49] to-[#0b7285]',
    },
    {
        name: 'TypeScript',
        version: '5.8.2',
        kind: 'typescript' as const,
        description: 'Typed contracts for projects, landmarks, presentation flows, utilities, and admin operations.',
        tint: 'from-[#05111d] via-[#0c2842] to-[#154980]',
    },
    {
        name: 'Vite',
        version: '6.2.0',
        kind: 'vite' as const,
        description: 'Fast bundling and code-splitting so heavy map features still feel immediate in the browser.',
        tint: 'from-[#0f1026] via-[#24124c] to-[#3f1c76]',
    },
    {
        name: 'Capacitor',
        version: '8.x',
        kind: 'capacitor' as const,
        description: 'One codebase delivered to web, PWA, iOS, and Android with native-grade behavior and packaging.',
        tint: 'from-[#07111c] via-[#0c3150] to-[#0f5f99]',
    },
];

const toolChips = [
    'Mapbox GL Draw',
    'Turf.js',
    '@react-pdf/renderer',
    'use-supercluster',
    'Swiper',
    'Axios',
    'EmailJS',
    'Firebase Functions',
];

const workflowSteps = [
    {
        step: '01',
        title: 'Open the territory',
        description: 'Start with a cinematic live map, then frame the right city, community, landmark cluster, or curated tour.',
        icon: MapIcon,
        accent: 'from-[#18c8c8] to-[#0f8ab3]',
    },
    {
        step: '02',
        title: 'Expose spatial advantage',
        description: 'Switch styles, lift into 3D, orbit assets, compare overlays, and reveal why one location commands a premium.',
        icon: Compass,
        accent: 'from-[#0f8ab3] to-[#1c6dd0]',
    },
    {
        step: '03',
        title: 'Translate into value',
        description: 'Move from imagery into ROI stories, nearby intelligence, rent-vs-buy logic, and investor-ready explanations.',
        icon: TrendingUp,
        accent: 'from-[#f7b34d] to-[#ef7d2a]',
    },
    {
        step: '04',
        title: 'Package the decision',
        description: 'Turn exploration into branded brochures, saved client presentations, and polished talking points for sales teams.',
        icon: LayoutTemplate,
        accent: 'from-[#ef7d2a] to-[#d64b39]',
    },
];

const featureGroups = [
    {
        eyebrow: 'Map Command Center',
        title: 'Spatial Navigation And Live Map Control',
        icon: Compass,
        accent: 'from-[#06131d] to-[#12415b]',
        bullets: [
            '3D buildings, cinematic pitch, orbit, reset north, and precision fly-to camera moves.',
            'Street, light, outdoors, and satellite map styles with instant switching.',
            'Lasso selection, polygon drawing, crosshair focus, zoom controls, and map PNG export.',
            'Community boundary overlays, landmark pins, clustered projects, and route layers.',
            'ROI heatmap overlays, timeline controls, and the historical Time Machine mode.',
            'Sunlight simulation, heatmap logic, and isochrone-ready analysis hooks already wired in.',
        ],
    },
    {
        eyebrow: 'Property Intelligence',
        title: 'From Beautiful Listing To Full Investment Narrative',
        icon: Building2,
        accent: 'from-[#12415b] to-[#18c8c8]',
        bullets: [
            'Rich project sidebar with gallery, lightbox, progress ring, and slideshow controls.',
            'Price ranges, bedrooms, bathrooms, areas, completion, status, and developer context.',
            'Construction timeline, monthly snapshots, view simulation, and before/after comparison.',
            'Rent-vs-buy calculator, investment story panels, walkability, noise, and traffic signals.',
            'Floor plan requests, inquiry flows, downloadable reports, and lead capture touchpoints.',
            'Favorites, shortlisting, comparison-ready review flows, and shareable pitch content.',
        ],
    },
    {
        eyebrow: 'Nearby Intelligence',
        title: 'Neighborhood Context That Makes The Map Persuasive',
        icon: Search,
        accent: 'from-[#08394c] to-[#0f8ab3]',
        bullets: [
            'Nearby schools, hospitals, retail, culture, hotels, leisure, airports, and ports.',
            'Drive-time, walk-time, and straight-distance context surfaced around any project or landmark.',
            'Reverse search from landmarks back to nearby projects within the chosen radius.',
            'Landmark fact cards, image galleries, and brand-aware context for destination storytelling.',
            'Street View, route planning, and AR-ready moments for deeper location immersion.',
            'A premium way to prove lifestyle value, not just show a pin on a map.',
        ],
    },
    {
        eyebrow: 'AI And Presentation',
        title: 'Smart Guidance For Sales Teams And Investor Demos',
        icon: Sparkles,
        accent: 'from-[#0d3532] to-[#18a975]',
        bullets: [
            'AI chat assistant tuned to the active project, landmark, community, or developer context.',
            'Guided prompts that launch tours, apply filters, open nearby searches, and frame decisions.',
            'Saved presentation playlists backed by Firestore with configurable property intervals.',
            'Standalone `/presentation` mode for clean, client-facing storytelling outside the core app.',
            'One-click PDF brochures with branded layouts and map-aware content.',
            'Exactly the layer that turns a product demo into a boardroom-grade presentation.',
        ],
    },
    {
        eyebrow: 'Operations And Growth',
        title: 'Admin, CMS, Performance, And Mobile Delivery',
        icon: Database,
        accent: 'from-[#3c1d0a] to-[#b86822]',
        bullets: [
            'Admin dashboard with CRUD for projects, landmarks, developers, communities, and cities.',
            'Visibility toggles, banner controls, camera timing, footer theme settings, and coordinate review.',
            'Predictive preloading, smart caching, recent-view restore, and resilient networking services.',
            'PWA install prompts, offline overlays, push notifications, deep links, and app shortcuts.',
            'Native-feel gestures, haptics, safe areas, and navigation stacks for mobile use.',
            'Capacitor wrappers for iOS and Android so the experience travels beyond the browser.',
        ],
    },
];

const proofPoints = [
    {
        icon: Layers,
        title: '52 UI Components',
        body: 'A broad component system tailored to mapping, sales storytelling, admin operations, and investor workflows.',
    },
    {
        icon: Database,
        title: '24 Utility Services',
        body: 'Caching, analytics, networking, image optimization, persistence, Firebase, valuation, and more.',
    },
    {
        icon: Zap,
        title: '7 Core Hooks',
        body: 'Device capabilities, gestures, favorites, map state, navigation, and project data keep the app responsive.',
    },
    {
        icon: Sparkles,
        title: '10 Data Scripts',
        body: 'Audit, enrichment, seeding, scraping, image optimization, and operational maintenance already built in.',
    },
];

const visualGallery = [
    {
        title: 'Product overview',
        caption: 'A real exported PSI Maps overview visual, used here as a dependable high-resolution product shot.',
        image: appPreviewImage,
    },
    {
        title: 'Brand icon system',
        caption: 'The product identity asset, bundled directly with the app so it renders consistently in presentation mode.',
        image: logoImage,
    },
    {
        title: 'Mobile app visual',
        caption: 'Native-ready PSI Maps branding artwork that reinforces the multi-platform delivery story.',
        image: splashImage,
    },
];

const finalOutcomes = [
    'Investor-grade storytelling with map, context, and value in one flow.',
    'Sales presentation mode that feels premium enough for launches and client meetings.',
    'Operational depth strong enough for admins, analysts, and marketing teams.',
];

const PresentationShowcase: React.FC = () => {
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    useEffect(() => {
        document.body.classList.add('is-presentation');
        window.scrollTo({ top: 0, behavior: 'auto' });
        return () => document.body.classList.remove('is-presentation');
    }, []);

    return (
        <div className="min-h-screen overflow-hidden bg-[#f4efe7] text-[#06131d]" style={{ fontFamily: "'Manrope', sans-serif" }}>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link
                href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap"
                rel="stylesheet"
            />
            <style>{`
                @keyframes psi-grid-pan {
                    from { background-position: 0 0; }
                    to { background-position: 140px 140px; }
                }
                @keyframes psi-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes psi-float-slow {
                    0%, 100% { transform: translate3d(0, 0, 0); }
                    50% { transform: translate3d(0, -14px, 0); }
                }
                @keyframes psi-pulse-ring {
                    0% { transform: scale(0.85); opacity: 0.9; }
                    100% { transform: scale(1.7); opacity: 0; }
                }
                @keyframes psi-drift {
                    0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
                    50% { transform: translate3d(16px, -18px, 0) rotate(8deg); }
                }
                .psi-grid {
                    background-image:
                        linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px);
                    background-size: 42px 42px;
                    animation: psi-grid-pan 18s linear infinite;
                }
                .psi-float { animation: psi-float 6s ease-in-out infinite; }
                .psi-float-slow { animation: psi-float-slow 9s ease-in-out infinite; }
                .psi-drift { animation: psi-drift 11s ease-in-out infinite; }
                .psi-ring::after {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 999px;
                    border: 1px solid rgba(24, 200, 200, 0.38);
                    animation: psi-pulse-ring 2s ease-out infinite;
                }
            `}</style>

            <section className="relative overflow-hidden bg-[#06131d] px-6 pb-24 pt-7 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,200,200,0.18),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(247,179,77,0.18),transparent_25%),linear-gradient(135deg,#06131d_0%,#0b2231_52%,#102b3a_100%)]" />
                <div className="absolute left-[-14rem] top-12 h-[26rem] w-[26rem] rounded-full bg-[#18c8c8]/12 blur-3xl" />
                <div className="absolute right-[-8rem] top-40 h-[24rem] w-[24rem] rounded-full bg-[#ef7d2a]/14 blur-3xl" />

                <div className="relative mx-auto max-w-7xl">
                    <div className="flex flex-wrap items-center justify-between gap-6 rounded-full border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/12">
                                <img src={logoImage} alt="PSI Maps Pro" className="h-9 w-9 object-contain" />
                            </div>
                            <div>
                                <div className="text-[11px] font-extrabold uppercase tracking-[0.34em] text-[#8ed7d9]">PSI Maps Pro</div>
                                <div className="text-sm font-semibold text-white/70">Spatial intelligence for real estate presentations</div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/60">
                            <a href="#workflow" className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">Flow</a>
                            <a href="#technology" className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">Technology</a>
                            <a href="#feature-atlas" className="rounded-full px-3 py-2 transition hover:bg-white/8 hover:text-white">Features</a>
                        </div>
                    </div>

                    <div className="mt-16 grid items-center gap-14 lg:grid-cols-[1.02fr_0.98fr]">
                        <RevealSection>
                            <div className="inline-flex items-center gap-2 rounded-full border border-[#18c8c8]/30 bg-[#18c8c8]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#9ef2f2]">
                                <Sparkles className="h-3.5 w-3.5" />
                                World-Class Presentation Layer
                            </div>

                            <h1
                                className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl xl:text-7xl"
                                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            >
                                Present the map like the{' '}
                                <span className="bg-[linear-gradient(110deg,#d2fff6_0%,#71e8f1_45%,#f7b34d_100%)] bg-clip-text text-transparent">
                                    flagship product
                                </span>{' '}
                                it already is.
                            </h1>

                            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/74 sm:text-xl">
                                This page turns PSI Maps Pro into a premium sales-stage experience: the live map, the intelligence layer,
                                the presentation system, the technology stack, and the full feature set all framed with stronger visuals and
                                a more convincing story.
                            </p>

                            <div className="mt-9 flex flex-wrap gap-3">
                                <a
                                    href="#feature-atlas"
                                    className="inline-flex items-center gap-2 rounded-full bg-[#f7b34d] px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.22em] text-[#06131d] shadow-[0_30px_70px_-30px_rgba(247,179,77,0.7)] transition hover:-translate-y-0.5"
                                >
                                    Explore the feature atlas
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                                <a
                                    href="#technology"
                                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-6 py-3.5 text-sm font-extrabold uppercase tracking-[0.22em] text-white/85 transition hover:border-white/20 hover:bg-white/10"
                                >
                                    View the software stack
                                    <ChevronRight className="h-4 w-4" />
                                </a>
                            </div>

                            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                                    <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/52">Components</div>
                                    <div className="mt-3 text-4xl font-black tracking-[-0.05em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        <AnimatedCounter target={52} suffix="+" />
                                    </div>
                                    <div className="mt-2 text-sm text-white/62">specialized UI modules</div>
                                </div>
                                <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                                    <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/52">Services</div>
                                    <div className="mt-3 text-4xl font-black tracking-[-0.05em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        <AnimatedCounter target={24} suffix="+" />
                                    </div>
                                    <div className="mt-2 text-sm text-white/62">utility engines behind the scenes</div>
                                </div>
                                <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                                    <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/52">Hooks</div>
                                    <div className="mt-3 text-4xl font-black tracking-[-0.05em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        <AnimatedCounter target={7} />
                                    </div>
                                    <div className="mt-2 text-sm text-white/62">core interaction and state layers</div>
                                </div>
                                <div className="rounded-[28px] border border-white/10 bg-white/7 p-5 backdrop-blur-xl">
                                    <div className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/52">Automation</div>
                                    <div className="mt-3 text-4xl font-black tracking-[-0.05em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        <AnimatedCounter target={10} />
                                    </div>
                                    <div className="mt-2 text-sm text-white/62">scripts for audits, seeding, and ops</div>
                                </div>
                            </div>
                        </RevealSection>

                        <RevealSection delay={150} className="relative">
                            <div
                                className="relative rounded-[36px] border border-white/10 bg-white/6 p-4 shadow-[0_70px_140px_-70px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
                                onMouseMove={(event) => {
                                    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
                                    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 16;
                                    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 16;
                                    setTilt({ x, y });
                                }}
                                onMouseLeave={() => setTilt({ x: 0, y: 0 })}
                                style={{
                                    transform: `perspective(1200px) rotateY(${tilt.x * 0.45}deg) rotateX(${-tilt.y * 0.45}deg)`,
                                }}
                            >
                                <div className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[#071622]">
                                    <div className="absolute inset-0 psi-grid opacity-35" />
                                    <div className="absolute left-8 top-6 h-28 w-28 rounded-full bg-[#18c8c8]/22 blur-3xl" />
                                    <div className="absolute right-4 top-16 h-32 w-32 rounded-full bg-[#ef7d2a]/20 blur-3xl" />
                                    <div className="absolute bottom-2 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-[#2b68ff]/14 blur-3xl" />

                                    <div className="relative z-10 border-b border-white/8 px-6 py-5">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                                                    <MapIcon className="h-5 w-5 text-[#9ef2f2]" />
                                                </div>
                                                <div>
                                                    <div className="text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#8ed7d9]">Live Map Stage</div>
                                                    <div className="mt-1 text-lg font-extrabold text-white">Cinematic intelligence canvas</div>
                                                </div>
                                            </div>
                                            <div className="rounded-full border border-[#18c8c8]/24 bg-[#18c8c8]/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#9ef2f2]">
                                                Real-time + presentation ready
                                            </div>
                                        </div>
                                    </div>

                                    <div className="relative h-[32rem] overflow-hidden p-6">
                                        <svg className="absolute inset-0 h-full w-full opacity-90" viewBox="0 0 620 520" fill="none">
                                            <path
                                                d="M76 368C130 328 159 260 238 236c60-18 89 24 137 24 59 0 93-60 157-94"
                                                stroke="rgba(255,255,255,0.26)"
                                                strokeWidth="2"
                                                strokeDasharray="8 10"
                                            />
                                            <path
                                                d="M78 365C143 327 178 294 244 262c59-28 101 6 148 4 51-2 84-46 140-87"
                                                stroke="url(#route-glow)"
                                                strokeWidth="5"
                                                strokeLinecap="round"
                                            />
                                            <defs>
                                                <linearGradient id="route-glow" x1="78" y1="365" x2="532" y2="179" gradientUnits="userSpaceOnUse">
                                                    <stop stopColor="#18c8c8" />
                                                    <stop offset="0.55" stopColor="#88e2ff" />
                                                    <stop offset="1" stopColor="#f7b34d" />
                                                </linearGradient>
                                            </defs>
                                        </svg>

                                        <div className="absolute left-6 top-6 space-y-3">
                                            <div className="rounded-2xl border border-white/10 bg-[#081520]/80 p-3 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)] backdrop-blur-xl">
                                                <div className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/48">Command Center</div>
                                                <div className="mt-3 space-y-2">
                                                    {[
                                                        { label: '3D', icon: Building2, active: true },
                                                        { label: 'Orbit', icon: PlayCircle, active: true },
                                                        { label: 'ROI', icon: TrendingUp, active: false },
                                                        { label: 'Lasso', icon: Layers, active: false },
                                                    ].map((item) => (
                                                        <div
                                                            key={item.label}
                                                            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-xs font-bold ${item.active ? 'bg-white/10 text-white' : 'bg-white/5 text-white/60'}`}
                                                        >
                                                            <item.icon className={`h-4 w-4 ${item.active ? 'text-[#9ef2f2]' : 'text-white/45'}`} />
                                                            {item.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute right-7 top-7 rounded-[26px] border border-white/10 bg-[#0d2030]/80 px-4 py-3 shadow-[0_28px_60px_-34px_rgba(0,0,0,0.75)] backdrop-blur-xl psi-float">
                                            <div className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-white/48">Live Metrics</div>
                                            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                {[
                                                    { label: 'ROI lift', value: '+12.4%' },
                                                    { label: 'Cultural radius', value: '<500m' },
                                                    { label: 'Walk score', value: '9.1/10' },
                                                ].map((item) => (
                                                    <div key={item.label} className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3">
                                                        <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/45">{item.label}</div>
                                                        <div className="mt-1 text-lg font-black text-white">{item.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="absolute left-[18%] top-[36%]">
                                            <div className="relative psi-ring flex h-5 w-5 items-center justify-center rounded-full bg-[#18c8c8]">
                                                <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                            </div>
                                            <div className="mt-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#073042] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)]">
                                                Saadiyat Cultural District
                                            </div>
                                        </div>

                                        <div className="absolute left-[44%] top-[47%] psi-float-slow">
                                            <div className="relative psi-ring flex h-5 w-5 items-center justify-center rounded-full bg-[#ffd76d]">
                                                <div className="h-2.5 w-2.5 rounded-full bg-[#06131d]" />
                                            </div>
                                            <div className="mt-3 rounded-full bg-[#f7b34d] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#06131d] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)]">
                                                Investment hotspot
                                            </div>
                                        </div>

                                        <div className="absolute right-[16%] top-[28%]">
                                            <div className="relative psi-ring flex h-5 w-5 items-center justify-center rounded-full bg-[#93b8ff]">
                                                <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                            </div>
                                            <div className="mt-3 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#17334a] shadow-[0_24px_60px_-34px_rgba(0,0,0,0.7)]">
                                                Yas & leisure corridor
                                            </div>
                                        </div>

                                        <div className="absolute bottom-8 left-7 max-w-[23rem] rounded-[30px] border border-white/10 bg-[#081520]/84 p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#9ef2f2]">Selected showcase</div>
                                                    <div className="mt-1 text-2xl font-black tracking-[-0.04em] text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                                        Bloom Living
                                                    </div>
                                                </div>
                                                <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">From</div>
                                                    <div className="text-lg font-black text-[#f7d27b]">AED 1.2M</div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {['Cinematic tour', 'Nearby intelligence', 'PDF brochure', 'AI guidance'].map((tag) => (
                                                    <span key={tag} className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mt-5 grid grid-cols-3 gap-3">
                                                <div className="rounded-2xl bg-white/6 p-3">
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">Type</div>
                                                    <div className="mt-1 text-sm font-bold text-white">Luxury villas</div>
                                                </div>
                                                <div className="rounded-2xl bg-white/6 p-3">
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">State</div>
                                                    <div className="mt-1 text-sm font-bold text-white">Live sync</div>
                                                </div>
                                                <div className="rounded-2xl bg-white/6 p-3">
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">Delivery</div>
                                                    <div className="mt-1 text-sm font-bold text-white">Web + native</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-16 right-8 max-w-[15rem] rounded-[28px] border border-[#18c8c8]/18 bg-[#0b2431]/84 p-4 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl psi-drift">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#18c8c8]/18">
                                                    <Sparkles className="h-5 w-5 text-[#9ef2f2]" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#9ef2f2]">AI insight</div>
                                                    <div className="text-sm font-bold text-white">Best positioned for lifestyle-led investors</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="absolute bottom-8 right-8 hidden w-[15rem] overflow-hidden rounded-[28px] border border-white/10 bg-[#081520]/88 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.82)] backdrop-blur-xl xl:block">
                                            <img
                                                src={appPreviewImage}
                                                alt="PSI Maps Pro product preview"
                                                className="h-48 w-full object-cover object-top"
                                            />
                                            <div className="border-t border-white/10 p-4">
                                                <div className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#9ef2f2]">Real product visual</div>
                                                <div className="mt-1 text-sm font-bold text-white">Bundled screenshot preview</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </RevealSection>
                    </div>
                </div>
            </section>

            <section id="workflow" className="relative px-6 py-24">
                <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(6,19,29,0.08),transparent)]" />
                <div className="mx-auto max-w-7xl">
                    <RevealSection>
                        <SectionHeader
                            eyebrow="Step By Step"
                            title="A presentation flow that walks the client from map to conviction."
                            description="This is no longer a generic feature dump. The page now guides the audience through a premium sequence: open the geography, reveal the advantage, explain the economics, and package the decision."
                        />
                    </RevealSection>

                    <div className="mt-14 grid gap-6 lg:grid-cols-4">
                        {workflowSteps.map((step, index) => (
                            <RevealSection key={step.step} delay={index * 120}>
                                <div className="group h-full rounded-[32px] border border-[#12263a]/10 bg-white/80 p-6 shadow-[0_35px_80px_-50px_rgba(6,19,29,0.45)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_40px_110px_-50px_rgba(6,19,29,0.55)]">
                                    <div className={`inline-flex rounded-full bg-gradient-to-r ${step.accent} px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white`}>
                                        Step {step.step}
                                    </div>
                                    <div className={`mt-5 flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br ${step.accent} text-white shadow-[0_30px_70px_-30px_rgba(6,19,29,0.4)]`}>
                                        <step.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#06131d]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {step.title}
                                    </h3>
                                    <p className="mt-3 text-base leading-7 text-[#4f6674]">{step.description}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            <section id="technology" className="relative overflow-hidden bg-[#0a1820] px-6 py-24 text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(24,200,200,0.14),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(247,179,77,0.12),transparent_28%),linear-gradient(135deg,#08151d_0%,#0d2030_50%,#08151d_100%)]" />
                <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#18c8c8]/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl">
                    <RevealSection>
                        <SectionHeader
                            eyebrow="Technology Used"
                            title="The software stack is part of the pitch, so it deserves the spotlight."
                            description="This section calls out the real technologies already in the repo and turns them into polished visual badges. It gives the product technical credibility without breaking the design language."
                        />
                    </RevealSection>

                    <div className="mt-14 grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
                        {techStack.map((item, index) => (
                            <RevealSection key={item.name} delay={index * 90}>
                                <div className={`h-full rounded-[30px] border border-white/10 bg-gradient-to-br ${item.tint} p-5 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.8)]`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <BrandLogo kind={item.kind} />
                                        <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/70">
                                            {item.version}
                                        </span>
                                    </div>
                                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {item.name}
                                    </h3>
                                    <p className="mt-3 text-sm leading-7 text-white/72">{item.description}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>

                    <RevealSection className="mt-10">
                        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                            <div className="text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#8ed7d9]">Supporting Toolchain</div>
                            <div className="mt-5 flex flex-wrap gap-3">
                                {toolChips.map((tool) => (
                                    <span
                                        key={tool}
                                        className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/70"
                                    >
                                        {tool}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section>

            <section className="px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <RevealSection>
                        <SectionHeader
                            eyebrow="Visual Proof"
                            title="The presentation now includes real bundled visuals that load with the app."
                            description="I switched the page to use imported local assets instead of fragile path assumptions, and added real PSI Maps visuals so the presentation feels grounded in the product."
                        />
                    </RevealSection>

                    <div className="mt-14 grid gap-6 lg:grid-cols-3">
                        {visualGallery.map((item, index) => (
                            <RevealSection key={item.title} delay={index * 100}>
                                <div className="overflow-hidden rounded-[32px] border border-[#12263a]/10 bg-white shadow-[0_35px_90px_-55px_rgba(6,19,29,0.45)]">
                                    <div className="aspect-[4/3] overflow-hidden bg-[#e8e0d2]">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-2xl font-black tracking-[-0.04em] text-[#06131d]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                            {item.title}
                                        </h3>
                                        <p className="mt-3 text-base leading-7 text-[#486171]">{item.caption}</p>
                                    </div>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            <section id="feature-atlas" className="px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <RevealSection>
                        <SectionHeader
                            eyebrow="Feature Atlas"
                            title="Every major feature is now framed like a capability system, not a checklist."
                            description="The landing page covers the full platform in grouped modules so the audience sees depth, not clutter. Each card ties together what the product does, why it matters, and how it raises the perceived quality of the map."
                        />
                    </RevealSection>

                    <div className="mt-14 grid gap-6 xl:grid-cols-2">
                        {featureGroups.map((group, index) => (
                            <RevealSection key={group.title} delay={index * 80}>
                                <div className="h-full rounded-[34px] border border-[#12263a]/10 bg-white/82 p-7 shadow-[0_35px_80px_-50px_rgba(6,19,29,0.42)] backdrop-blur-xl">
                                    <div className="flex flex-wrap items-start justify-between gap-5">
                                        <div>
                                            <div className={`inline-flex rounded-full bg-gradient-to-r ${group.accent} px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.24em] text-white`}>
                                                {group.eyebrow}
                                            </div>
                                            <h3 className="mt-5 max-w-xl text-3xl font-black tracking-[-0.04em] text-[#06131d]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                                {group.title}
                                            </h3>
                                        </div>
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] bg-gradient-to-br ${group.accent} text-white shadow-[0_30px_80px_-34px_rgba(6,19,29,0.35)]`}>
                                            <group.icon className="h-6 w-6" />
                                        </div>
                                    </div>

                                    <div className="mt-7 grid gap-3">
                                        {group.bullets.map((bullet) => (
                                            <div key={bullet} className="flex items-start gap-3 rounded-[22px] border border-[#12263a]/8 bg-[#f8f6f0] px-4 py-4">
                                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#0f8ab3]" />
                                                <p className="text-sm leading-7 text-[#415868]">{bullet}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 py-24">
                <div className="mx-auto max-w-7xl">
                    <RevealSection>
                        <SectionHeader
                            eyebrow="Platform Proof"
                            title="The presentation now signals that this is a serious operating product, not a prototype."
                            description="These proof cards make the underlying product depth visible at a glance and support the premium narrative with real codebase scale."
                        />
                    </RevealSection>

                    <div className="mt-14 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
                        {proofPoints.map((point, index) => (
                            <RevealSection key={point.title} delay={index * 100}>
                                <div className="h-full rounded-[30px] border border-[#12263a]/10 bg-white p-6 shadow-[0_35px_80px_-52px_rgba(6,19,29,0.44)]">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#081520] text-[#9ef2f2] shadow-[0_30px_80px_-42px_rgba(6,19,29,0.8)]">
                                        <point.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em] text-[#06131d]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        {point.title}
                                    </h3>
                                    <p className="mt-3 text-base leading-7 text-[#456070]">{point.body}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-6 pb-24">
                <div className="mx-auto max-w-7xl">
                    <RevealSection>
                        <div className="relative overflow-hidden rounded-[40px] bg-[#06131d] px-8 py-10 text-white shadow-[0_45px_120px_-60px_rgba(6,19,29,0.8)] sm:px-12 sm:py-14">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(24,200,200,0.18),transparent_30%),radial-gradient(circle_at_100%_20%,rgba(247,179,77,0.16),transparent_25%),linear-gradient(135deg,#06131d_0%,#0a1f2d_45%,#112838_100%)]" />
                            <div className="absolute bottom-[-5rem] right-[-4rem] h-64 w-64 rounded-full bg-[#18c8c8]/10 blur-3xl" />
                            <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-[#18c8c8]/28 bg-[#18c8c8]/10 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.28em] text-[#9ef2f2]">
                                        <Star className="h-3.5 w-3.5" />
                                        World-Class Close
                                    </div>
                                    <h2 className="mt-6 max-w-2xl text-4xl font-black tracking-[-0.05em] sm:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                        The page now sells the product on content, visuals, and credibility.
                                    </h2>
                                    <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
                                        Instead of a generic SaaS landing page, this version positions PSI Maps Pro as a premium spatial
                                        intelligence platform for investors, sales teams, and launches. The story is clearer, the map looks
                                        stronger, and the software stack is finally visible as part of the brand.
                                    </p>
                                </div>

                                <div className="grid gap-4">
                                    {finalOutcomes.map((item) => (
                                        <div key={item} className="flex items-start gap-4 rounded-[26px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                                                <CheckCircle className="h-5 w-5 text-[#9ef2f2]" />
                                            </div>
                                            <p className="text-base leading-7 text-white/78">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section>
        </div>
    );
};

export default PresentationShowcase;
