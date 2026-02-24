import React, { useMemo, useState } from 'react';
import SearchBar from './SearchBar';
import { Project, Landmark } from '../types';
import { Settings, Filter as FilterIcon, Navigation, X, Pencil, Search, Map } from 'lucide-react';

interface BottomControlBarProps {
    projects: Project[];          // full live database — used for building option menus
    filteredProjects: Project[];  // currently filtered — used for count badges
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
    mapFeatures: { show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean };
    setMapFeatures: React.Dispatch<React.SetStateAction<{ show3D: boolean; showAnalytics: boolean; showCommunityBorders: boolean }>>;
    onGlobalReset: () => void;
    filteredCount: number;
    landmarks?: Landmark[];
    onSelectLandmark?: (landmark: Landmark) => void;
}

const uaeEmirates = ['abu dhabi', 'dubai', 'sharjah', 'ajman', 'umm al quwain', 'ras al khaimah', 'fujairah'];

const BottomControlBar: React.FC<BottomControlBarProps> = ({
    projects,
    filteredProjects,
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
    handleLocationSelect,
    mapFeatures,
    setMapFeatures,
    onGlobalReset,
    filteredCount,
    landmarks = [],
    onSelectLandmark,
}) => {
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const propertyTypeOptions = useMemo(() => {
        // Count from filteredProjects so badges reflect current filter context
        const stats = filteredProjects.reduce((acc, p) => {
            const type = p.type ? p.type.charAt(0).toUpperCase() + p.type.slice(1).toLowerCase() : 'Unknown';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const types = Object.entries(stats)
            .filter(([_, count]) => (count as number) > 0)
            .map(([name, count]) => ({ name, count: count as number }))
            .sort((a, b) => (b.count as number) - (a.count as number));
        return [{ name: 'All', count: filteredCount }, ...types];
    }, [filteredProjects, filteredCount]);

    const developerOptions = useMemo(() => {
        // Count from filteredProjects; enumerate names from all projects
        const filteredCounts = filteredProjects.reduce((acc, p) => {
            if (p.developerName && p.developerName !== 'Unknown Developer') {
                acc[p.developerName] = (acc[p.developerName] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);
        // Build list from full projects so all developers remain available to select
        const allDevs = Array.from(new Set(projects.map(p => p.developerName).filter(Boolean))) as string[];
        const entries = allDevs
            .filter(name => name !== 'Unknown Developer')
            .map(name => ({ name, count: filteredCounts[name] || 0 }))
            .filter(d => d.count > 0 || developerFilter === d.name)
            .sort((a, b) => b.count - a.count);
        return [{ name: 'All', count: filteredCount }, ...entries];
    }, [filteredProjects, projects, filteredCount, developerFilter]);

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
        const safeCity = selectedCity.toLowerCase().trim();
        const inCity = projects.filter(p => p.city?.toLowerCase().trim() === safeCity && p.community);
        const counts = inCity.reduce((acc, p) => {
            acc[p.community!] = (acc[p.community!] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        return Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
    }, [projects, selectedCity]);

    // ── Bulletproof city handler — mirrors developer filter simplicity ───────
    const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCity(val);
        setSelectedCommunity('');
        setDeveloperFilter('All');

        if (val) {
            const cityProjects = projects.filter(p => p.city?.toLowerCase() === val.toLowerCase());
            if (cityProjects.length > 0) handleFitBounds(cityProjects);
        } else {
            handleFitBounds(projects);
        }
    };

    // ── Community handler ───────────
    const handleCommunityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setSelectedCommunity(val);
        setDeveloperFilter('All');
        if (val) {
            const proj = projects.find(p => p.community === val);
            if (proj?.city) setSelectedCity(proj.city);
            handleFitBounds(projects.filter(p => p.community === val));
        } else {
            handleFitBounds(projects);
        }
    };

    const isAnyFilterActive = propertyType !== 'All' || developerFilter !== 'All' || statusFilter !== 'All';

    const selectCls = "w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-base md:text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer shadow-sm appearance-none";

    return (
        <>
            {/* ─────────────────── DESKTOP DOCK ─────────────────── */}
            <div className="hidden md:flex fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 z-[6000] px-4 py-3 items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {/* Brand / Reset */}
                <button
                    onClick={onGlobalReset}
                    title="Reset to UAE overview"
                    className="flex items-center gap-3 shrink-0 group"
                >
                    <div className="w-10 h-10 relative flex items-center justify-center shrink-0 transition-transform group-hover:scale-110">
                        <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" fill="#2563EB" stroke="#1D4ED8" strokeWidth="2.5" />
                            <text x="50" y="58" fill="#FFFFFF" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="28" textAnchor="middle" style={{ letterSpacing: '-1px' }}>PSI</text>
                        </svg>
                    </div>
                    <div className="hidden lg:flex flex-col justify-center">
                        <span className="text-sm font-black text-slate-900 tracking-tighter uppercase leading-none block">PSI Maps</span>
                        <span className="text-[9px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-0.5">Premier</span>
                    </div>
                </button>

                {/* Search + Dropdowns */}
                <div className="hidden md:flex items-center gap-2 flex-1 max-w-4xl justify-center">
                    <div className="flex-1 min-w-[250px] max-w-sm">
                        <SearchBar
                            projects={projects}
                            landmarks={landmarks}
                            onSelectProject={onSelectProject}
                            onSelectLandmark={onSelectLandmark}
                            onSelectDeveloper={(dev) => {
                                setDeveloperFilter(dev);
                                handleFitBounds(projects.filter(p => p.developerName === dev));
                            }}
                            onSelectLocation={(name, type) => {
                                if (type === 'city') {
                                    setSelectedCity(name.toLowerCase());
                                    setSelectedCommunity('');
                                    setDeveloperFilter('All');
                                    handleFitBounds(projects.filter(p => p.city?.toLowerCase() === name.toLowerCase()));
                                } else if (type === 'community') {
                                    setSelectedCommunity(name);
                                    setDeveloperFilter('All');
                                    handleFitBounds(projects.filter(p => p.community?.toLowerCase() === name.toLowerCase()));
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <select value={selectedCity} onChange={handleCityChange} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-50/20 transition-all cursor-pointer min-w-[150px]">
                            <option value="">All Emirates</option>
                            {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                        </select>
                        <select value={selectedCommunity} onChange={handleCommunityChange} className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-50/20 transition-all cursor-pointer min-w-[170px] disabled:opacity-50" disabled={!selectedCity}>
                            <option value="">Select Community</option>
                            {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                        </select>
                    </div>
                </div>

                {/* Right: Tools */}
                <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setIsFilterModalOpen(true)} aria-label="Open property filters" className={`p-2.5 rounded-xl border transition-all group flex items-center gap-2 px-4 ${isAnyFilterActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600'}`} title="Filters">
                        <FilterIcon className={`w-5 h-5 ${isAnyFilterActive ? 'text-blue-600' : 'group-hover:text-blue-600'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block">Filters</span>
                    </button>
                    <button onClick={onToggleNearby} aria-label="Toggle nearby amenities" className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 px-4">
                        <Navigation className="w-5 h-5 fill-current" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Nearby</span>
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block" />
                    <button onClick={onAdminClick} aria-label="Open admin dashboard" className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-200 transition-all" title="Admin CMS">
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* ─────────────────── MOBILE TAB BAR ─────────────────── */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/97 backdrop-blur-xl border-t border-slate-200 z-[6000] pb-safe">
                <div className="flex justify-between items-center px-1 py-2">
                    {/* Home / Reset */}
                    <button onClick={onGlobalReset} aria-label="Reset map to full UAE view" className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-400 hover:text-blue-600 active:text-blue-700 transition-colors">
                        <svg viewBox="0 0 100 120" className="w-6 h-6" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M50 115C50 115 92 72 92 46C92 22.804 73.196 4 50 4C26.804 4 8 22.804 8 46C8 72 50 115 50 115Z" />
                        </svg>
                        <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
                    </button>

                    {/* Search */}
                    <button onClick={() => setIsMobileSearchOpen(true)} aria-label="Open property search" className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-400 hover:text-blue-600 active:text-blue-700 transition-colors">
                        <Search className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Search</span>
                    </button>

                    {/* Filters */}
                    <button onClick={() => setIsFilterModalOpen(true)} aria-label="Open property filters" className={`flex flex-col items-center gap-1 flex-1 py-1 transition-colors ${isAnyFilterActive ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'}`}>
                        <FilterIcon className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Filters</span>
                    </button>

                    {/* Nearby */}
                    <button onClick={onToggleNearby} aria-label="Show nearby amenities" className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-400 hover:text-blue-600 active:text-blue-700 transition-colors">
                        <Navigation className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Nearby</span>
                    </button>

                    {/* Admin */}
                    <button onClick={onAdminClick} aria-label="Open admin dashboard" className="flex flex-col items-center gap-1 flex-1 py-1 text-slate-400 hover:text-blue-600 active:text-blue-700 transition-colors">
                        <Settings className="w-6 h-6" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
                    </button>
                </div>
            </div>

            {/* ─────────────────── MOBILE SEARCH MODAL ─────────────────── */}
            {isMobileSearchOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex items-end md:hidden">
                    <div className="bg-white w-full rounded-t-3xl p-6 space-y-5 animate-in slide-in-from-bottom-full duration-300 shadow-2xl pb-10">
                        <div className="flex justify-between items-center">
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Find Property</h3>
                            <button onClick={() => setIsMobileSearchOpen(false)} aria-label="Close search" className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search — alwaysOpen autofocuses immediately */}
                        <div className="w-full">
                            <SearchBar
                                alwaysOpen={true}
                                projects={projects}
                                landmarks={landmarks}
                                onSelectProject={(p) => { onSelectProject(p); setIsMobileSearchOpen(false); }}
                                onSelectLandmark={(l) => { onSelectLandmark?.(l); setIsMobileSearchOpen(false); }}
                                onSelectDeveloper={(dev) => {
                                    setDeveloperFilter(dev);
                                    handleFitBounds(projects.filter(p => p.developerName === dev));
                                    setIsMobileSearchOpen(false);
                                }}
                                onSelectLocation={(name, type) => {
                                    if (type === 'city') {
                                        setSelectedCity(name.toLowerCase());
                                        setSelectedCommunity('');
                                        setDeveloperFilter('All');
                                        handleFitBounds(projects.filter(p => p.city?.toLowerCase() === name.toLowerCase()));
                                    } else if (type === 'community') {
                                        setSelectedCommunity(name);
                                        setDeveloperFilter('All');
                                        handleFitBounds(projects.filter(p => p.community?.toLowerCase() === name.toLowerCase()));
                                    }
                                    setIsMobileSearchOpen(false);
                                }}
                            />
                        </div>

                        <div className="space-y-3">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Emirate</label>
                                <select value={selectedCity} onChange={handleCityChange} className={selectCls}>
                                    <option value="">All Emirates</option>
                                    {cityOptions.map(city => <option key={city.id} value={city.id}>{city.label}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Community</label>
                                <select value={selectedCommunity} onChange={handleCommunityChange} className={`${selectCls} disabled:opacity-50`} disabled={!selectedCity}>
                                    <option value="">Select Community</option>
                                    {availableCommunities.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={() => setIsMobileSearchOpen(false)} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-blue-700 transition-all">
                            Discover Results
                        </button>
                    </div>
                </div>
            )}

            {/* ─────────────────── FILTER MODAL ─────────────────── */}
            {isFilterModalOpen && (
                <div className="fixed inset-0 z-[7000] bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0" onClick={() => setIsFilterModalOpen(false)} />
                    {/* Full-width on mobile, max-sm on desktop */}
                    <div className="relative h-full w-full max-w-full md:max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                        <div className="p-8 pb-4 overflow-y-auto flex-1">
                            {/* Header — no X (close via View Map button) */}
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Project Filters</h3>
                                <p className="text-slate-500 text-xs font-medium mt-1">Refine your search results</p>
                            </div>

                            {/* 3D Buildings Toggle */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100 mb-8">
                                <div>
                                    <p className="font-black text-sm text-slate-800">3D Buildings</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Show architectural extrusions</p>
                                </div>
                                <button onClick={() => setMapFeatures(prev => ({ ...prev, show3D: !prev.show3D }))} className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${mapFeatures.show3D ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow transition-transform duration-300 ${mapFeatures.show3D ? 'translate-x-6' : 'translate-x-0'}`} />
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
                                            className={`flex-1 py-3 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all ${statusFilter === status ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Developer Filter */}
                            <div className="mb-10">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Preferred Developer</h4>
                                <select value={developerFilter} onChange={(e) => setDeveloperFilter(e.target.value)} className={selectCls}>
                                    <option value="All">All Developers</option>
                                    {developerOptions.filter(d => d.name !== 'All').map(dev => (
                                        <option key={dev.name} value={dev.name}>{dev.name} ({dev.count})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Location Filters */}
                            <div className="mb-10">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-5">Location</h4>
                                <div className="flex flex-col gap-3">
                                    <select
                                        value={selectedCity}
                                        onChange={handleCityChange}
                                        className={selectCls}
                                    >
                                        <option value="">All Emirates</option>
                                        {cityOptions.map(city => (
                                            <option key={city.id} value={city.id}>{city.label}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={selectedCommunity}
                                        onChange={handleCommunityChange}
                                        disabled={!selectedCity}
                                        className={`${selectCls} disabled:opacity-50`}
                                    >
                                        <option value="">All Communities</option>
                                        {availableCommunities.map(([name, count]) => (
                                            <option key={name} value={name}>{name} ({count})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Spatial Tools */}
                            <div className="mb-8 p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Spatial Tools</h4>
                                <button
                                    onClick={() => { onToggleDraw(); setIsFilterModalOpen(false); }}
                                    className={`w-full py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-3 transition-all ${isDrawing ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-700 border border-blue-200 hover:border-blue-400'}`}
                                >
                                    <Pencil className="w-4 h-4" />
                                    <span>{isDrawing ? 'Cancel Custom Area' : 'Draw Custom Area'}</span>
                                </button>
                            </div>
                        </div>

                        {/* Sticky "View Map" footer — primary close action on mobile */}
                        <div className="sticky bottom-0 px-8 pt-4 pb-8 bg-white border-t border-slate-100">
                            <button
                                onClick={() => setIsFilterModalOpen(false)}
                                className="w-full py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl transition-all flex items-center justify-center gap-3"
                            >
                                <Map className="w-5 h-5" />
                                View Map ({filteredCount} Results)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BottomControlBar;
