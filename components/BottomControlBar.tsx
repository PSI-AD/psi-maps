import React, { useMemo } from 'react';
import SearchBar from './SearchBar';
import { Project } from '../types';
import { Settings, Filter, Navigation } from 'lucide-react';

interface BottomControlBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onAdminClick: () => void;
    onFlyTo: (lat: number, lng: number) => void;
    onToggleNearby: () => void;
    onToggleFilters: () => void;
}

const BottomControlBar: React.FC<BottomControlBarProps> = ({
    projects,
    onSelectProject,
    onAdminClick,
    onFlyTo,
    onToggleNearby,
    onToggleFilters
}) => {
    const cities = useMemo(() => {
        const unique = Array.from(new Set(projects.map(p => p.city).filter(Boolean)));
        return unique.sort();
    }, [projects]);

    const communities = useMemo(() => {
        const unique = Array.from(new Set(projects.map(p => p.community).filter(Boolean)));
        return unique.sort();
    }, [projects]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        if (!city) return;
        const cityProjects = projects.filter(p => p.city === city);
        if (cityProjects.length > 0) {
            const avgLat = cityProjects.reduce((sum, p) => sum + p.latitude, 0) / cityProjects.length;
            const avgLng = cityProjects.reduce((sum, p) => sum + p.longitude, 0) / cityProjects.length;
            onFlyTo(avgLat, avgLng);
        }
    };

    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const community = e.target.value;
        if (!community) return;
        const commProjects = projects.filter(p => p.community === community);
        if (commProjects.length > 0) {
            const avgLat = commProjects.reduce((sum, p) => sum + p.latitude, 0) / commProjects.length;
            const avgLng = commProjects.reduce((sum, p) => sum + p.longitude, 0) / commProjects.length;
            onFlyTo(avgLat, avgLng);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-[6000] px-4 py-3 flex items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            {/* Left: Branding */}
            <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="2.5" />
                        <text x="50" y="58" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" textAnchor="middle" style={{ letterSpacing: '-1px' }}>
                            PSI
                        </text>
                    </svg>
                </div>
                <div className="hidden lg:flex flex-col justify-center">
                    <span className="text-sm font-black text-slate-900 tracking-tighter uppercase leading-none block">PSI Maps</span>
                    <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-0.5">Premier</span>
                </div>
            </div>

            {/* Middle Left: Search */}
            <div className="flex-1 max-w-sm">
                <SearchBar projects={projects} onSelectProject={onSelectProject} />
            </div>

            {/* Middle Right: Dropdowns */}
            <div className="hidden md:flex items-center gap-3 flex-1 justify-center">
                <select
                    onChange={handleCityChange}
                    className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[140px]"
                >
                    <option value="">Select City</option>
                    {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                    ))}
                </select>

                <select
                    onChange={handleCommunityChange}
                    className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[160px]"
                >
                    <option value="">Select Community</option>
                    {communities.map(comm => (
                        <option key={comm} value={comm}>{comm}</option>
                    ))}
                </select>
            </div>

            {/* Right: Tools & Admin */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onToggleFilters}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-all group"
                    title="Filters"
                >
                    <Filter className="w-5 h-5 group-hover:text-blue-600" />
                </button>
                <button
                    onClick={onToggleNearby}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 px-4"
                >
                    <Navigation className="w-5 h-5 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Nearby</span>
                </button>
                <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>
                <button
                    onClick={onAdminClick}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 transition-all"
                    title="Admin CMS"
                >
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default BottomControlBar;
