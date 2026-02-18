import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { Search, MapPin, Building, ArrowRight } from 'lucide-react';

interface SearchBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ projects, onSelectProject }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Project[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);

        if (value.length > 1) {
            const filtered = projects.filter(p =>
                p.name?.toLowerCase().includes(value.toLowerCase()) ||
                p.city?.toLowerCase().includes(value.toLowerCase()) ||
                p.community?.toLowerCase().includes(value.toLowerCase())
            ).slice(0, 8); // Limit suggestions
            setSuggestions(filtered);
            setIsOpen(true);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    };

    const handleSelect = (project: Project) => {
        setSearchTerm(project.name);
        setIsOpen(false);
        onSelectProject(project);
        setSearchTerm(''); // Clear after selection or keep? Usually clear for map apps.
    };

    return (
        <div className="relative w-full max-w-md" ref={containerRef}>
            <div className="relative flex items-center">
                <div className="absolute left-4 text-slate-400">
                    <Search className="w-5 h-5" />
                </div>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    onFocus={() => searchTerm.length > 1 && setIsOpen(true)}
                    placeholder="Search Property, Community, or City..."
                    className="w-full h-12 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full pl-12 pr-4 text-sm font-medium text-slate-800 shadow-lg shadow-slate-200/50 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                />
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-[2000]">
                    <div className="py-2">
                        {suggestions.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => handleSelect(project)}
                                className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors group border-b border-slate-50 last:border-0"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                                        <img src={project.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-bold text-slate-900 text-sm truncate">{project.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-medium flex items-center truncate">
                                            <MapPin className="w-3 h-3 mr-1 inline" />
                                            {project.community || project.city}
                                        </p>
                                    </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;
