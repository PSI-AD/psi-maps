import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { Search, ArrowRight, X } from 'lucide-react';

interface SearchBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    alwaysOpen?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ projects, onSelectProject, alwaysOpen }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Project[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isMobileExpanded, setIsMobileExpanded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Close on outside click (only when not alwaysOpen)
    React.useEffect(() => {
        if (alwaysOpen) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsMobileExpanded(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        if (value.length > 1) {
            const filtered = projects.filter(p =>
                p.name?.toLowerCase().includes(value.toLowerCase()) ||
                p.city?.toLowerCase().includes(value.toLowerCase()) ||
                p.developerName?.toLowerCase().includes(value.toLowerCase()) ||
                p.community?.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8);
            setSuggestions(filtered);
            setIsOpen(true);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (project: Project) => {
        setSearchTerm('');
        setIsOpen(false);
        setIsMobileExpanded(false);
        onSelectProject(project);
    };

    const handleClear = () => {
        setSearchTerm('');
        setSuggestions([]);
        setIsOpen(false);
        inputRef.current?.focus();
    };

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
                placeholder="Search property, community or city…"
                className="w-full h-12 bg-white/95 backdrop-blur-md border border-slate-200 rounded-full pl-11 pr-10 text-base md:text-sm font-medium text-slate-800 shadow-md outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
            />
            {searchTerm && (
                <button onClick={handleClear} className="absolute right-4 text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    );

    // Dropdown opens upward (bottom-full) for the dock search, downward (top-full) for modal
    const dropdown = isOpen && suggestions.length > 0 && (
        <div className={`absolute ${alwaysOpen ? 'top-full mt-2' : 'bottom-full mb-3'} left-0 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/60 overflow-hidden animate-in fade-in z-[2000]`}>
            <div className="py-1.5">
                {suggestions.map((project) => (
                    <button
                        key={project.id}
                        onClick={() => handleSelect(project)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors group border-b border-slate-50 last:border-0"
                    >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0 overflow-hidden shadow-sm">
                            <img src={project.thumbnailUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex flex-col overflow-hidden w-full text-left">
                            <span className="font-black text-sm text-slate-900 truncate leading-tight">{project.name}</span>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate mt-0.5">
                                {project.developerName || 'Exclusive Developer'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                {project.community}{project.city ? ` / ${project.city}` : ''}
                            </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all shrink-0 -translate-x-1 group-hover:translate-x-0 opacity-0 group-hover:opacity-100" />
                    </button>
                ))}
            </div>
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
