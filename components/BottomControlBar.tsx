import React, { useMemo, useState } from 'react';
import SearchBar from './SearchBar';
import { Project } from '../types';
import { Settings, Filter as FilterIcon, Navigation, Check, X } from 'lucide-react';

interface BottomControlBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onAdminClick: () => void;
    onFlyTo: (lng: number, lat: number, zoom?: number) => void;
    onToggleNearby: () => void;
    onToggleFilters: () => void;
    propertyType: string;
    setPropertyType: (type: string) => void;
}

const uaeEmirates = ['abu dhabi', 'dubai', 'sharjah', 'ajman', 'umm al quwain', 'ras al khaimah', 'fujairah'];

const UAE_CENTERS: Record<string, { lng: number, lat: number, zoom: number }> = {
    'abu dhabi': { lng: 54.4000, lat: 24.4539, zoom: 10.5 },
    'dubai': { lng: 55.2708, lat: 25.2048, zoom: 10.5 },
    'sharjah': { lng: 55.4033, lat: 25.3463, zoom: 11 },
    'ras al khaimah': { lng: 55.9432, lat: 25.7895, zoom: 11 },
    'ajman': { lng: 55.4402, lat: 25.4052, zoom: 12 },
    'fujairah': { lng: 56.3265, lat: 25.1288, zoom: 12 },
    'umm al quwain': { lng: 55.5753, lat: 25.5647, zoom: 12 }
};

const BottomControlBar: React.FC<BottomControlBarProps> = ({
    projects,
    onSelectProject,
    onAdminClick,
    onFlyTo,
    onToggleNearby,
    onToggleFilters,
    propertyType,
    setPropertyType
}) => {
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

    // Dynamic Property Type calculation
    const propertyTypeOptions = useMemo(() => {
        const stats = projects.reduce((acc, p) => {
            const type = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1).toLowerCase() : 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const types = Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => (b.count as number) - (a.count as number));

        return [
            { name: 'All', count: projects.length },
            ...types
        ];
    }, [projects]);

    // Helper to generate sorted options with counts for Cities
    const cityOptions = useMemo(() => {
        const stats = projects.reduce((acc, p) => {
            const city = p.city?.toLowerCase();
            if (city && uaeEmirates.includes(city)) {
                acc[city] = (acc[city] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([id, count]) => ({
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                count: count as number,
                label: `${id.charAt(0).toUpperCase() + id.slice(1)} (${count})`
            }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [projects]);

    // Helper to generate sorted options with counts for Communities
    const communityOptions = useMemo(() => {
        if (!selectedCity) return [];
        const filtered = projects.filter(p => p.city?.toLowerCase() === selectedCity.toLowerCase());
        const stats = filtered.reduce((acc, p) => {
            const community = p.community;
            if (community) {
                acc[community] = (acc[community] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => ({
                name,
                count: count as number,
                label: `${name} (${count})`
            }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [projects, selectedCity]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const city = e.target.value;
        setSelectedCity(city);
        if (!city) return;

        // Use hardcoded coordinates for UAE cities
        const center = UAE_CENTERS[city.toLowerCase()];
        if (center) {
            onFlyTo(center.lng, center.lat, center.zoom);
        }
    };

    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const community = e.target.value;
        if (!community) return;

        const commProjects = projects.filter(p => p.community === community);
        if (commProjects.length > 0) {
            // Use mathematical averages but zoom to 13.5
            const avgLat = commProjects.reduce((sum: number, p) => sum + Number(p.latitude), 0) / commProjects.length;
            const avgLng = commProjects.reduce((sum: number, p) => sum + Number(p.longitude), 0) / commProjects.length;
            onFlyTo(avgLng, avgLat, 13.5);
        }
    };

    return (
        <>
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
                        value={selectedCity}
                        onChange={handleCityChange}
                        className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[150px]"
                    >
                        <option value="">All Emirates</option>
                        {cityOptions.map(city => (
                            <option key={city.id} value={city.id}>{city.label}</option>
                        ))}
                    </select>

                    <select
                        onChange={handleCommunityChange}
                        className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer min-w-[170px] disabled:opacity-50"
                        disabled={!selectedCity}
                    >
                        <option value="">Select Community</option>
                        {communityOptions.map(comm => (
                            <option key={comm.name} value={comm.name}>{comm.label}</option>
                        ))}
                    </select>
                </div>

                {/* Right: Tools & Admin */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`p-2.5 rounded-xl border transition-all group flex items-center gap-2 px-4 ${propertyType !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        title="Filters"
                    >
                        <FilterIcon className={`w-5 h-5 ${propertyType !== 'All' ? 'text-blue-600' : 'group-hover:text-blue-600'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">
                            {propertyType === 'All' ? 'Filters' : propertyType}
                        </span>
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

            {/* Filter Modal */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsFilterModalOpen(false)}
                    />
                    <div className="relative bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Property Filters</h3>
                                <p className="text-slate-500 text-xs font-medium mt-1">Refine your search by asset type</p>
                            </div>
                            <button
                                onClick={() => setIsFilterModalOpen(false)}
                                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2">
                            {propertyTypeOptions.map(option => (
                                <button
                                    key={option.name}
                                    onClick={() => {
                                        setPropertyType(option.name);
                                        setIsFilterModalOpen(false);
                                    }}
                                    className={`
                                        w-full p-4 rounded-2xl border flex items-center justify-between transition-all font-bold text-sm
                                        ${propertyType === option.name
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-200'
                                            : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-white hover:border-blue-200'}
                                    `}
                                >
                                    <span>{option.name} ({option.count})</span>
                                    {propertyType === option.name && <Check className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsFilterModalOpen(false)}
                            className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomControlBar;
