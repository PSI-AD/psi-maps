import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { Search, ArrowRight, X, Building2, MapPin, User } from 'lucide-react';

interface SearchBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onQuickFilter?: (type: 'community' | 'developer', value: string) => void;
    alwaysOpen?: boolean;
}

interface SearchResults {
    projects: Project[];
    developers: string[];
    locations: string[];
}

const EMPTY: SearchResults = { projects: [], developers: [], locations: [] };

const SearchBar: React.FC<SearchBarProps> = ({ projects, onSelectProject, onQuickFilter, alwaysOpen }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResults>(EMPTY);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click (only when not alwaysOpen)
    React.useEffect(() => {
        if (alwaysOpen) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsMobileExpanded(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [alwaysOpen]);

    // Auto-focus when mobile expands or alwaysOpen mounts
    React.useEffect(() => {
        if (isMobileExpanded || alwaysOpen) {
            setTimeout(() => inputRef.current?.focus(), 80);
        }
    }, [isMobileExpanded, alwaysOpen]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.length < 2) { setResults(EMPTY); setIsOpen(false); return; }

        const q = value.toLowerCase();

        const matchedProjects = projects
            .filter(p => p.name?.toLowerCase().includes(q))
            .slice(0, 5);

        const uniqueDevelopers = Array.from(new Set(projects.map(p => p.developerName).filter(Boolean))) as string[];
        const matchedDevelopers = uniqueDevelopers.filter(d => d.toLowerCase().includes(q)).slice(0, 3);

        const uniqueLocations = Array.from(new Set([
            ...projects.map(p => p.community),
            ...projects.map(p => p.city),
        ].filter(Boolean))) as string[];
        const matchedLocations = uniqueLocations.filter(l => l.toLowerCase().includes(q)).slice(0, 3);

        const next = { projects: matchedProjects, developers: matchedDevelopers, locations: matchedLocations };
        setResults(next);
        setIsOpen(next.projects.length > 0 || next.developers.length > 0 || next.locations.length > 0);
    };

    const handleSelectProject = (project: Project) => {
        setSearchTerm(''); setResults(EMPTY); setIsOpen(false); setIsMobileExpanded(false);
        onSelectProject(project);
    };

    const handleSelectDeveloper = (dev: string) => {
        setSearchTerm(''); setResults(EMPTY); setIsOpen(false); setIsMobileExpanded(false);
        onQuickFilter?.('developer', dev);
    };

    const handleSelectLocation = (loc: string) => {
        setSearchTerm(''); setResults(EMPTY); setIsOpen(false); setIsMobileExpanded(false);
        onQuickFilter?.('community', loc);
    };

    const handleClear = () => {
        setSearchTerm(''); setResults(EMPTY); setIsOpen(false);
        inputRef.current?.focus();
    };

    const hasResults = results.projects.length > 0 || results.developers.length > 0 || results.locations.length > 0;

    const dropdown = isOpen && hasResults && (
        <div className={`absolute ${alwaysOpen ? 'top-full mt-2' : 'bottom-full mb-3'} left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden animate-in fade-in z-[2000]`}>

            {/* ── Projects ── */}
            {results.projects.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <Building2 className="w-3 h-3 text-blue-500" />
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">Projects</span>
                    </div>
                    {results.projects.map(project => (
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
            {results.developers.length > 0 && (
                <div className="border-t border-slate-50">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <User className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em]">Developers</span>
                    </div>
                    {results.developers.map(dev => (
                        <button
                            key={dev}
                            onClick={() => handleSelectDeveloper(dev)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 shrink-0 flex items-center justify-center">
                                <User className="w-4 h-4 text-emerald-500" />
                            </div>
                            <span className="font-bold text-sm text-slate-800 flex-1 truncate">{dev}</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            {/* ── Locations ── */}
            {results.locations.length > 0 && (
                <div className="border-t border-slate-50">
                    <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Communities &amp; Cities</span>
                    </div>
                    {results.locations.map(loc => (
                        <button
                            key={loc}
                            onClick={() => handleSelectLocation(loc)}
                            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                        >
                            <div className="w-9 h-9 rounded-xl bg-rose-50 shrink-0 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-rose-500" />
                            </div>
                            <span className="font-bold text-sm text-slate-800 flex-1 truncate">{loc}</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-rose-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                </div>
            )}

            {/* Footer count */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {results.projects.length + results.developers.length + results.locations.length} result{results.projects.length + results.developers.length + results.locations.length !== 1 ? 's' : ''} found
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
