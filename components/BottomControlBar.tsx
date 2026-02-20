import React, { useMemo, useState } from 'react';
import SearchBar from './SearchBar';
import { Project } from '../types';
import { Settings, Filter as FilterIcon, Navigation, Check, X, Pencil, Search } from 'lucide-react';

interface BottomControlBarProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onAdminClick: () => void;
    onFlyTo: (lng: number, lat: number, zoom?: number) => void;
    onToggleNearby: () => void;
    onToggleFilters: () => void;
    propertyType: string;
    setPropertyType: (type: string) => void;
    developerFilter: string;
    setDeveloperFilter: (dev: string) => void;
    statusFilter: string;
    setStatusFilter: (stat: string) => void;
    selectedCity: string;
    setSelectedCity: (city: string) => void;
    selectedCommunity: string;
    setSelectedCommunity: (comm: string) => void;
    handleFitBounds: (projects: Project[]) => void;
    isDrawing: boolean;
    onToggleDraw: () => void;
    handleLocationSelect: (locationType: 'city' | 'community', locationName: string, projectsInLocation: Project[]) => void;
}

const uaeEmirates = ['abu dhabi', 'dubai', 'sharjah', 'ajman', 'umm al quwain', 'ras al khaimah', 'fujairah'];

const BottomControlBar: React.FC<BottomControlBarProps> = ({
    projects,
    onSelectProject,
    onAdminClick,
    onFlyTo,
    onToggleNearby,
    onToggleFilters,
    propertyType,
    setPropertyType,
    developerFilter,
    setDeveloperFilter,
    statusFilter,
    setStatusFilter,
    selectedCity,
    setSelectedCity,
    selectedCommunity,
    setSelectedCommunity,
    handleFitBounds,
    isDrawing,
    onToggleDraw,
    handleLocationSelect
}) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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

    // Dynamic Developer calculation
    const developerOptions = useMemo(() => {
        const stats = projects.reduce((acc, p) => {
            const dev = p.developerName;
            if (dev && dev !== 'Unknown Developer') {
                acc[dev] = (acc[dev] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const entries = Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => b.count - a.count);

        return [
            { name: 'All', count: projects.length },
            ...entries
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

    const availableCommunities = useMemo(() => {
        if (!selectedCity) return [];
        const inCity = projects.filter(p => p.city === selectedCity && p.community);
        const counts = inCity.reduce((acc, p) => {
            if (p.community) {
                acc[p.community] = (acc[p.community] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
    }, [projects, selectedCity]);

    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCity(val);
        setSelectedCommunity('');
        if (handleLocationSelect) {
            handleLocationSelect('city', val, projects.filter(p => p.city === val));
        }
    };

    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCommunity(val);
        if (handleLocationSelect) {
            handleLocationSelect('community', val, projects.filter(p => p.community === val));
        }
    };

    const isAnyFilterActive = propertyType !== 'All' || developerFilter !== 'All' || statusFilter !== 'All';

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

                {/* Middle Left: Search and Dropdowns (Hidden on Mobile) */}
                <div className="hidden md:flex items-center gap-2 flex-1 max-w-4xl justify-center">
                    <div className="flex-1 max-w-sm">
                        <SearchBar projects={projects} onSelectProject={onSelectProject} />
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            value={selectedCity}
                            onChange={handleCityChange}
                            className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-50/20 transition-all cursor-pointer min-w-[150px]"
                        >
                            <option value="">All Emirates</option>
                            {cityOptions.map(city => (
                                <option key={city.id} value={city.id}>{city.label}</option>
                            ))}
                        </select>

                        <select
                            value={selectedCommunity}
                            onChange={handleCommunityChange}
                            className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-50/20 transition-all cursor-pointer min-w-[170px] disabled:opacity-50"
                            disabled={!selectedCity}
                        >
                            <option value="">Select Community</option>
                            {availableCommunities.map(([name, count]) => (
                                <option key={name} value={name}>{name} ({count})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Right: Tools & Admin */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setIsMobileSearchOpen(true)}
                        className="md:hidden p-2.5 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                    >
                        <Search className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => setIsFilterModalOpen(true)}
                        className={`p-2.5 rounded-xl border transition-all group flex items-center gap-2 px-4 ${isAnyFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                        title="Filters"
                    >
                        <FilterIcon className={`w-5 h-5 ${isAnyFilterActive ? 'text-blue-600' : 'group-hover:text-blue-600'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">
                            Filters
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

            {/* Mobile Search Modal (Bottom Sheet Style) */}
            {isMobileSearchOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex items-end md:hidden">
                    <div className="bg-white w-full rounded-t-3xl p-6 space-y-6 animate-in slide-in-from-bottom-full duration-300 shadow-2xl pb-10">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Find Property</h3>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1">Select location and search</p>
                            </div>
                            <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="w-full">
                            <SearchBar
                                projects={projects}
                                onSelectProject={(p) => {
                                    onSelectProject(p);
                                    setIsMobileSearchOpen(false);
                                }}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Emirate</label>
                                <select
                                    value={selectedCity}
                                    onChange={handleCityChange}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm"
                                >
                                    <option value="">All Emirates</option>
                                    {cityOptions.map(city => (
                                        <option key={city.id} value={city.id}>{city.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Community</label>
                                <select
                                    value={selectedCommunity}
                                    onChange={handleCommunityChange}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                    disabled={!selectedCity}
                                >
                                    <option value="">Select Community</option>
                                    {availableCommunities.map(([name, count]) => (
                                        <option key={name} value={name}>{name} ({count})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all"
                        >
                            Discover Results
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Modal (Side Panel) */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0"
                        onClick={() => setIsFilterModalOpen(false)}
                    />
                    <div className="relative h-full w-full max-w-sm bg-white shadow-2xl p-8 overflow-y-auto animate-in slide-in-from-right duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Filters</h3>
                                <p className="text-slate-500 text-xs font-medium mt-1">Refine your search results</p>
                            </div>
                            <button
                                onClick={() => setIsFilterModalOpen(false)}
                                className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-full transition-all"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Spatial Tools */}
                        <div className="mb-10 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Spatial Tools</h4>
                            <button
                                onClick={() => {
                                    onToggleDraw();
                                    setIsFilterModalOpen(false);
                                }}
                                className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${isDrawing ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-700 border border-blue-200 hover:border-blue-400'}`}
                            >
                                <Pencil className="w-4 h-4" />
                                <span>{isDrawing ? 'Cancel Custom Area' : 'Draw Custom Area'}</span>
                            </button>
                        </div>

                        {/* Status Filter */}
                        <div className="mb-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Construction Status</h4>
                            <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                                {['All', 'Off-Plan', 'Completed'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === status ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Developer Filter */}
                        <div className="mb-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Preferred Developer</h4>
                            <select
                                value={developerFilter}
                                onChange={(e) => setDeveloperFilter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm"
                            >
                                <option value="All">All Developers</option>
                                {developerOptions.filter(d => d.name !== 'All').map(dev => (
                                    <option key={dev.name} value={dev.name}>{dev.name} ({dev.count})</option>
                                ))}
                            </select>
                        </div>

                        {/* Property Type Filter */}
                        <div className="mb-10">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Asset Type</h4>
                            <div className="space-y-2.5">
                                {propertyTypeOptions.map(option => (
                                    <button
                                        key={option.name}
                                        onClick={() => setPropertyType(option.name)}
                                        className={`
                                            w-full p-5 rounded-2xl border flex items-center justify-between transition-all font-bold text-sm
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
                        </div>

                        <div className="sticky bottom-0 pt-6 bg-white border-t border-slate-50">
                            <button
                                onClick={() => setIsFilterModalOpen(false)}
                                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                            >
                                Apply
                                <span>{projects.length} Results</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomControlBar;
