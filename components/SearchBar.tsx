import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { Search, ArrowRight, X, Building2, MapPin, User } from 'lucide-react';

interface SearchBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onSelectDeveloper?: (developerName: string) => void;
    onSelectLocation?: (locationName: string, type: 'city' | 'community') => void;
    alwaysOpen?: boolean;
}

interface LocationResult {
    name: string;
    type: 'city' | 'community';
    count: number;
}

interface DeveloperResult {
    name: string;
    count: number;
}

interface SearchResults {
    projects: Project[];
    developers: DeveloperResult[];
    locations: LocationResult[];
}

const EMPTY: SearchResults = { projects: [], developers: [], locations: [] };

// ── Clearbit logo engine with ui-avatars fallback ──────────────────────────
const DOMAIN_MAP: Record<string, string> = {
    'aldar': 'aldar.com',
    'damac': 'damacproperties.com',
    'emaar': 'emaar.com',
    'nakheel': 'nakheel.com',
    'mismak': 'mismak.ae',
    'burooj': 'burooj.ae',
    'tameer': 'tameer.net',
    'meraas': 'meraas.ae',
    'sobha': 'sobharealty.com',
    'imkan': 'imkan.ae',
    'bloom': 'bloombuild.ae',
    'deyaar': 'deyaar.com',
    'azizi': 'azizidevelopments.com',
    'omniyat': 'omniyat.com',
    'ellington': 'ellingtonproperties.com',
    'binghatti': 'binghatti.com',
    'majid': 'majidalfuttaim.com',
};

const getDeveloperLogo = (name: string): string => {
    if (!name) return '';
    const key = Object.keys(DOMAIN_MAP).find(k => name.toLowerCase().includes(k));
    return key
        ? `https://logo.clearbit.com/${DOMAIN_MAP[key]}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0f172a&color=ffffff&size=64&bold=true&rounded=true`;
};

const SearchBar: React.FC<SearchBarProps> = ({
    projects,
    onSelectProject,
    onSelectDeveloper,
    onSelectLocation,
    alwaysOpen,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResults>(EMPTY);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const close = () => { setIsOpen(false); setIsMobileExpanded(false); setSearchTerm(''); setResults(EMPTY); setIsExpanded(false); };

    // Close on outside click (only when not alwaysOpen)
    React.useEffect(() => {
        if (alwaysOpen) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false); setIsMobileExpanded(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [alwaysOpen]);

    React.useEffect(() => {
        if (isMobileExpanded || alwaysOpen) setTimeout(() => inputRef.current?.focus(), 80);
    }, [isMobileExpanded, alwaysOpen]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        setIsExpanded(false); // collapse on new search term
        if (value.length < 2) { setResults(EMPTY); setIsOpen(false); return; }

        const normalize = (s: string) => (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
        const q = normalize(value);

        const matchedProjects = projects
            .filter(p => normalize(p.name).includes(q))
            .slice(0, 5);

        // Count projects per developer
        const devCounts: Record<string, number> = {};
        projects.forEach(p => { if (p.developerName) devCounts[p.developerName] = (devCounts[p.developerName] || 0) + 1; });
        const matchedDevelopers: DeveloperResult[] = Object.entries(devCounts)
            .filter(([dev]) => normalize(dev).includes(q))
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        // Count projects per city / community
        const locCounts: Record<string, { type: 'city' | 'community'; count: number }> = {};
        projects.forEach(p => {
            if (p.city) { if (!locCounts[p.city]) locCounts[p.city] = { type: 'city', count: 0 }; locCounts[p.city].count++; }
            if (p.community) { if (!locCounts[p.community]) locCounts[p.community] = { type: 'community', count: 0 }; locCounts[p.community].count++; }
        });
        const matchedLocations: LocationResult[] = Object.entries(locCounts)
            .filter(([name]) => normalize(name).includes(q))
            .map(([name, data]) => ({ name, type: data.type, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 4);

        const next = { projects: matchedProjects, developers: matchedDevelopers, locations: matchedLocations };
        setResults(next);
        setIsOpen(next.projects.length > 0 || next.developers.length > 0 || next.locations.length > 0);
    };

    const handleSelectProject = (project: Project) => { close(); onSelectProject(project); };
    const handleSelectDeveloper = (dev: string) => { close(); onSelectDeveloper?.(dev); };
    const handleSelectLocation = (loc: LocationResult) => { close(); onSelectLocation?.(loc.name, loc.type); };
    const handleClear = () => { setSearchTerm(''); setResults(EMPTY); setIsOpen(false); inputRef.current?.focus(); };

    const hasResults = results.projects.length > 0 || results.developers.length > 0 || results.locations.length > 0;
    const totalResultCount = results.projects.length + results.developers.length + results.locations.length;
    const LIMIT = 6;

    // Build a flat ordered list of items [type, payload] so we can slice across categories
    type FlatItem =
        | { kind: 'project'; payload: Project }
        | { kind: 'developer'; payload: DeveloperResult }
        | { kind: 'location'; payload: LocationResult };

    const flatItems: FlatItem[] = [
        ...results.projects.map(p => ({ kind: 'project' as const, payload: p })),
        ...results.developers.map(d => ({ kind: 'developer' as const, payload: d })),
        ...results.locations.map(l => ({ kind: 'location' as const, payload: l })),
    ];
    const visibleItems = isExpanded ? flatItems : flatItems.slice(0, LIMIT);
    const visibleProjects = visibleItems.filter(i => i.kind === 'project').map(i => i.payload as Project);
    const visibleDevelopers = visibleItems.filter(i => i.kind === 'developer').map(i => i.payload as DeveloperResult);
    const visibleLocations = visibleItems.filter(i => i.kind === 'location').map(i => i.payload as LocationResult);

    const dropdown = isOpen && hasResults && (
        <div className={`absolute ${alwaysOpen ? 'top-full mt-2' : 'bottom-full mb-3'} left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden animate-in fade-in z-[2000]`}>

            {/* ── Projects ── */}
            {visibleProjects.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Projects</span>
                    </div>
                    {visibleProjects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => handleSelectProject(project)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0 overflow-hidden shadow-sm">
                                <img src={project.thumbnailUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="font-black text-sm text-slate-900 truncate leading-tight">{project.name}</span>
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate mt-0.5">
                                    {project.developerName || 'Exclusive Developer'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                    {project.community}{project.city ? ` / ${project.city}` : ''}
                                </span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 -translate-x-1 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── Developers ── */}
            {visibleDevelopers.length > 0 && (
                <div className="border-t border-slate-50">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <User className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Developers</span>
                    </div>
                    {visibleDevelopers.map(dev => (
                        <button
                            key={dev.name}
                            onClick={() => handleSelectDeveloper(dev.name)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <img
                                src={getDeveloperLogo(dev.name)}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover shadow-sm bg-slate-100 shrink-0"
                                onError={(e) => {
                                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.name)}&background=0f172a&color=ffffff&size=64&bold=true&rounded=true`;
                                }}
                            />
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="font-bold text-sm text-slate-800 truncate">{dev.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest">Developer · <span className="text-emerald-500 font-black">{dev.count}</span> projects</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── Locations ── */}
            {visibleLocations.length > 0 && (
                <div className="border-t border-slate-50">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Communities &amp; Cities</span>
                    </div>
                    {visibleLocations.map(loc => (
                        <button
                            key={`${loc.type}-${loc.name}`}
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-8 h-8 rounded-full bg-rose-50 shrink-0 flex items-center justify-center">
                                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            </div>
                            <div className="flex flex-col overflow-hidden flex-1">
                                <span className="font-bold text-sm text-slate-800 truncate">{loc.name}</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-widest capitalize">{loc.type} · <span className="text-rose-500 font-black">{loc.count}</span> properties</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── View More button ── */}
            {!isExpanded && totalResultCount > LIMIT && (
                <button
                    onClick={(e) => { e.preventDefault(); setIsExpanded(true); }}
                    className="w-full text-center py-2.5 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 hover:bg-blue-100 transition-colors border-t border-blue-100"
                >
                    View {totalResultCount - LIMIT} More Results ↓
                </button>
            )}

            {/* Footer count */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {visibleItems.length}{isExpanded ? '' : totalResultCount > LIMIT ? ` of ${totalResultCount}` : ''} result{visibleItems.length !== 1 ? 's' : ''} shown
                </p>
            </div>
        </div>
    );

    const inputEl = (
        <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400 pointer-events-none">
                <Search className="w-4 h-4" />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                onFocus={() => searchTerm.length > 1 && setIsOpen(true)}
                placeholder="Search property, developer or community…"
                className="w-full h-12 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full pl-11 pr-10 text-base md:text-sm font-medium text-slate-800 shadow-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
                <button onClick={handleClear} className="absolute right-4 text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    return (
        <div className="relative w-full" ref={containerRef}>
            {alwaysOpen ? (
                <div className="relative w-full">
                    {inputEl}
                    {dropdown}
                </div>
            ) : (
                <>
                    {/* Desktop — always visible */}
                    <div className="hidden md:block relative w-full">
                        {inputEl}
                        {dropdown}
                    </div>
                    {/* Mobile — collapses to icon button */}
                    <div className="md:hidden">
                        {!isMobileExpanded ? (
                            <button
                                onClick={() => setIsMobileExpanded(true)}
                                className="w-11 h-11 flex items-center justify-center bg-white border border-slate-200 rounded-full shadow-md text-slate-500 hover:text-blue-600 hover:border-blue-300 transition-all"
                                title="Search properties"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                        ) : (
                            <div className="relative w-72 animate-in fade-in slide-in-from-right-4 duration-200">
                                {inputEl}
                                {dropdown}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default SearchBar;
